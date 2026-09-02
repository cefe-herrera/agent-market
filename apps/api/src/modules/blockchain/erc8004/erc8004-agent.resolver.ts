import { Injectable } from '@nestjs/common';
import { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { Erc8004ScanClient } from './erc8004-scan.client';
import { A2aHealthClient } from './a2a-health.client';
import {
  buildChainMap,
  fallbackChain,
  mapScanDetailToMarketplaceAgent,
  scanA2aEndpoint,
  withA2aHealth,
} from './erc8004-agent.mapper';
import { slugifyAgentName } from '../../agents/agent-studio.mapper';
import { NetworkConfig } from '../../../common/network/network.config';

@Injectable()
export class Erc8004AgentResolver {
  constructor(
    private readonly scan: Erc8004ScanClient,
    private readonly a2a: A2aHealthClient,
    private readonly network: NetworkConfig,
  ) {}

  async resolveByIdOrSlug(
    idOrSlug: string,
    options?: { liveProbe?: boolean },
  ): Promise<MarketplaceAgentDto | null> {
    const liveProbe = options?.liveProbe === true;
    const parsed = this.parseAgentId(idOrSlug);
    if (parsed) {
      return this.fetchAgentDetail(parsed.chainId, parsed.tokenId, liveProbe);
    }

    const tokenId = this.extractTokenIdFromSlug(idOrSlug);
    if (!tokenId) return null;

    const chainId = await this.resolveChainIdForToken(tokenId, idOrSlug);
    if (!chainId) return null;

    return this.fetchAgentDetail(chainId, tokenId, liveProbe);
  }

  private async fetchAgentDetail(
    chainId: number,
    tokenId: string,
    liveProbe: boolean,
  ): Promise<MarketplaceAgentDto | null> {
    const [detail, chains] = await Promise.all([
      this.scan.getAgent(chainId, tokenId),
      this.scan.getChains(),
    ]);
    if (!detail) return null;

    const chainMap = buildChainMap(chains);
    const chain = chainMap.get(detail.chain_id) ?? fallbackChain(detail.chain_id);
    const dto = mapScanDetailToMarketplaceAgent(detail, chain);
    if (!liveProbe) return dto;

    const live = await this.a2a.probe(scanA2aEndpoint(detail));
    return withA2aHealth(dto, live);
  }

  private async resolveChainIdForToken(
    tokenId: string,
    slug: string,
  ): Promise<number | null> {
    const result = await this.scan.listRegisteredAgents({
      limit: 100,
      offset: 0,
      isTestnet: this.network.isTestnet,
      search: tokenId,
    });

    const exactMatch = result.items.find(
      (item) => slugifyAgentName(item.name, item.agent_id) === slug,
    );
    if (exactMatch) return exactMatch.chain_id;

    const tokenMatches = result.items.filter((item) => item.token_id === tokenId);
    if (tokenMatches.length === 1) return tokenMatches[0].chain_id;

    return null;
  }

  private extractTokenIdFromSlug(slug: string): string | null {
    const match = slug.match(/-(\d+)$/);
    return match?.[1] ?? null;
  }

  private parseAgentId(value: string): { chainId: number; tokenId: string } | null {
    const parts = value.split(':');
    if (parts.length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[2])) {
      return { chainId: Number(parts[0]), tokenId: parts[2] };
    }
    return null;
  }
}
