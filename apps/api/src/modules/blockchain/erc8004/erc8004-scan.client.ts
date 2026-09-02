import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Scan8004AgentDetail,
  Scan8004AuthListResponse,
  Scan8004Chain,
  Scan8004ChainsResponse,
  Scan8004ListItem,
  Scan8004PublicDetailResponse,
  Scan8004PublicListResponse,
} from './erc8004.types';
import {
  isLikelyActiveScanItem,
  mergeDetailIntoListItem,
  scanItemNeedsDetail,
} from './erc8004-list-quality';

const SCAN_API_BASE = 'https://8004scan.io/api/v1';
const SCAN_API_PUBLIC = `${SCAN_API_BASE}/public`;

@Injectable()
export class Erc8004ScanClient {
  private readonly logger = new Logger(Erc8004ScanClient.name);
  private lastRequestAt = 0;
  private cachedChains: Scan8004Chain[] | null = null;
  private chainsCacheExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  async getChains(): Promise<Scan8004Chain[]> {
    if (this.cachedChains && Date.now() < this.chainsCacheExpiresAt) {
      return this.cachedChains;
    }

    const response = await this.throttledFetch(`${this.apiBase()}/chains`);
    if (!response.ok) {
      throw new Error(`8004scan chains failed: ${response.status} ${response.statusText}`);
    }

    const body = (await response.json()) as Scan8004ChainsResponse;
    const chains = body.data?.chains ?? body.chains ?? [];
    this.cachedChains = chains;
    this.chainsCacheExpiresAt = Date.now() + 3_600_000;
    return chains;
  }

  clearChainsCache(): void {
    this.cachedChains = null;
    this.chainsCacheExpiresAt = 0;
  }

  async listAgents(
    chainId: number,
    limit: number,
    page = 1,
    search?: string,
  ): Promise<{ items: Scan8004ListItem[]; total: number }> {
    return this.fetchAgentList({ chainId, limit, page, search });
  }

  async listAgentsGlobal(
    limit: number,
    page = 1,
    search?: string,
  ): Promise<{ items: Scan8004ListItem[]; total: number }> {
    return this.fetchAgentList({ limit, page, search });
  }

  async listRegisteredAgents(options: {
    limit: number;
    offset?: number;
    isTestnet?: boolean;
    search?: string;
    chainId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    x402Supported?: boolean;
    hasMcp?: boolean;
    hasA2a?: boolean;
    isActive?: boolean;
    minFeedbacks?: number;
    minScore?: number;
  }): Promise<{ items: Scan8004ListItem[]; total: number }> {
    const effectiveLimit = Math.min(options.limit, 100);
    const params = new URLSearchParams({
      sort_by: options.sortBy ?? 'created_at',
      sort_order: options.sortOrder ?? 'desc',
      limit: String(effectiveLimit),
      offset: String(options.offset ?? 0),
      is_testnet: String(options.isTestnet ?? false),
      is_registered: 'true',
    });

    if (options.chainId !== undefined) {
      params.set('chain_id', String(options.chainId));
    }

    if (options.search?.trim()) {
      params.set('search', options.search.trim());
    }

    if (options.x402Supported !== undefined) {
      params.set('x402_supported', String(options.x402Supported));
    }
    if (options.hasMcp !== undefined) {
      params.set('has_mcp', String(options.hasMcp));
    }
    if (options.hasA2a !== undefined) {
      params.set('has_a2a', String(options.hasA2a));
    }
    if (options.isActive !== undefined) {
      params.set('is_active', String(options.isActive));
    }
    if (options.minFeedbacks !== undefined) {
      params.set('min_feedbacks', String(options.minFeedbacks));
    }
    if (options.minScore !== undefined) {
      params.set('min_score', String(options.minScore));
    }

    const response = await this.throttledFetch(`${SCAN_API_BASE}/agents?${params}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `8004scan list failed: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`,
      );
    }

    const body = (await response.json()) as Scan8004PublicListResponse | Scan8004AuthListResponse;
    const parsed = this.parseListResponse(body);
    if (options.chainId === undefined) return parsed;
    const items = parsed.items.filter((item) => item.chain_id === options.chainId);
    return { items, total: items.length };
  }

  async listUsableAgents(options: {
    limit: number;
    offset?: number;
    isTestnet?: boolean;
    search?: string;
    chainId?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: Scan8004ListItem[]; total: number }> {
    const withActivity = await this.listRegisteredAgents({
      ...options,
      minFeedbacks: 1,
      isActive: true,
    });
    let items = withActivity.items.filter(isLikelyActiveScanItem);
    if (items.length > 0 || options.search?.trim()) {
      return { items, total: withActivity.total };
    }

    const paid = await this.listRegisteredAgents({
      ...options,
      x402Supported: true,
      isActive: true,
    });
    items = paid.items.filter(isLikelyActiveScanItem);
    return { items, total: paid.total };
  }

  private async fetchAgentList(options: {
    chainId?: number;
    limit: number;
    page: number;
    search?: string;
  }): Promise<{ items: Scan8004ListItem[]; total: number }> {
    const effectiveLimit = Math.min(options.limit, 100);
    const params = new URLSearchParams({
      limit: String(effectiveLimit),
    });

    if (options.chainId !== undefined) {
      params.set('chain_id', String(options.chainId));
    }

    if (this.getApiKey()) {
      params.set('offset', String((options.page - 1) * effectiveLimit));
    } else {
      params.set('page', String(options.page));
    }

    if (options.search?.trim()) {
      params.set('search', options.search.trim());
    }

    const response = await this.throttledFetch(`${this.apiBase()}/agents?${params}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `8004scan list failed: ${response.status} ${response.statusText} — ${text.slice(0, 200)}`,
      );
    }

