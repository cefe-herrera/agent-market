import {
  A2aHealthDto,
  AgentCategory,
  AgentSource,
  AgentStatus,
  ExternalAgent,
  MarketplaceAgentDto,
  RiskLevel,
} from '@bnb-marketplace/shared-types';
import type {
  Erc8004ChainContext,
  Scan8004AgentDetail,
  Scan8004ListItem,
  Scan8004MetricsPayload,
} from './erc8004.types';
import { emptyA2aHealth, a2aMetrics } from './a2a-health';
import { slugifyAgentName } from '../../agents/agent-studio.mapper';

export function scanA2aEndpoint(detail: Scan8004AgentDetail): string | null {
  return detail.a2a_endpoint ?? detail.services?.a2a?.endpoint ?? null;
}

export function scanA2aStatus(
  detail: Scan8004AgentDetail,
): A2aHealthDto['status'] {
  const status = detail.health_status?.services?.a2a?.status?.toLowerCase();
  if (status === 'healthy') return 'healthy';
  if (status === 'unhealthy' || status === 'degraded') return 'unhealthy';
  if (!scanA2aEndpoint(detail)) return 'missing';
  return 'unknown';
}

export function scanA2aHealthy(detail: Scan8004AgentDetail): boolean {
  return scanA2aStatus(detail) === 'healthy';
}

export function mapScanA2aHealth(detail: Scan8004AgentDetail): A2aHealthDto {
  const status = scanA2aStatus(detail);
  return emptyA2aHealth(scanA2aEndpoint(detail), status, {
    latencyMs: detail.health_status?.services?.a2a?.latency_ms ?? null,
    checkedAt: detail.health_status?.checked_at ?? detail.health_checked_at ?? new Date().toISOString(),
    error: detail.health_status?.services?.a2a?.message ?? null,
  });
}

export function isLikelyBnbAgentStudioListItem(item: Scan8004ListItem): boolean {
  const text = `${item.name} ${item.description ?? ''}`.toLowerCase();
  return (
    text.includes('bnbagent') ||
    text.includes('bnb agent studio') ||
    text.includes('studio-agent')
  );
}

export function decodeHexMetadata(value: string): string {
  const hex = value.startsWith('0x') ? value.slice(2) : value;
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return value;
  try {
    return Buffer.from(hex, 'hex').toString('utf8');
  } catch {
    return value;
  }
}

export function isBnbAgentStudioAgent(
  detail: Scan8004AgentDetail,
  builtWithFilter: string,
): boolean {
  const onchain = detail.raw_metadata?.onchain ?? [];
  const builtWith = onchain.find((entry) => entry.key === 'built_with');
  if (!builtWith) return false;

  const decoded =
    builtWith.decoded ??
    (builtWith.value.startsWith('0x')
      ? decodeHexMetadata(builtWith.value)
      : builtWith.value);

  return decoded.toLowerCase().includes(builtWithFilter.toLowerCase());
}

export function inferAgentCategory(
  name: string,
  description: string,
): AgentCategory {
  const text = `${name} ${description}`.toLowerCase();

  if (
    text.includes('health factor') ||
    text.includes('health-factor') ||
    text.includes('liquidation') ||
    text.includes('loan protect')
  ) {
    return AgentCategory.HEALTH_FACTOR_MONITORING;
  }

  if (text.includes('grid') || text.includes('trading')) {
    return AgentCategory.GRID_TRADING;
  }

  if (
    text.includes('liquidity') ||
    text.includes(' lp ') ||
    text.includes('rebalance') ||
    text.includes('pancake')
  ) {
    return AgentCategory.REBALANCING;
  }

  if (
    text.includes('yield') ||
    text.includes('vault') ||
    text.includes('lending') ||
    text.includes('venus') ||
    text.includes('lista')
  ) {
    return AgentCategory.YIELD_OPTIMISATION;
  }

  return AgentCategory.YIELD_OPTIMISATION;
}

export function mapScanProtocols(detail: Scan8004AgentDetail): string[] {
  const protocols = [...(detail.supported_protocols ?? [])];
  const text = `${detail.name} ${detail.description ?? ''}`.toLowerCase();

  if (text.includes('venus') && !protocols.includes('Venus')) protocols.push('Venus');
  if (text.includes('pancake') && !protocols.includes('PancakeSwap')) {
    protocols.push('PancakeSwap');
  }
  if (text.includes('lista') && !protocols.includes('Lista DAO')) {
    protocols.push('Lista DAO');
  }

  return protocols.length ? protocols : ['ERC-8004'];
}

