import { Injectable } from '@nestjs/common';
import { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { Erc8004ScanClient } from './erc8004-scan.client';
import {
  buildChainMap,
  fallbackChain,
  mapScanDetailToMarketplaceAgent,
} from './erc8004-agent.mapper';
import { slugifyAgentName } from '../../agents/agent-studio.mapper';

@Injectable()
export class Erc8004AgentResolver {
  constructor(private readonly scan: Erc8004ScanClient) {}

  async resolveByIdOrSlug(idOrSlug: string): Promise<MarketplaceAgentDto | null> {
    const parsed = this.parseAgentId(idOrSlug);
    if (parsed) {
      return this.fetchAgentDetail(parsed.chainId, parsed.tokenId);
    }

    const tokenId = this.extractTokenIdFromSlug(idOrSlug);
    if (!tokenId) return null;

    const chainId = await this.resolveChainIdForToken(tokenId, idOrSlug);
    if (!chainId) return null;

    return this.fetchAgentDetail(chainId, tokenId);
  }

  private async fetchAgentDetail(
    chainId: number,
    tokenId: string,
  ): Promise<MarketplaceAgentDto | null> {
    const [detail, chains] = await Promise.all([
      this.scan.getAgent(chainId, tokenId),
      this.scan.getChains(),
    ]);
    if (!detail) return null;

    const chainMap = buildChainMap(chains);
    const chain = chainMap.get(detail.chain_id) ?? fallbackChain(detail.chain_id);
    return mapScanDetailToMarketplaceAgent(detail, chain);
  }

  private async resolveChainIdForToken(
    tokenId: string,
    slug: string,
  ): Promise<number | null> {
    const result = await this.scan.listRegisteredAgents({
      limit: 100,
      offset: 0,
      isTestnet: false,
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
