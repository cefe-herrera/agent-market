import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { A2aHealthDto, AgentDto, MarketplaceAgentDto } from '@bnb-marketplace/shared-types';
import { Agent } from '@prisma/client';
import { Erc8004ScanClient } from '../blockchain/erc8004/erc8004-scan.client';
import { Erc8004AgentResolver } from '../blockchain/erc8004/erc8004-agent.resolver';
import {
  buildChainMap,
  fallbackChain,
  mapScanListItemToMarketplaceAgent,
} from '../blockchain/erc8004/erc8004-agent.mapper';
import { NetworkConfig } from '../../common/network/network.config';

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scan: Erc8004ScanClient,
    private readonly resolver: Erc8004AgentResolver,
    private readonly network: NetworkConfig,
  ) {}

  async findAll(): Promise<AgentDto[]> {
    const [result, chains] = await Promise.all([
      this.scan.listUsableAgents({
        limit: 100,
        offset: 0,
        isTestnet: this.network.isTestnet,
        chainId: this.network.chainId,
      }),
      this.scan.getChains(),
    ]);

    const chainMap = buildChainMap(chains);
    const items = await this.scan.enrichCatalogItems(result.items);
    return items
      .filter((item) => item.chain_id === this.network.chainId)
      .map((item) =>
        mapScanListItemToMarketplaceAgent(
          item,
          chainMap.get(item.chain_id) ?? fallbackChain(item.chain_id),
        ),
      );
  }

  async findById(id: string): Promise<MarketplaceAgentDto> {
    const agent = await this.prisma.agent.findFirst({
      where: { OR: [{ id }, { slug: id }, { agentId: id }] },
    });
    if (agent) return this.toDto(agent);

    const fromScan = await this.resolver.resolveByIdOrSlug(id);
    if (fromScan) return fromScan;

    throw new NotFoundException(`Agent ${id} not found`);
  }

  async getA2aHealth(id: string): Promise<A2aHealthDto> {
    const fromScan = await this.resolver.resolveByIdOrSlug(id, { liveProbe: true });
    if (!fromScan?.a2a) {
      throw new NotFoundException(`Agent ${id} not found`);
    }
    return fromScan.a2a;
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
