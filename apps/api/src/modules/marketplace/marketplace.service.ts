import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  AgentCategory,
  CategoryInfo,
  ChainInfo,
  CompareAgentDto,
  MarketplaceAgentDto,
  MarketplaceFilters,
  MarketplaceSort,
  MarketplaceStats,
} from '@bnb-marketplace/shared-types';
import { AgentsService } from '../agents/agents.service';
import { AnalyticsPublicService } from '../analytics/analytics-public.service';
import { MarketplaceScoreCalculator } from './marketplace-score.calculator';
import { Agent, AgentMetrics } from '@prisma/client';
import { IndexerBnbService } from '../blockchain/indexer-bnb/indexer-bnb.service';
import { NetworkConfig } from '../../common/network/network.config';

const CATEGORY_INFO: CategoryInfo[] = [
  {
    id: AgentCategory.REBALANCING,
    slug: 'rebalancing',
    name: 'Manage Liquidity',
    description:
      'Automated liquidity range management for DEX positions. Agents monitor price movements and rebalance LP positions to maximize fee capture while minimizing impermanent loss.',
    tagline: 'Keep your liquidity positions optimally ranged',
  },
  {
    id: AgentCategory.GRID_TRADING,
    slug: 'grid-trading',
    name: 'Automate Trading',
    description:
      'Systematic grid trading strategies that buy low and sell high within defined price ranges. Ideal for sideways markets on BNB Chain pairs.',
    tagline: 'Profit from market volatility automatically',
  },
  {
    id: AgentCategory.YIELD_OPTIMISATION,
    slug: 'yield',
    name: 'Earn Yield',
    description:
      'Intelligent yield routing across lending protocols like Venus, Lista DAO, and Aave. Agents continuously find the best risk-adjusted returns for your assets.',
    tagline: 'Maximize returns across DeFi protocols',
  },
  {
    id: AgentCategory.HEALTH_FACTOR_MONITORING,
    slug: 'health-factor',
    name: 'Protect Loans',
    description:
      'Active monitoring and protection of lending positions. Agents track health factors and take preventive action to avoid liquidations on Venus and similar protocols.',
    tagline: 'Never get liquidated unexpectedly',
  },
];

type AgentWithMetrics = Agent & { metrics: AgentMetrics | null };