export function mapScanMetrics(detail: Scan8004AgentDetail): Scan8004MetricsPayload {
  const totalValidations = detail.total_validations ?? 0;
  const successfulValidations = detail.successful_validations ?? 0;
  const failedValidations = Math.max(0, totalValidations - successfulValidations);
  const successRate =
    totalValidations > 0 ? (successfulValidations / totalValidations) * 100 : 0;

  const a2aLatency = detail.health_status?.services?.a2a?.latency_ms ?? 0;

  return {
    totalExecutions: totalValidations,
    successfulExecutions: successfulValidations,
    failedExecutions: failedValidations,
    successRate,
    uptime: detail.health_score ?? 0,
    uniqueUsers: detail.star_count ?? 0,
    categoryMetrics: {
      healthScore: detail.health_score,
      totalScore: detail.total_score,
      averageScore: detail.average_score,
      totalFeedbacks: detail.total_feedbacks,
      starCount: detail.star_count,
      watchCount: detail.watch_count,
      rank: detail.rank,
      x402Supported: detail.x402_supported,
      isActive: detail.is_active,
      a2aLatencyMs: a2aLatency,
      a2aEndpoint: scanA2aEndpoint(detail),
      a2aStatus: scanA2aStatus(detail),
      a2aHealthy: scanA2aHealthy(detail),
      agentId8004: detail.agent_id,
    },
  };
}

export function mapScanMetricsToAgentMetricsDto(
  detail: Scan8004AgentDetail,
): NonNullable<MarketplaceAgentDto['metrics']> {
  const scan = mapScanMetrics(detail);

  return {
    agentId: detail.agent_id,
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
    categoryMetrics: scan.categoryMetrics,
    updatedAt: detail.updated_at ?? detail.created_at,
  };
}

export function mapScanDetailToMarketplaceAgent(
  detail: Scan8004AgentDetail,
  chain: Erc8004ChainContext,
): MarketplaceAgentDto {
  const external = mapScanAgentToExternal(detail, chain);

  return {
    id: detail.id ?? detail.agent_id,
    agentId: detail.agent_id,
    name: external.name,
    slug: slugifyAgentName(external.name, external.agentId),
    description: external.description ?? external.name,
    shortDescription: external.shortDescription ?? external.name,
    imageUrl: external.imageUrl ?? null,
    ownerWallet: external.ownerWallet,
    agentWallet: external.agentWallet,
    agentUri: external.agentUri,
    network: chain.name,
    chainId: chain.chainId,
    isTestnet: detail.is_testnet ?? chain.isTestnet,
    source: AgentSource.ERC8004,
    publishedAt: external.publishedAt ?? detail.created_at,
    status: detail.is_active ? AgentStatus.LISTED : AgentStatus.INACTIVE,
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
    createdAt: detail.created_at,
    updatedAt: detail.updated_at ?? detail.created_at,
    metrics: mapScanMetricsToAgentMetricsDto(detail),
    marketplaceScore: detail.total_score ?? 0,
    a2a: mapScanA2aHealth(detail),
  };
}

export function withA2aHealth(
  dto: MarketplaceAgentDto,
  health: A2aHealthDto,
): MarketplaceAgentDto {
  return {
    ...dto,
    a2a: health,
    metrics: dto.metrics
      ? {
          ...dto.metrics,
          categoryMetrics: {
            ...dto.metrics.categoryMetrics,
            ...a2aMetrics(health),
          },
        }
      : dto.metrics,
  };
}

