import { Injectable } from '@nestjs/common';
import { MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { A2aHealthClient } from './a2a-health.client';
import { withA2aHealth } from './erc8004-agent.mapper';
import { IndexerBnbService } from '../indexer-bnb/indexer-bnb.service';

@Injectable()
export class Erc8004AgentResolver {
  constructor(
    private readonly indexer: IndexerBnbService,
    private readonly a2a: A2aHealthClient,
  ) {}

  async resolveByIdOrSlug(
    idOrSlug: string,
    options?: { liveProbe?: boolean },
  ): Promise<MarketplaceAgentDto | null> {
    const agent = await this.indexer.resolveAgent(idOrSlug);
    if (!agent) return null;
    if (options?.liveProbe !== true) return agent;

    const endpoint = agent.endpoints?.a2a ?? agent.a2a?.endpoint ?? null;
    const live = await this.a2a.probe(endpoint);
    return withA2aHealth(agent, live);
  }
}
