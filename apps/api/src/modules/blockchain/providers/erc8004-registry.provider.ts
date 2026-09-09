import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalAgent } from '@bnb-marketplace/shared-types';
import { AgentRegistryProvider } from '../interfaces/agent-registry.provider';
import { IndexerBnbService } from '../indexer-bnb/indexer-bnb.service';

@Injectable()
export class Erc8004RegistryProvider implements AgentRegistryProvider {
  private readonly logger = new Logger(Erc8004RegistryProvider.name);
  private cachedAgents: ExternalAgent[] | null = null;
  private cacheExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly indexer: IndexerBnbService,
  ) {}

  async getAgents(): Promise<ExternalAgent[]> {
    if (this.cachedAgents && Date.now() < this.cacheExpiresAt) {
      return this.cachedAgents;
    }

    const maxAgents = Number(
      this.config.get('ERC8004_SYNC_MAX_AGENTS', this.config.get('AGENT_STUDIO_SYNC_MAX_AGENTS', '500')),
    );
    const agents = await this.indexer.listExternalAgents(maxAgents);

    this.logger.log(`Discovered ${agents.length} ERC-8004 agents via BNB indexer`);

    this.cachedAgents = agents;
    const cacheTtlMs = Number(
      this.config.get('ERC8004_CACHE_TTL_MS', this.config.get('AGENT_STUDIO_CACHE_TTL_MS', '300000')),
    );
    this.cacheExpiresAt = Date.now() + cacheTtlMs;

    return agents;
  }

  clearCache(): void {
    this.cachedAgents = null;
    this.cacheExpiresAt = 0;
  }

  async getAgent(agentId: string): Promise<ExternalAgent> {
    const agents = await this.getAgents();
    const match = agents.find((agent) => agent.agentId === agentId);
    if (match) return match;

    const resolved = await this.indexer.resolveAgent(agentId);
    if (!resolved) {
      throw new NotFoundException(`Agent ${agentId} not found in indexer`);
    }

    return {
      agentId: resolved.agentId,
      name: resolved.name,
      ownerWallet: resolved.ownerWallet,
      agentWallet: resolved.agentWallet,
      agentUri: resolved.agentUri ?? '',
      network: resolved.network,
      chainId: resolved.chainId,
      isTestnet: resolved.isTestnet,
      description: resolved.description,
      shortDescription: resolved.shortDescription,
      category: resolved.category,
      protocols: resolved.protocols,
      supportedAssets: resolved.supportedAssets,
      strategyName: resolved.strategyName,
      strategyDescription: resolved.strategyDescription,
      riskLevel: resolved.riskLevel,
      minimumCapital: resolved.minimumCapital,
      recommendedCapital: resolved.recommendedCapital,
      executionFrequency: resolved.executionFrequency,
      publishedAt: resolved.publishedAt ?? undefined,
      imageUrl: resolved.imageUrl,
      verified: resolved.verified,
    };
  }

  async verifyOwnership(_agentId: string, _wallet: string): Promise<boolean> {
    return false;
  }
}
