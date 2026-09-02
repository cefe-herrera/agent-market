import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalAgent } from '@bnb-marketplace/shared-types';
import { AgentRegistryProvider } from '../interfaces/agent-registry.provider';
import { Erc8004ScanClient } from '../erc8004/erc8004-scan.client';
import { A2aHealthClient } from '../erc8004/a2a-health.client';
import { a2aMetrics } from '../erc8004/a2a-health';
import {
  isBnbAgentStudioAgent,
  isLikelyBnbAgentStudioListItem,
  mapScanAgentToExternal,
  scanA2aEndpoint,
} from '../erc8004/erc8004-agent.mapper';
import type { Erc8004ChainContext, Scan8004Chain, Scan8004ListItem } from '../erc8004/erc8004.types';
import { NetworkConfig } from '../../../common/network/network.config';

@Injectable()
export class Erc8004RegistryProvider implements AgentRegistryProvider {
  private readonly logger = new Logger(Erc8004RegistryProvider.name);
  private cachedAgents: ExternalAgent[] | null = null;
  private cacheExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly scan: Erc8004ScanClient,
    private readonly a2a: A2aHealthClient,
    private readonly network: NetworkConfig,
  ) {}

  async getAgents(): Promise<ExternalAgent[]> {
    if (this.cachedAgents && Date.now() < this.cacheExpiresAt) {
      return this.cachedAgents;
    }

    const pageSize = Number(this.config.get('ERC8004_SYNC_PAGE_SIZE', this.config.get('AGENT_STUDIO_SYNC_PAGE_SIZE', '50')));
    const maxPages = Number(this.config.get('ERC8004_SYNC_MAX_PAGES', this.config.get('AGENT_STUDIO_SYNC_MAX_PAGES', '10')));
    const maxAgents = Number(this.config.get('ERC8004_SYNC_MAX_AGENTS', this.config.get('AGENT_STUDIO_SYNC_MAX_AGENTS', '500')));
    const studioOnly = this.isStudioOnly();
    const builtWithFilter = this.config.get(
      'AGENT_STUDIO_BUILT_WITH_FILTER',
      'bnb-chain/bnbagent-sdk',
    );
    const searchQuery = this.resolveSearchQuery(studioOnly);
    const chains = await this.scan.getChains();
    const chainMap = this.buildChainMap(chains);
    const syncChains = this.resolveSyncChains(chains);
    const configuredChains = (
      this.config.get<string>('ERC8004_SYNC_CHAINS') ??
      this.config.get<string>('AGENT_STUDIO_SYNC_CHAINS') ??
      ''
    ).trim();

    const discovered = new Map<string, ExternalAgent>();

    if (configuredChains) {
      await this.discoverPerChain(
        syncChains,
        chainMap,
        discovered,
        pageSize,
        maxPages,
        maxAgents,
        studioOnly,
        builtWithFilter,
        searchQuery,
      );
    } else {
      await this.discoverGlobal(
        chainMap,
        discovered,
        pageSize,
        maxPages,
        maxAgents,
        studioOnly,
        builtWithFilter,
        searchQuery,
      );
    }

    const agents = Array.from(discovered.values());
    const chainCount = new Set(agents.map((agent) => agent.chainId)).size;

    this.logger.log(
      `Discovered ${agents.length} ERC-8004 agents across ${chainCount} chains via 8004scan`,
    );

    this.cachedAgents = agents;
    const cacheTtlMs = Number(this.config.get('ERC8004_CACHE_TTL_MS', this.config.get('AGENT_STUDIO_CACHE_TTL_MS', '300000')));
    this.cacheExpiresAt = Date.now() + cacheTtlMs;

    return agents;
  }

  clearCache(): void {
    this.cachedAgents = null;
    this.cacheExpiresAt = 0;
    this.scan.clearChainsCache();
  }

  async getAgent(agentId: string): Promise<ExternalAgent> {
    const cached = this.cachedAgents?.find((a) => a.agentId === agentId);
    if (cached) return cached;

    const parsed = this.parseAgentId(agentId);
    if (!parsed) {
      throw new Error(`Invalid ERC-8004 agent id: ${agentId}`);
    }

    const detail = await this.scan.getAgent(parsed.chainId, parsed.tokenId);
    if (!detail) {
      throw new Error(`External agent ${agentId} not found`);
    }

    const chainMap = this.buildChainMap(await this.scan.getChains());
    const chain = chainMap.get(parsed.chainId) ?? this.fallbackChain(parsed.chainId);
    return this.withLiveA2a(mapScanAgentToExternal(detail, chain), scanA2aEndpoint(detail));
  }

  async verifyOwnership(agentId: string, wallet: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);
    return agent.ownerWallet.toLowerCase() === wallet.toLowerCase();
  }

  private isStudioOnly(): boolean {
    return this.config.get('AGENT_STUDIO_ONLY', 'false') === 'true';
  }

  private resolveSearchQuery(studioOnly: boolean): string | undefined {
    const configured = this.config.get<string>('ERC8004_SEARCH_QUERY');
    const legacy = this.config.get<string>('AGENT_STUDIO_SEARCH_QUERY');
    const query = (configured ?? legacy ?? '').trim();
    if (query) return query;
    if (studioOnly) return 'bnbagent';
    return undefined;
  }

  private async discoverGlobal(
    chainMap: Map<number, Erc8004ChainContext>,
    discovered: Map<string, ExternalAgent>,
    pageSize: number,
    maxPages: number,
    maxAgents: number,
    studioOnly: boolean,
    builtWithFilter: string,
    searchQuery: string | undefined,
  ): Promise<void> {
    const label = searchQuery
      ? `Global 8004scan search "${searchQuery}"`
      : 'Global 8004scan sync (all agents)';
    this.logger.log(`${label} across all chains...`);

    for (let page = 1; page <= maxPages && discovered.size < maxAgents; page++) {
      let list;
      try {
        list = await this.scan.listAgentsGlobal(pageSize, page, searchQuery);
      } catch (error) {
        this.logger.warn(`Global sync page ${page} failed: ${(error as Error).message}`);
        break;
      }

      if (!list.items.length) break;

      this.logger.log(
        `8004scan global page ${page}: ${list.items.length} agents (${list.total} total)`,
      );

      await this.processCandidates(
        list.items,
        chainMap,
        discovered,
        maxAgents,
        studioOnly,
        builtWithFilter,
      );

      if (page * pageSize >= list.total) break;
    }
  }

  private async discoverPerChain(
    syncChains: Scan8004Chain[],
    chainMap: Map<number, Erc8004ChainContext>,
    discovered: Map<string, ExternalAgent>,
    pageSize: number,
    maxPages: number,
    maxAgents: number,
    studioOnly: boolean,
    builtWithFilter: string,
    searchQuery: string | undefined,
  ): Promise<void> {
    for (const chain of syncChains) {
      if (discovered.size >= maxAgents) break;

      this.logger.log(`Scanning ${chain.name} (chainId=${chain.chain_id})...`);

      for (let page = 1; page <= maxPages && discovered.size < maxAgents; page++) {
        let list;
        try {
          list = await this.scan.listAgents(chain.chain_id, pageSize, page, searchQuery);
        } catch (error) {
          this.logger.warn(
            `Skipping chain ${chain.chain_id} page ${page}: ${(error as Error).message}`,
          );
          break;
        }

        if (!list.items.length) break;

        this.logger.log(
          `8004scan ${chain.name} page ${page}: ${list.items.length} agents (${list.total} total)`,
        );

        await this.processCandidates(
          list.items,
          chainMap,
          discovered,
          maxAgents,
          studioOnly,
          builtWithFilter,
        );

        if (page * pageSize >= list.total) break;
      }
    }
  }

  private async processCandidates(
    items: Scan8004ListItem[],
    chainMap: Map<number, Erc8004ChainContext>,
    discovered: Map<string, ExternalAgent>,
    maxAgents: number,
    studioOnly: boolean,
    builtWithFilter: string,
  ): Promise<void> {
    for (const item of items) {
      if (discovered.size >= maxAgents) break;

      const listedChain = chainMap.get(item.chain_id);
      if (listedChain && listedChain.isTestnet !== this.network.isTestnet) continue;

      if (studioOnly && !isLikelyBnbAgentStudioListItem(item)) continue;

      const detail = await this.scan.getAgent(item.chain_id, item.token_id);
      if (!detail) continue;

      if (studioOnly && !isBnbAgentStudioAgent(detail, builtWithFilter)) continue;

      const chain = chainMap.get(item.chain_id) ?? this.fallbackChain(item.chain_id);
      const external = mapScanAgentToExternal(detail, chain);
      discovered.set(detail.agent_id, await this.withLiveA2a(external, scanA2aEndpoint(detail)));
    }
  }

  private async withLiveA2a(
    external: ExternalAgent,
    endpoint: string | null,
  ): Promise<ExternalAgent> {
    if (this.config.get('A2A_HEALTH_ON_SYNC', 'false') !== 'true') {
      return external;
    }

    const health = await this.a2a.probe(endpoint);
    const scan = external.scanMetrics;
    return {
      ...external,
      scanMetrics: scan
        ? {
            ...scan,
            categoryMetrics: {
              ...scan.categoryMetrics,
              ...a2aMetrics(health),
            },
          }
        : scan,
    };
  }

  private buildChainMap(chains: Scan8004Chain[]): Map<number, Erc8004ChainContext> {
    return new Map(
      chains.map((chain) => [
        chain.chain_id,
        {
          chainId: chain.chain_id,
          name: chain.name,
          chainKey: chain.chain_key,
          isTestnet: chain.is_testnet,
        },
      ]),
    );
  }

  private fallbackChain(chainId: number): Erc8004ChainContext {
    return {
      chainId,
      name: `Chain ${chainId}`,
      chainKey: `chain_${chainId}`,
      isTestnet: false,
    };
  }

  private resolveSyncChains(chains: Scan8004Chain[]): Scan8004Chain[] {
    const enabled = chains.filter(
      (chain) => chain.enabled && chain.is_testnet === this.network.isTestnet,
    );
    const configured = (
      this.config.get<string>('ERC8004_SYNC_CHAINS') ??
      this.config.get<string>('AGENT_STUDIO_SYNC_CHAINS') ??
      ''
    ).trim();

    if (!configured) return enabled;

    const allowed = new Set(
      configured.split(',').map((key) => key.trim().toLowerCase()).filter(Boolean),
    );

    const matched = enabled.filter((chain) => allowed.has(chain.chain_key.toLowerCase()));
    if (configured && matched.length === 0) {
      this.logger.warn(
        `ERC8004_SYNC_CHAINS has no ${this.network.mode} chains; scanning all ${this.network.mode} chains`,
      );
      return enabled;
    }

    return matched;
  }

  private parseAgentId(agentId: string): { chainId: number; tokenId: string } | null {
    const parts = agentId.split(':');
    if (parts.length === 3) {
      return { chainId: Number(parts[0]), tokenId: parts[2] };
    }

    if (/^\d+$/.test(agentId)) {
      return { chainId: 56, tokenId: agentId };
    }

    return null;
  }
}
