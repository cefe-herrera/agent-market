import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { A2aHealthDto, ExternalAgent } from '@bnb-marketplace/shared-types';
import { NetworkConfig } from '../../../common/network/network.config';
import { IndexerBnbClient } from './indexer-bnb.client';
import {
  mapIndexerRowToMarketplaceAgent,
  shouldHydrateDetail,
  withDecodedMetadata,
} from './indexer-bnb.mapper';
import type {
  IndexerAgentRow,
  IndexerListFilters,
  IndexerListResult,
  SpringPage,
} from './indexer-bnb.types';
import { IndexerHttpError } from './indexer-bnb.types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERC8004_RE = /^(\d+):(0x[a-fA-F0-9]{40}):(\d+)$/i;

type UsableCache = {
  key: string;
  at: number;
  agents: ReturnType<typeof mapIndexerRowToMarketplaceAgent>[];
  registered: number;
};

@Injectable()
export class IndexerBnbService {
  private readonly logger = new Logger(IndexerBnbService.name);
  private usableCache: UsableCache | null = null;

  constructor(
    private readonly client: IndexerBnbClient,
    private readonly config: ConfigService,
    private readonly network: NetworkConfig,
  ) {}

  async listAgents(filters: IndexerListFilters): Promise<IndexerListResult> {
    const chainId = filters.chainId ?? this.network.chainId;
    const isTestnet = filters.isTestnet ?? this.network.isTestnet;
    const limit = Math.min(filters.limit ?? 100, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const usable = filters.usable !== false;

    if (usable) {
      return this.listUsableAgents({ ...filters, chainId, isTestnet, limit, page });
    }

    const qs = new URLSearchParams({
      page: String(page - 1),
      size: String(limit),
      sort: 'createdAt,desc',
    });
    if (filters.search) qs.set('q', filters.search);
    const path = filters.search ? `/api/v1/search?${qs}` : `/api/v1/agents?${qs}`;
    const pageBody = await this.fetchPage(path);
    const rows = pageBody.content ?? [];
    const data = rows
      .map((row) => mapIndexerRowToMarketplaceAgent(withDecodedMetadata(row)))
      .filter((agent) => agent.chainId === chainId)
      .filter((agent) => (isTestnet ? agent.isTestnet : !agent.isTestnet));
    const indexedTotal = springTotal(pageBody);

    return {
      data,
      total:
        data.length === rows.length && typeof indexedTotal === 'number'
          ? indexedTotal
          : data.length,
      page,
      limit,
    };
  }

  async resolveAgent(id: string) {
    const decoded = decodeURIComponent(id);
    if (UUID_RE.test(decoded)) {
      return this.fetchDetail(decoded);
    }

    const erc = decoded.match(ERC8004_RE);
    const query = erc ? erc[3] : decoded;
    const pageBody = await this.fetchPage(
      `/api/v1/search?q=${encodeURIComponent(query)}&page=0&size=20`,
    );
    const rows = pageBody.content ?? [];
    const match = rows.find((row) => {
      if (erc) {
        return Number(row.chainId) === Number(erc[1]) && String(row.onchainId) === erc[3];
      }
      return String(row.id) === decoded || String(row.onchainId) === decoded;
    });
    if (!match) return null;
    return this.fetchDetail(match.id);
  }

  async probeA2aHealth(id: string): Promise<A2aHealthDto> {
    const agent = await this.resolveAgent(id);
    const endpoint = agent?.endpoints?.a2a ?? agent?.a2a?.endpoint ?? null;
    if (!endpoint) {
      return {
        endpoint: null,
        healthy: false,
        status: 'missing',
        latencyMs: null,
        checkedAt: new Date().toISOString(),
        error: 'No A2A URL in indexer metadata',
        skills: agent?.verification?.skills ?? [],
        x402Support: agent?.a2a?.x402Support ?? null,
        priceLabel: agent?.verification?.priceLabel ?? null,
      };
    }

    const started = Date.now();
    try {
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(
          Number(this.config.get('A2A_HEALTH_TIMEOUT_MS', '4000')),
        ),
      });
      const ok = res.ok || res.status === 401 || res.status === 402 || res.status === 403;
      return {
        endpoint,
        healthy: ok,
        status: ok ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
        error: ok ? null : `HTTP ${res.status}`,
        skills: agent?.verification?.skills ?? [],
        x402Support: agent?.a2a?.x402Support ?? null,
        priceLabel: agent?.verification?.priceLabel ?? null,
      };
    } catch (error) {
      return {
        endpoint,
        healthy: false,
        status: 'unhealthy',
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        skills: agent?.verification?.skills ?? [],
        x402Support: agent?.a2a?.x402Support ?? null,
        priceLabel: agent?.verification?.priceLabel ?? null,
      };
    }
  }

  async getReputation(id: string): Promise<{
    agentId: string;
    score: number;
    factors?: unknown;
  } | null> {
    const agent = await this.resolveAgent(id);
    if (!agent) return null;
    const { status, json } = await this.client.get(`/api/v1/agents/${agent.id}/reputation`);
    if (status === 404) return { agentId: agent.agentId, score: 0 };
    if (status >= 400) throw new IndexerHttpError(status, json);
    const rec = asRecord(json);
    return {
      agentId: agent.agentId,
      score: typeof rec?.score === 'number' ? rec.score : 0,
      factors: rec?.factors,
    };
  }

  async countRegistered(): Promise<number> {
    const pageBody = await this.fetchPage('/api/v1/agents?page=0&size=1&sort=createdAt,desc');
    return springTotal(pageBody) ?? pageBody.content?.length ?? 0;
  }

  async listStudioAgents(limit = 100) {
    const result = await this.listUsableAgents({
      limit,
      page: 1,
      chainId: this.network.chainId,
      isTestnet: this.network.isTestnet,
      usable: true,
      open: false,
    });
    return result.data.filter((agent) => agent.verification?.studioSdk);
  }

  async listExternalAgents(limit = 500): Promise<ExternalAgent[]> {
    const result = await this.listAgents({
      usable: false,
      limit: Math.min(limit, 100),
      page: 1,
      chainId: this.network.chainId,
      isTestnet: this.network.isTestnet,
    });
    return result.data.map((agent) => ({
      agentId: agent.agentId,
      name: agent.name,
      ownerWallet: agent.ownerWallet,
      agentWallet: agent.agentWallet,
      agentUri: agent.agentUri ?? '',
      network: agent.network,
      chainId: agent.chainId,
      isTestnet: agent.isTestnet,
      description: agent.description,
      shortDescription: agent.shortDescription,
      category: agent.category,
      protocols: agent.protocols,
      supportedAssets: agent.supportedAssets,
      strategyName: agent.strategyName,
      strategyDescription: agent.strategyDescription,
      riskLevel: agent.riskLevel,
      minimumCapital: agent.minimumCapital,
      recommendedCapital: agent.recommendedCapital,
      executionFrequency: agent.executionFrequency,
      publishedAt: agent.publishedAt ?? undefined,
      imageUrl: agent.imageUrl,
      verified: agent.verified,
    }));
  }

  private async listUsableAgents(filters: IndexerListFilters): Promise<IndexerListResult> {
    const chainId = filters.chainId ?? this.network.chainId;
    const isTestnet = filters.isTestnet ?? this.network.isTestnet;
    const limit = Math.min(filters.limit ?? 100, 100);
    const page = Math.max(filters.page ?? 1, 1);
    const ttlMs = Number(this.config.get('INDEXER_USABLE_TTL_MS', '120000'));
    const cacheKey = `v2:${chainId}:${isTestnet}:${filters.open ? 'open' : 'studio'}:${filters.search ?? ''}`;
    const now = Date.now();

    let classified: ReturnType<typeof mapIndexerRowToMarketplaceAgent>[];
    let registered: number;

    if (this.usableCache && this.usableCache.key === cacheKey && now - this.usableCache.at < ttlMs) {
      classified = this.usableCache.agents;
      registered = this.usableCache.registered;
    } else {
      const rows = filters.search
        ? await this.fetchIndexerPage(filters.search, 0, 100)
        : await this.fetchAllCandidateRows(Boolean(filters.open));
      const hydrated = await this.hydrateCandidateRows(rows);
      classified = hydrated
        .map(mapIndexerRowToMarketplaceAgent)
        .filter((agent) => agent.chainId === chainId)
        .filter((agent) => (isTestnet ? agent.isTestnet : !agent.isTestnet));
      registered = classified.length;
      this.usableCache = { key: cacheKey, at: now, agents: classified, registered };
      this.logger.log(`Indexer usable catalog rebuilt: ${registered} registered on chain ${chainId}`);
    }

    const consumable = classified.filter((agent) => agent.verification?.schemaValid);
    const offset = (page - 1) * limit;
    return {
      data: consumable.slice(offset, offset + limit),
      total: consumable.length,
      page,
      limit,
      registered,
      consumable: consumable.length,
      filteredOut: Math.max(registered - consumable.length, 0),
    };
  }

  private async fetchPage(path: string): Promise<SpringPage<IndexerAgentRow>> {
    const { status, json } = await this.client.get(path);
    if (status >= 400) throw new IndexerHttpError(status, json);
    return (json ?? {}) as SpringPage<IndexerAgentRow>;
  }

  private async fetchIndexerPage(
    search: string | undefined,
    page: number,
    size: number,
  ): Promise<IndexerAgentRow[]> {
    const qs = new URLSearchParams({
      page: String(page),
      size: String(size),
      sort: 'createdAt,desc',
    });
    if (search) qs.set('q', search);
    const path = search ? `/api/v1/search?${qs}` : `/api/v1/agents?${qs}`;
    const pageBody = await this.fetchPage(path);
    return pageBody.content ?? [];
  }

  private async fetchAllCandidateRows(open: boolean): Promise<IndexerAgentRow[]> {
    const pages = [this.fetchIndexerPage(undefined, 0, 2000)];
    if (open) {
      for (const q of ['bnbagent', 'agent-card', 'a2a', 'mcp', 'x402']) {
        pages.push(this.fetchIndexerPage(q, 0, 40));
      }
    }
    const batches = await Promise.all(pages);
    const byId = new Map<string, IndexerAgentRow>();
    for (const batch of batches) {
      for (const row of batch) byId.set(row.id, row);
    }
    return [...byId.values()];
  }

  private async hydrateCandidateRows(rows: IndexerAgentRow[]): Promise<IndexerAgentRow[]> {
    const out: IndexerAgentRow[] = [];
    const pending: IndexerAgentRow[] = [];
    for (const row of rows) {
      const decoded = withDecodedMetadata(row);
      if (shouldHydrateDetail(decoded)) pending.push(decoded);
      else out.push(decoded);
    }
    const chunk = 8;
    for (let i = 0; i < pending.length; i += chunk) {
      const slice = pending.slice(i, i + chunk);
      const details = await Promise.all(
        slice.map(async (row) => {
          try {
            return (await this.fetchRow(row.id)) ?? row;
          } catch {
            return row;
          }
        }),
      );
      out.push(...details.map(withDecodedMetadata));
    }
    return out;
  }

  private async fetchDetail(uuid: string) {
    const row = await this.fetchRow(uuid);
    return row ? mapIndexerRowToMarketplaceAgent(row) : null;
  }

  private async fetchRow(uuid: string): Promise<IndexerAgentRow | null> {
    const { status, json } = await this.client.get(`/api/v1/agents/${uuid}`);
    if (status === 404) return null;
    if (status >= 400) throw new IndexerHttpError(status, json);
    return withDecodedMetadata(json as IndexerAgentRow);
  }
}

function springTotal(body: SpringPage<unknown>): number | undefined {
  if (typeof body.page?.totalElements === 'number') return body.page.totalElements;
  if (typeof body.totalElements === 'number') return body.totalElements;
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