export function mapScanListItemToMarketplaceAgent(
  item: Scan8004ListItem,
  chain: Erc8004ChainContext,
): MarketplaceAgentDto {
  const description = item.description ?? '';
  const protocols =
    item.supported_protocols?.length ? [...item.supported_protocols] : ['ERC-8004'];

  return {
    id: item.id ?? item.agent_id,
    agentId: item.agent_id,
    name: item.name,
    slug: slugifyAgentName(item.name, item.agent_id),
    description: description || item.name,
    shortDescription: description.slice(0, 160) || item.name,
    imageUrl: item.image_url ?? null,
    ownerWallet: item.owner_address,
    agentWallet: item.owner_address,
    agentUri: `erc8004://${item.chain_id}/${item.token_id}`,
    network: chain.name,
    chainId: item.chain_id,
    isTestnet: item.is_testnet ?? chain.isTestnet,
    source: AgentSource.ERC8004,
    publishedAt: item.created_at,
    status: AgentStatus.LISTED,
    verified: item.is_verified ?? false,
    category: inferAgentCategory(item.name, description),
    protocols,
    supportedAssets: item.x402_supported ? ['U'] : [],
    strategyName: item.name,
    strategyDescription: description || item.name,
    riskLevel: RiskLevel.MEDIUM,
    minimumCapital: 0,
    recommendedCapital: 0,
    executionFrequency: 'On demand',
    createdAt: item.created_at,
    updatedAt: item.updated_at ?? item.created_at,
    metrics: mapScanListMetrics(item),
    marketplaceScore: item.total_score ?? 0,
  };
}

function mapScanListMetrics(item: Scan8004ListItem): MarketplaceAgentDto['metrics'] {
  const totalFeedbacks = item.total_feedbacks ?? 0;

  return {
    agentId: item.id ?? item.agent_id,
    aum: 0,
    managedVolume: 0,
    totalExecutions: totalFeedbacks,
    successfulExecutions: totalFeedbacks,
    failedExecutions: 0,
    successRate: totalFeedbacks > 0 ? 100 : 0,
    return7d: 0,
    return30d: 0,
    return90d: 0,
    maxDrawdown30d: 0,
    averageExecutionTime: 0,
    averageGasCost: 0,
    uptime: item.health_score ?? 0,
    uniqueUsers: item.star_count ?? 0,
    totalRevenue: 0,
    categoryMetrics: {
      healthScore: item.health_score,
      totalScore: item.total_score,
      averageScore: item.average_score,
      totalFeedbacks: item.total_feedbacks,
      starCount: item.star_count,
      rank: item.rank,
      x402Supported: item.x402_supported,
      agentId8004: item.agent_id,
    },
    updatedAt: item.updated_at ?? item.created_at,
  };
}

export function buildChainMap(
  chains: { chain_id: number; name: string; chain_key: string; is_testnet: boolean }[],
): Map<number, Erc8004ChainContext> {
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

export function fallbackChain(chainId: number): Erc8004ChainContext {
  return {
    chainId,
    name: `Chain ${chainId}`,
    chainKey: `chain_${chainId}`,
    isTestnet: false,
  };
}

export function mapScanAgentToExternal(
  detail: Scan8004AgentDetail,
  chain: Erc8004ChainContext,
): ExternalAgent {
  const description = detail.description ?? '';
  const services = detail.services ?? {};
  const endpointList = Object.entries(services)
    .map(([name, svc]) => `${name}: ${svc.endpoint ?? '—'}`)
    .join('\n');

  return {
    agentId: detail.agent_id,
    name: detail.name,
    ownerWallet: detail.owner_address,
    agentWallet: detail.agent_wallet ?? detail.owner_address,
    agentUri:
      detail.raw_metadata?.offchain_uri ??
      detail.a2a_endpoint ??
      `erc8004://${detail.chain_id}/${detail.token_id}`,
    network: chain.name,
    chainId: chain.chainId,
    isTestnet: chain.isTestnet,
    description,
    shortDescription: description.slice(0, 160) || detail.name,
    category: inferAgentCategory(detail.name, description),
    protocols: mapScanProtocols(detail),
    supportedAssets: detail.x402_supported ? ['U'] : [],
    strategyName: detail.name,
    strategyDescription:
      description +
      (endpointList ? `\n\nServices:\n${endpointList}` : ''),
    riskLevel: RiskLevel.MEDIUM,
    minimumCapital: 0,
    recommendedCapital: 0,
    executionFrequency: detail.is_active ? 'Active' : 'Inactive',
    publishedAt: detail.created_at,
    imageUrl: detail.image_url,
    verified: detail.is_verified,
    scanMetrics: mapScanMetrics(detail),
  };
}
