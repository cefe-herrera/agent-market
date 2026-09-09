import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { A2aHealthDto, AgentDto, MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { Agent } from '@prisma/client';
import { IndexerBnbService } from '../blockchain/indexer-bnb/indexer-bnb.service';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly indexer: IndexerBnbService,
  ) {}

  async findAll(): Promise<AgentDto[]> {
    const result = await this.indexer.listAgents({ usable: true, limit: 100, page: 1 });
    return result.data;
  }

  async findById(id: string): Promise<MarketplaceAgentDto> {
    const agent = await this.prisma.agent.findFirst({
      where: { OR: [{ id }, { slug: id }, { agentId: id }] },
    });
    if (agent) return this.toDto(agent);

    const fromIndexer = await this.indexer.resolveAgent(id);
    if (fromIndexer) return fromIndexer;

    throw new NotFoundException(`Agent ${id} not found`);
  }

  async getA2aHealth(id: string): Promise<A2aHealthDto> {
    const health = await this.indexer.probeA2aHealth(id);
    if (health.status === 'missing') {
      const exists = await this.indexer.resolveAgent(id);
      if (!exists) {
        throw new NotFoundException(`Agent ${id} not found`);
      }
    }
    return health;
  }

  async findBySlug(slug: string): Promise<AgentDto> {
    return this.findById(slug);
  }

  async findByIds(ids: string[]): Promise<AgentDto[]> {
    const agents = await this.prisma.agent.findMany({
      where: { id: { in: ids } },
    });
    return agents.map((a) => this.toDto(a));
  }

  toDto(agent: Agent): AgentDto {
    return {
      id: agent.id,
      agentId: agent.agentId,
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      shortDescription: agent.shortDescription,
      imageUrl: agent.imageUrl,
      ownerWallet: agent.ownerWallet,
      agentWallet: agent.agentWallet,
      agentUri: agent.agentUri,
      network: agent.network,
      chainId: agent.chainId,
      isTestnet: agent.isTestnet,
      source: agent.source as AgentDto['source'],
      publishedAt: agent.publishedAt?.toISOString() ?? null,
      status: agent.status as AgentDto['status'],
      verified: agent.verified,
      category: agent.category as AgentDto['category'],
      protocols: agent.protocols,
      supportedAssets: agent.supportedAssets,
      strategyName: agent.strategyName,
      strategyDescription: agent.strategyDescription,
      riskLevel: agent.riskLevel as AgentDto['riskLevel'],
      minimumCapital: agent.minimumCapital,
      recommendedCapital: agent.recommendedCapital,
      executionFrequency: agent.executionFrequency,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };
  }
}
