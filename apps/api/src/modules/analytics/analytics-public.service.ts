import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AgentMetricsDto, PerformanceChartPoint } from '@bnb-marketplace/shared-types';
import { AgentMetrics } from '@prisma/client';
import { AgentLookupService } from '../../common/agents/agent-lookup.service';
import { Erc8004AgentResolver } from '../blockchain/erc8004/erc8004-agent.resolver';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetricsByAgentId(agentDbId: string): Promise<AgentMetrics | null> {
    return this.prisma.agentMetrics.findUnique({ where: { agentId: agentDbId } });
  }
}

@Injectable()
export class AnalyticsPublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentLookup: AgentLookupService,
    private readonly scanResolver: Erc8004AgentResolver,
  ) {}

  async getMetricsForAgent(idOrSlug: string): Promise<AgentMetricsDto> {
    try {
      const agent = await this.agentLookup.findByIdOrSlug(idOrSlug);
      const metrics = await this.prisma.agentMetrics.findUnique({
        where: { agentId: agent.id },
      });
      if (metrics) return this.toDto(metrics);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
    }

    const scanAgent = await this.scanResolver.resolveByIdOrSlug(idOrSlug);
    if (scanAgent?.metrics) {
      return scanAgent.metrics;
    }

    throw new NotFoundException(`Metrics for agent ${idOrSlug} not found`);
  }

  async getPerformanceChart(_agentDbId: string, _days = 30): Promise<PerformanceChartPoint[]> {
    return [];
  }

  toDto(metrics: AgentMetrics): AgentMetricsDto {
    return {
      agentId: metrics.agentId,
      aum: metrics.aum,
      managedVolume: metrics.managedVolume,
      totalExecutions: metrics.totalExecutions,
      successfulExecutions: metrics.successfulExecutions,
      failedExecutions: metrics.failedExecutions,
      successRate: metrics.successRate,
      return7d: metrics.return7d,
      return30d: metrics.return30d,
      return90d: metrics.return90d,
      maxDrawdown30d: metrics.maxDrawdown30d,
      averageExecutionTime: metrics.averageExecutionTime,
      averageGasCost: metrics.averageGasCost,
      uptime: metrics.uptime,
      uniqueUsers: metrics.uniqueUsers,
      totalRevenue: metrics.totalRevenue,
      categoryMetrics: metrics.categoryMetrics as Record<string, unknown>,
      updatedAt: metrics.updatedAt.toISOString(),
    };
  }
}
