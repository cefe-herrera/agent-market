import {
  AgentCategory,
  AgentSource,
  ExternalAgent,
  RiskLevel,
} from '@bnb-marketplace/shared-types';
import { AgentStatus, Prisma } from '@prisma/client';

export function slugifyAgentName(name: string, agentId: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent';

  const parts = agentId.split(':');
  const tokenId = parts.length === 3 ? parts[2] : agentId.replace(/[^a-z0-9]/gi, '');
  return `${base}-${tokenId}`.slice(0, 120);
}

export function mapExternalAgentToCreateInput(
  external: ExternalAgent,
): Prisma.AgentCreateInput {
  const publishedAt = external.publishedAt ? new Date(external.publishedAt) : new Date();

  return {
    agentId: external.agentId,
    name: external.name,
    slug: slugifyAgentName(external.name, external.agentId),
    description: external.description ?? external.name,
    shortDescription: external.shortDescription ?? external.name,
    imageUrl: external.imageUrl ?? null,
    ownerWallet: external.ownerWallet,
    agentWallet: external.agentWallet,
    agentUri: external.agentUri,
    network: external.network,
    chainId: external.chainId,
    isTestnet: external.isTestnet,
    source: AgentSource.ERC8004,
    publishedAt,
    status: AgentStatus.LISTED,
    verified: external.verified ?? false,
    category: external.category ?? AgentCategory.YIELD_OPTIMISATION,
    protocols: external.protocols ?? ['ERC-8004'],
    supportedAssets: external.supportedAssets ?? ['ETH'],
    strategyName: external.strategyName ?? external.name,
    strategyDescription: external.strategyDescription ?? external.description ?? external.name,
    riskLevel: external.riskLevel ?? RiskLevel.MEDIUM,
    minimumCapital: external.minimumCapital ?? 0,
    recommendedCapital: external.recommendedCapital ?? 0,
    executionFrequency: external.executionFrequency ?? 'On demand',
  };
}

export function mapExternalAgentToUpdateInput(
  external: ExternalAgent,
): Prisma.AgentUpdateInput {
  const create = mapExternalAgentToCreateInput(external);
  const { agentId: _agentId, slug: _slug, ...updateFields } = create;
  return updateFields;
}

export function mapExternalMetrics(
  external: ExternalAgent,
): Prisma.AgentMetricsCreateWithoutAgentInput {
  const scan = external.scanMetrics;
  if (!scan) {
    return emptyMetrics();
  }

  return {
    aum: 0,
    managedVolume: 0,
    totalExecutions: scan.totalExecutions,
    successfulExecutions: scan.successfulExecutions,
    failedExecutions: scan.failedExecutions,
    successRate: scan.successRate,
    return7d: 0,
    return30d: 0,
    return90d: 0,
    maxDrawdown30d: 0,
    averageExecutionTime: Number(scan.categoryMetrics['a2aLatencyMs'] ?? 0),
    averageGasCost: 0,
    uptime: scan.uptime,
    uniqueUsers: scan.uniqueUsers,
    totalRevenue: 0,
    categoryMetrics: scan.categoryMetrics as Prisma.InputJsonValue,
  };
}

function emptyMetrics(): Prisma.AgentMetricsCreateWithoutAgentInput {
  return {
    aum: 0,
    managedVolume: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    successRate: 0,
    return7d: 0,
    return30d: 0,
    return90d: 0,
    maxDrawdown30d: 0,
    averageExecutionTime: 0,
    averageGasCost: 0,
    uptime: 0,
    uniqueUsers: 0,
    totalRevenue: 0,
    categoryMetrics: {},
  };
}