@Injectable()
export class MarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentsService: AgentsService,
    private readonly analyticsService: AnalyticsPublicService,
    private readonly indexer: IndexerBnbService,
    private readonly network: NetworkConfig,
  ) {}

  getCategories(): CategoryInfo[] {
    return CATEGORY_INFO;
  }

  getCategoryBySlug(slug: string): CategoryInfo | undefined {
    return CATEGORY_INFO.find((c) => c.slug === slug);
  }

  async getStats(): Promise<MarketplaceStats> {
    const registered = await this.indexer.countRegistered();
    return {
      agents: registered,
      categories: CATEGORY_INFO.length,
      protocols: 0,
      verified: 0,
      studioAgents: 0,
      chains: 1,
      mainnetAgents: this.network.isTestnet ? 0 : registered,
      testnetAgents: this.network.isTestnet ? registered : 0,
    };
  }

  async getChains(): Promise<ChainInfo[]> {
    return [
      {
        chainId: this.network.chainId,
        name: this.network.isTestnet ? 'BSC Testnet' : 'BNB Chain',
        chainKey: this.network.isTestnet ? 'bsc_testnet' : 'bsc_mainnet',
        isTestnet: this.network.isTestnet,
        agentCount: 0,
      },
    ];
  }

  async listAgents(filters: MarketplaceFilters): Promise<{
    data: MarketplaceAgentDto[];
    total: number;
    page: number;
    limit: number;
    registered?: number;
    consumable?: number;
    filteredOut?: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 100, 100);
    const result = await this.indexer.listAgents({
      page,
      limit,
      search: filters.search,
      chainId: filters.chainId ?? this.network.chainId,
      isTestnet: filters.isTestnet ?? this.network.isTestnet,
      usable: filters.usable,
      open: filters.open,
    });

    let data = this.applyClientFilters(result.data, filters);
    data = this.applyClientSort(data, filters.sort);

    return {
      data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      registered: result.registered,
      consumable: result.consumable,
      filteredOut: result.filteredOut,
    };
  }

  async getFeatured(limit = 10): Promise<MarketplaceAgentDto[]> {
    const result = await this.indexer.listAgents({
      usable: true,
      limit,
      page: 1,
      chainId: this.network.chainId,
      isTestnet: this.network.isTestnet,
    });
    return result.data;
  }

  async compareAgents(ids: string[]): Promise<CompareAgentDto[]> {
    if (ids.length === 0 || ids.length > 3) {
      throw new Error('Compare requires 1-3 agent IDs');
    }

    const agents = await this.prisma.agent.findMany({
      where: { id: { in: ids } },
      include: { metrics: true },
    });

    return agents.map((agent) => {
      const dto = this.toMarketplaceAgent(agent) as CompareAgentDto;
      if (agent.metrics) {
        const metricsDto = this.analyticsService.toDto(agent.metrics);
        const ageDays = Math.floor(
          (Date.now() - agent.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        dto.scoreBreakdown = MarketplaceScoreCalculator.calculate(
          metricsDto,
          agent.riskLevel as CompareAgentDto['riskLevel'],
          ageDays,
        );
        dto.marketplaceScore = dto.scoreBreakdown.totalScore;
      }
      return dto;
    });
  }

  private applyClientFilters(
    agents: MarketplaceAgentDto[],
    filters: MarketplaceFilters,
  ): MarketplaceAgentDto[] {
    return agents.filter((agent) => {
      if (agent.chainId !== (filters.chainId ?? this.network.chainId)) return false;
      if (filters.category && agent.category !== filters.category) return false;
      if (filters.protocol && !agent.protocols.includes(filters.protocol)) return false;
      if (filters.riskLevel && agent.riskLevel !== filters.riskLevel) return false;
      if (filters.verified !== undefined && agent.verified !== filters.verified) return false;
      if (filters.asset && !agent.supportedAssets.includes(filters.asset)) return false;
      if (
        filters.minimumCapital !== undefined &&
        agent.minimumCapital > filters.minimumCapital
      ) {
        return false;
      }
      return true;
    });
  }

  private applyClientSort(
    agents: MarketplaceAgentDto[],
    sort?: MarketplaceSort,
  ): MarketplaceAgentDto[] {
    const data = [...agents];

    if (sort === MarketplaceSort.HIGHEST_RETURN) {
      data.sort((a, b) => (b.metrics?.return30d ?? 0) - (a.metrics?.return30d ?? 0));
    } else if (sort === MarketplaceSort.LOWEST_RISK) {
      const riskOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 };
      data.sort(
        (a, b) =>
          (riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 4) -
          (riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 4),
      );
    } else if (sort === MarketplaceSort.HIGHEST_AUM) {
      data.sort((a, b) => (b.metrics?.aum ?? 0) - (a.metrics?.aum ?? 0));
    } else if (sort === MarketplaceSort.BEST_SUCCESS_RATE) {
      data.sort((a, b) => (b.metrics?.successRate ?? 0) - (a.metrics?.successRate ?? 0));
    } else if (sort === MarketplaceSort.MOST_USED) {
      data.sort((a, b) => (b.metrics?.uniqueUsers ?? 0) - (a.metrics?.uniqueUsers ?? 0));
    }

    return data;
  }

  private toMarketplaceAgent(agent: AgentWithMetrics): MarketplaceAgentDto {
    const dto = this.agentsService.toDto(agent) as MarketplaceAgentDto;

    if (agent.metrics) {
      dto.metrics = this.analyticsService.toDto(agent.metrics);
      const ageDays = Math.floor(
        (Date.now() - agent.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const breakdown = MarketplaceScoreCalculator.calculate(
        dto.metrics,
        agent.riskLevel as MarketplaceAgentDto['riskLevel'],
        ageDays,
      );
      dto.marketplaceScore = breakdown.totalScore;
    }

    return dto;
  }
}