    const body = (await response.json()) as Scan8004PublicListResponse | Scan8004AuthListResponse;
    return this.parseListResponse(body);
  }

  async getAgent(
    chainId: number,
    tokenId: string,
    options?: { skipThrottle?: boolean },
  ): Promise<Scan8004AgentDetail | null> {
    try {
      const response = await this.throttledFetch(
        `${SCAN_API_BASE}/agents/${chainId}/${tokenId}`,
        options,
      );

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(
          `8004scan detail failed: ${response.status} ${response.statusText}`,
        );
      }

      const body = (await response.json()) as
        | Scan8004PublicDetailResponse
        | Scan8004AgentDetail;
      return this.parseDetailResponse(body);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch agent ${chainId}/${tokenId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async enrichCatalogItems(items: Scan8004ListItem[]): Promise<Scan8004ListItem[]> {
    const pending = items.filter(scanItemNeedsDetail);
    if (pending.length === 0) return items;

    this.logger.debug(`Enriching ${pending.length} catalog agents with 8004scan detail`);
    const details = await mapPool(pending, 5, (item) =>
      this.getAgent(item.chain_id, item.token_id, { skipThrottle: true }),
    );

    const byAgentId = new Map<string, Scan8004AgentDetail>();
    pending.forEach((item, index) => {
      const detail = details[index];
      if (detail) byAgentId.set(item.agent_id, detail);
    });

    return items.map((item) => mergeDetailIntoListItem(item, byAgentId.get(item.agent_id) ?? null));
  }

  private parseListResponse(
    body: Scan8004PublicListResponse | Scan8004AuthListResponse,
  ): { items: Scan8004ListItem[]; total: number } {
    if ('items' in body && Array.isArray(body.items)) {
      return {
        items: body.items,
        total: body.total ?? body.items.length,
      };
    }

    const publicBody = body as Scan8004PublicListResponse;
    if (publicBody.success && publicBody.data) {
      return {
        items: publicBody.data,
        total: publicBody.meta?.pagination?.total ?? publicBody.data.length,
      };
    }

    const message =
      publicBody.error?.message ??
      ('success' in publicBody ? 'success=false' : 'unknown response shape');
    throw new Error(`8004scan list returned success=false: ${message}`);
  }

  private parseDetailResponse(
    body: Scan8004PublicDetailResponse | Scan8004AgentDetail,
  ): Scan8004AgentDetail | null {
    if ('success' in body) {
      const wrapped = body as Scan8004PublicDetailResponse;
      return wrapped.success ? wrapped.data : null;
    }

    if ('agent_id' in body && 'token_id' in body) {
      return body as Scan8004AgentDetail;
    }

    return null;
  }

  private apiBase(): string {
    return this.getApiKey() ? SCAN_API_BASE : SCAN_API_PUBLIC;
  }

  private getApiKey(): string | undefined {
    return (
      this.config.get<string>('LATEST_8004SCAN_API_KEY') ??
      this.config.get<string>('ERC8004_SCAN_API_KEY')
    );
  }

  
  private async throttledFetch(
    url: string,
    options?: { skipThrottle?: boolean },
  ): Promise<Response> {
    const hasApiKey = Boolean(this.getApiKey());
    const defaultIntervalMs = hasApiKey ? 2100 : 6500;
    const minIntervalMs = Number(
      this.config.get('LATEST_8004SCAN_MIN_INTERVAL_MS', String(defaultIntervalMs)),
    );
    const elapsed = Date.now() - this.lastRequestAt;
    if (!options?.skipThrottle && elapsed < minIntervalMs) {
      await sleep(minIntervalMs - elapsed);
    }

    const headers: Record<string, string> = { Accept: 'application/json' };
    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    this.lastRequestAt = Date.now();
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok && response.status === 429) {
      this.logger.warn('8004scan rate limit hit, backing off 60s');
      await sleep(60_000);
      return this.throttledFetch(url, options);
    }

    return response;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const workers = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
