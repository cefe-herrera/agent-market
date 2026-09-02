import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AgentVerificationDto,
  MarketplaceAgentDto,
  VerificationLevel,
} from '@bnb-marketplace/shared-types';
import { Erc8004ScanClient } from './erc8004-scan.client';
import {
  buildChainMap,
  fallbackChain,
  isBnbAgentStudioAgent,
  isLikelyBnbAgentStudioListItem,
  mapScanDetailToMarketplaceAgent,
  scanA2aEndpoint,
  scanMcpEndpoint,
} from './erc8004-agent.mapper';
import { isFactoryNoise } from './erc8004-list-quality';
import {
  type AgentCardSnapshot,
  a2aJsonRpcPing,
  agentCardCandidateUrls,
  evaluateLiveProbe,
  isHttpUrl,
  validateAgentCard,
} from './agent-card-schema';
import type { Scan8004AgentDetail, Scan8004ListItem } from './erc8004.types';
import { NetworkConfig } from '../../../common/network/network.config';
import { parseAgentCard } from './a2a-health';

type CachedRow = {
  agent: MarketplaceAgentDto;
  card: AgentCardSnapshot | null;
  verification: AgentVerificationDto;
};

@Injectable()
export class AgentVerificationService {
  private readonly logger = new Logger(AgentVerificationService.name);
  private cache: CachedRow[] = [];
  private cacheExpiresAt = 0;
  private livePassRunning = false;
  private rebuildRunning: Promise<CachedRow[]> | null = null;
  private openExpanded = false;
  private openExpandRunning: Promise<void> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly scan: Erc8004ScanClient,
    private readonly network: NetworkConfig,
  ) {}

  async listCatalog(options: {
    isTestnet?: boolean;
    limit?: number;
    offset?: number;
    expandOpen?: boolean;
  }): Promise<{ data: MarketplaceAgentDto[]; total: number }> {
    await this.ensureCatalog();
    if (options.expandOpen) {
      await this.expandOpenCatalog();
    }
    const listed = this.cache.filter(
      (row) =>
        row.verification.schemaValid &&
        row.agent.chainId === this.network.chainId,
    );
    const offset = options.offset ?? 0;
    const limit = Math.min(options.limit ?? 100, 100);
    return {
      data: listed.slice(offset, offset + limit).map((row) => this.toDto(row)),
      total: listed.length,
    };
  }

  async runLivePass(): Promise<void> {
    if (this.livePassRunning) return;
    this.livePassRunning = true;
    try {
      const rows = this.cache.filter((row) => row.verification.schemaValid && row.card);
      this.logger.log(`Live verification pass: ${rows.length} schema-valid agents`);
      for (const row of rows) {
        await this.probeLive(row);
      }
    } finally {
      this.livePassRunning = false;
    }
  }

  private async ensureCatalog(): Promise<CachedRow[]> {
    if (this.cache.length && Date.now() < this.cacheExpiresAt) return this.cache;
    if (this.rebuildRunning) return this.rebuildRunning;
    this.rebuildRunning = this.rebuildCatalog().finally(() => {
      this.rebuildRunning = null;
    });
    return this.rebuildRunning;
  }

  private async rebuildCatalog(): Promise<CachedRow[]> {
    const isTestnet = this.network.isTestnet;
    const builtWith = this.config.get(
      'AGENT_STUDIO_BUILT_WITH_FILTER',
      'bnb-chain/bnbagent-sdk',
    );
    const timeoutMs = Number(this.config.get('A2A_HEALTH_TIMEOUT_MS', '4000'));
    const ttlMs = Number(this.config.get('VERIFY_CATALOG_TTL_MS', '300000'));

    const [studioSearch, chains] = await Promise.all([
      this.scan.listRegisteredAgents({
        limit: 100,
        offset: 0,
        isTestnet,
        chainId: this.network.chainId,
        search: 'bnbagent',
        isActive: true,
      }),
      this.scan.getChains(),
    ]);

    const chainMap = buildChainMap(chains);
    const candidates = studioSearch.items.filter(
      (item) =>
        !isFactoryNoise(item) &&
        (item.is_testnet ?? false) === isTestnet &&
        item.chain_id === this.network.chainId,
    );

    this.logger.log(
      `Registered candidates from 8004scan search "bnbagent": ${candidates.length}`,
    );

    const prior = new Map(
      this.cache.map((row) => [row.agent.agentId, row.verification]),
    );
    const rows = await this.ingestCandidates(candidates, chainMap, timeoutMs, {
      requireStudio: true,
      builtWith,
      prior,
    });

    const schemaValid = rows.filter((row) => row.verification.schemaValid).length;
    this.logger.log(
      `Pipeline: ${rows.length} registered, ${schemaValid} schema-valid (schema fail = out of catalog)`,
    );

    this.cache = rows;
    this.openExpanded = false;
    this.cacheExpiresAt = Date.now() + ttlMs;
    return rows;
  }

  private async expandOpenCatalog(): Promise<void> {
    if (this.openExpanded) return;
    if (this.openExpandRunning) return this.openExpandRunning;
    this.openExpandRunning = this.runOpenExpand().finally(() => {
      this.openExpandRunning = null;
    });
    return this.openExpandRunning;
  }

  private async runOpenExpand(): Promise<void> {
    const isTestnet = this.network.isTestnet;
    const builtWith = this.config.get(
      'AGENT_STUDIO_BUILT_WITH_FILTER',
      'bnb-chain/bnbagent-sdk',
    );
    const timeoutMs = Number(this.config.get('A2A_HEALTH_TIMEOUT_MS', '4000'));
    const cap = Math.min(
      Number(this.config.get('OPEN_CATALOG_LIMIT', '24')),
      40,
    );

    const chainId = this.network.chainId;
    const listOpts = { offset: 0, isTestnet, isActive: true as const, chainId };
    const [cardJson, card, wellKnown, a2aPaidChain, mcpPaidChain, chains] =
      await Promise.all([
        this.scan.listRegisteredAgents({
          ...listOpts,
          limit: 50,
          search: 'agent-card.json',
        }),
        this.scan.listRegisteredAgents({
          ...listOpts,
          limit: 50,
          search: 'agent-card',
        }),
        this.scan.listRegisteredAgents({
          ...listOpts,
          limit: 50,
          search: 'well-known',
        }),
        this.scan.listRegisteredAgents({
          ...listOpts,
          limit: 50,
          hasA2a: true,
        }),
        this.scan.listRegisteredAgents({
          ...listOpts,
          limit: 40,
          hasMcp: true,
        }),
        this.scan.getChains(),
      ]);

    const seen = new Set(this.cache.map((row) => row.agent.agentId));
    const seenNames = new Set(
      this.cache.map((row) => row.agent.name.trim().toLowerCase()),
    );
    const pooled: Scan8004ListItem[] = [];
    for (const item of [
      ...cardJson.items,
      ...card.items,
      ...wellKnown.items,
      ...a2aPaidChain.items,
      ...mcpPaidChain.items,
    ]) {
      const nameKey = (item.name ?? '').trim().toLowerCase();
      if (seen.has(item.agent_id) || seenNames.has(nameKey)) continue;
      if (!this.isOpenListCandidate(item, isTestnet, chainId)) continue;
      seen.add(item.agent_id);
      seenNames.add(nameKey);
      pooled.push(item);
    }
    pooled.sort(
      (left, right) =>
        this.openCandidateScore(right, chainId) -
        this.openCandidateScore(left, chainId),
    );
    const candidates = pooled.slice(0, cap);

    this.logger.log(
      `Open scan candidates (A2A/MCP, excluding studio cache): ${candidates.length} of ${pooled.length}`,
    );

    const chainMap = buildChainMap(chains);
    const prior = new Map(
      this.cache.map((row) => [row.agent.agentId, row.verification]),
    );
    const added = await this.ingestCandidates(candidates, chainMap, timeoutMs, {
      requireStudio: false,
      builtWith,
      prior,
    });
    const schemaValid = added.filter((row) => row.verification.schemaValid);

    this.cache = [...this.cache, ...schemaValid];
    this.openExpanded = true;

    this.logger.log(
      `Open scan ingested ${added.length} with endpoints, ${schemaValid.length} schema-valid`,
    );

    for (const row of schemaValid) {
      await this.probeLive(row);
    }
  }

  private async ingestCandidates(
    candidates: Scan8004ListItem[],
    chainMap: ReturnType<typeof buildChainMap>,
    timeoutMs: number,
    options: {
      requireStudio: boolean;
      builtWith: string;
      prior: Map<string, AgentVerificationDto>;
    },
  ): Promise<CachedRow[]> {
    const details = await mapPool(candidates, 5, (item) =>
      this.scan.getAgent(item.chain_id, item.token_id, { skipThrottle: true }),
    );

    const pairs = candidates.map((item, index) => ({
      item,
      detail: details[index],
    }));
    const rows = await mapPool(pairs, 4, async ({ item, detail }) => {
      if (!detail) return null;
      if (detail.chain_id !== this.network.chainId) return null;
      const studio = this.isRegistered(detail, item, options.builtWith);
      if (options.requireStudio && !studio) return null;

      const chain = chainMap.get(detail.chain_id) ?? fallbackChain(detail.chain_id);
      const agent = mapScanDetailToMarketplaceAgent(detail, chain);
      const endpoint = this.declaredEndpoint(detail);
      if (!options.requireStudio && !endpoint) return null;
      const checkedAt = new Date().toISOString();
      const schema = await this.fetchSchema(endpoint, timeoutMs, {
        requirePricing: options.requireStudio,
      });
      if (!schema.valid) {
        this.logger.debug(
          `Schema fail ${detail.name}: ${schema.errors.join(', ') || 'unknown'}`,
        );
      }

      const verification = this.buildVerification({
        registered: true,
        schema,
        prior: options.prior.get(detail.agent_id),
        checkedAt,
        studioSdk: studio,
      });

      return {
        agent: { ...agent, a2a: undefined, verification },
        card: schema.card,
        verification,
      };
    });

    const ingested: CachedRow[] = [];
    for (const row of rows) {
      if (row) ingested.push(row as CachedRow);
    }
    return ingested;
  }

  private isCallableEndpoint(url: string | null | undefined): url is string {
    if (!isHttpUrl(url) || !url) return false;
    const u = url.toLowerCase();
    if (u.includes('amazoncognito.com')) return false;
    if (u.includes('/oauth2/')) return false;
    if (u.includes('/login') || u.includes('/signin')) return false;
    if (u.includes('github.com/')) return false;
    return true;
  }

  private isOpenListCandidate(
    item: Scan8004ListItem,
    isTestnet: boolean,
    chainId: number,
  ): boolean {
    if (item.chain_id !== chainId) return false;
    if (isFactoryNoise(item)) return false;
    if ((item.is_testnet ?? false) !== isTestnet) return false;
    const protocols = (item.supported_protocols ?? []).map((p) => p.toLowerCase());
    if (protocols.includes('a2a') || protocols.includes('mcp')) return true;
    return Boolean(item.a2a_endpoint || item.mcp_server || item.agent_url);
  }

  private openCandidateScore(item: Scan8004ListItem, paymentChainId: number): number {
    let score = 0;
    const text = `${item.name ?? ''} ${item.description ?? ''}`;
    if (/agent-card|well-known/i.test(text)) score += 200;
    if (item.chain_id === paymentChainId) score += 40;
    const protocols = (item.supported_protocols ?? []).map((p) => p.toLowerCase());
    if (protocols.includes('a2a')) score += 20;
    if (protocols.includes('mcp')) score += 10;
    if (item.x402_supported) score += 15;
    if (item.a2a_endpoint || item.mcp_server || item.agent_url) score += 40;
    if ((item.description ?? '').trim().length > 80) score += 5;
    return score;
  }

  private declaredEndpoint(detail: Scan8004AgentDetail): string | null {
    const direct = [
      scanA2aEndpoint(detail),
      scanMcpEndpoint(detail),
      detail.agent_url,
      detail.raw_metadata?.offchain_uri,
    ];
    for (const url of direct) {
      if (this.isCallableEndpoint(url)) return url;
    }

    const blob = `${detail.description ?? ''} ${JSON.stringify(detail.raw_metadata?.offchain_content ?? {})}`;
    const matches = blob.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
    const cleaned = matches.map((raw) => raw.replace(/[),.;]+$/, ''));
    const preferred = cleaned.find(
      (url) =>
        this.isCallableEndpoint(url) &&
        /agent-card|well-known|\/a2a|\/mcp/i.test(url),
    );
    return preferred ?? null;
  }

  private isRegistered(
    detail: Scan8004AgentDetail,
    item: Scan8004ListItem,
    builtWith: string,
  ): boolean {
    if (isBnbAgentStudioAgent(detail, builtWith)) return true;
    return isLikelyBnbAgentStudioListItem(item) || isLikelyBnbAgentStudioListItem(detail);
  }

  private async fetchSchema(
    endpoint: string | null,
    timeoutMs: number,
    options?: { requirePricing?: boolean },
  ): Promise<{ valid: boolean; errors: string[]; card: AgentCardSnapshot | null }> {
    if (!this.isCallableEndpoint(endpoint)) {
      return {
        valid: false,
        errors: ['missing endpoint url'],
        card: null,
      };
    }

    let last: { valid: boolean; errors: string[]; card: AgentCardSnapshot | null } = {
      valid: false,
      errors: ['Agent Card fetch failed'],
      card: null,
    };

    for (const url of agentCardCandidateUrls(endpoint)) {
      if (!this.isCallableEndpoint(url)) continue;
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          last = {
            valid: false,
            errors: [`Agent Card HTTP ${response.status}`],
            card: null,
          };
          continue;
        }
        const json: unknown = await response.json();
        const result = validateAgentCard(json, url, {
          requirePricing: options?.requirePricing,
        });
        if (result.valid) {
          return { valid: true, errors: [], card: result.card };
        }
        last = { valid: false, errors: result.errors, card: result.card };
      } catch (error) {
        last = {
          valid: false,
          errors: [error instanceof Error ? error.message : 'Agent Card fetch failed'],
          card: null,
        };
      }
    }

    return last;
  }

  private async probeLive(row: CachedRow): Promise<void> {
    const endpoint = row.card?.endpoint;
    const timeoutMs = Number(this.config.get('A2A_HEALTH_TIMEOUT_MS', '4000'));
    const liveCheckedAt = new Date().toISOString();
    if (!this.isCallableEndpoint(endpoint) || !row.card) {
      row.verification = {
        ...row.verification,
        live: false,
        livePending: false,
        liveError: 'missing endpoint url',
        liveCheckedAt,
        level: 'schema_valid',
      };
      row.agent.verification = row.verification;
      return;
    }

    const rpc = await this.fetchJson(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(a2aJsonRpcPing()),
      timeoutMs,
    });
    let verdict = evaluateLiveProbe({
      status: rpc.status,
      json: rpc.json,
      declared: row.card,
    });

    if (!verdict.ok) {
      const get = await this.fetchJson(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        timeoutMs,
      });
      const fromGet = evaluateLiveProbe({
        status: get.status,
        json: get.json,
        declared: row.card,
      });
      if (fromGet.ok) verdict = fromGet;
    }

    this.setLive(row, verdict.ok, verdict.error, liveCheckedAt);
    this.logger.log(`Live ${row.agent.name}: ${verdict.ok ? 'ok' : verdict.error ?? 'down'}`);
    if (verdict.ok && rpc.json) {
      const parsed = parseAgentCard(rpc.json);
      if (parsed.priceLabel) row.verification.priceLabel = parsed.priceLabel;
      if (parsed.skills.length) row.verification.skills = parsed.skills;
    }
  }

  private async fetchJson(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
      timeoutMs: number;
    },
  ): Promise<{ status: number; json: unknown }> {
    try {
      const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body,
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      const text = await response.text();
      if (!text) return { status: response.status, json: null };
      try {
        return { status: response.status, json: JSON.parse(text) as unknown };
      } catch {
        return { status: response.status, json: null };
      }
    } catch {
      return { status: 0, json: null };
    }
  }

  private setLive(
    row: CachedRow,
    live: boolean,
    error: string | null,
    liveCheckedAt: string,
  ): void {
    row.verification = {
      ...row.verification,
      live,
      livePending: false,
      liveError: live ? null : error,
      liveCheckedAt,
      level: live ? 'live' : 'schema_valid',
    };
    row.agent.verification = row.verification;
  }

  private buildVerification(input: {
    registered: boolean;
    schema: { valid: boolean; errors: string[]; card: AgentCardSnapshot | null };
    prior?: AgentVerificationDto;
    checkedAt: string;
    studioSdk: boolean;
  }): AgentVerificationDto {
    const schemaValid = input.schema.valid;
    const live = schemaValid && (input.prior?.live ?? false);
    const livePending = schemaValid && !live && !input.prior?.liveCheckedAt;
    return {
      level: this.level({ registered: true, schemaValid, live }),
      registered: true,
      schemaValid,
      live,
      livePending,
      schemaErrors: input.schema.errors,
      liveError: live ? null : (input.prior?.liveError ?? null),
      checkedAt: input.checkedAt,
      liveCheckedAt: input.prior?.liveCheckedAt ?? null,
      priceLabel: input.schema.card?.priceLabel ?? null,
      skills: input.schema.card?.skills ?? [],
      studioSdk: input.studioSdk,
    };
  }

  private level(flags: {
    registered: boolean;
    schemaValid: boolean;
    live: boolean;
  }): VerificationLevel {
    if (flags.live) return 'live';
    if (flags.schemaValid) return 'schema_valid';
    return 'registered';
  }

  private toDto(row: CachedRow): MarketplaceAgentDto {
    return {
      ...row.agent,
      verification: row.verification,
      a2a: row.agent.a2a,
    };
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Math.min(Math.max(concurrency, 1), Math.max(items.length, 1));
  if (!items.length) return results;
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
