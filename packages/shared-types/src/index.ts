export enum AgentStatus {
  DISCOVERED = 'DISCOVERED',
  LISTED = 'LISTED',
  VERIFIED = 'VERIFIED',
  INACTIVE = 'INACTIVE',
}

export enum AgentSource {
  MARKETPLACE_SEED = 'MARKETPLACE_SEED',
  /** @deprecated Use ERC8004 — kept for existing rows */
  BNB_AGENT_STUDIO = 'BNB_AGENT_STUDIO',
  ERC8004 = 'ERC8004',
}

export enum AgentCategory {
  REBALANCING = 'REBALANCING',
  GRID_TRADING = 'GRID_TRADING',
  YIELD_OPTIMISATION = 'YIELD_OPTIMISATION',
  HEALTH_FACTOR_MONITORING = 'HEALTH_FACTOR_MONITORING',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH',
}

export enum PermissionType {
  SWAP = 'SWAP',
  TRANSFER = 'TRANSFER',
  SUPPLY = 'SUPPLY',
  WITHDRAW = 'WITHDRAW',
  BORROW = 'BORROW',
  REPAY = 'REPAY',
  ADD_LIQUIDITY = 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY = 'REMOVE_LIQUIDITY',
  REBALANCE = 'REBALANCE',
}

export enum HireStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  REVOKED = 'REVOKED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum MarketplaceSort {
  HIGHEST_RETURN = 'highestReturn',
  LOWEST_RISK = 'lowestRisk',
  HIGHEST_AUM = 'highestAum',
  BEST_SUCCESS_RATE = 'bestSuccessRate',
  MOST_USED = 'mostUsed',
  NEWEST = 'newest',
}

export interface AgentDto {
  id: string;
  agentId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  imageUrl: string | null;
  ownerWallet: string;
  agentWallet: string;
  agentUri: string | null;
  network: string;
  chainId: number;
  isTestnet: boolean;
  source: AgentSource;
  publishedAt: string | null;
  status: AgentStatus;
  verified: boolean;
  category: AgentCategory;
  protocols: string[];
  supportedAssets: string[];
  strategyName: string;
  strategyDescription: string;
  riskLevel: RiskLevel;
  minimumCapital: number;
  recommendedCapital: number;
  executionFrequency: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMetricsDto {
  agentId: string;
  aum: number;
  managedVolume: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  return7d: number;
  return30d: number;
  return90d: number;
  maxDrawdown30d: number;
  averageExecutionTime: number;
  averageGasCost: number;
  uptime: number;
  uniqueUsers: number;
  totalRevenue: number;
  categoryMetrics: Record<string, unknown>;
  updatedAt: string;
}

export interface AgentPermissionDto {
  id: string;
  agentId: string;
  permissionType: PermissionType;
  contractAddress: string | null;
  protocol: string | null;
  spendLimit: number | null;
  spendAsset: string | null;
  expiration: string | null;
  description: string;
  allowed: boolean;
}

export interface AgentHireDto {
  id: string;
  agentId: string;
  userWallet: string;
  amount: number;
  asset: string;
  status: HireStatus;
  createdAt: string;
  activatedAt: string | null;
  cancelledAt: string | null;
  agent?: AgentDto;
}

export interface A2aHealthDto {
  endpoint: string | null;
  healthy: boolean;
  status: 'healthy' | 'unhealthy' | 'unknown' | 'missing';
  latencyMs: number | null;
  checkedAt: string;
  error: string | null;
  skills: string[];
  x402Support: boolean | null;
  name?: string | null;
  description?: string | null;
}

export interface MarketplaceAgentDto extends AgentDto {
  metrics?: AgentMetricsDto;
  marketplaceScore?: number;
  a2a?: A2aHealthDto;
}

export interface CompareAgentDto extends MarketplaceAgentDto {
  scoreBreakdown?: MarketplaceScoreBreakdown;
}

export interface MarketplaceScoreBreakdown {
  performanceScore: number;
  reliabilityScore: number;
  riskScore: number;
  trackRecordScore: number;
  usageScore: number;
  totalScore: number;
}

export interface CategoryInfo {
  id: AgentCategory;
  slug: string;
  name: string;
  description: string;
  tagline: string;
}

export interface CreateHireRequest {
  agentId: string;
  userWallet: string;
  amount: number;
  asset: string;
}

export interface PerformanceChartPoint {
  date: string;
  value: number;
}

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  occurredAt: Date;
}

export const DOMAIN_EVENTS = {
  AGENT_DISCOVERED: 'AgentDiscovered',
  AGENT_VERIFIED: 'AgentVerified',
  AGENT_HIRED: 'AgentHired',
  AGENT_ACTIVATED: 'AgentActivated',
  AGENT_PAUSED: 'AgentPaused',
  AGENT_REVOKED: 'AgentRevoked',
  AGENT_METRICS_UPDATED: 'AgentMetricsUpdated',
} as const;

export interface ExternalAgent {
  agentId: string;
  name: string;
  ownerWallet: string;
  agentWallet: string;
  agentUri: string;
  network: string;
  chainId: number;
  isTestnet: boolean;
  description?: string;
  shortDescription?: string;
  category?: AgentCategory;
  protocols?: string[];
  supportedAssets?: string[];
  strategyName?: string;
  strategyDescription?: string;
  riskLevel?: RiskLevel;
  minimumCapital?: number;
  recommendedCapital?: number;
  executionFrequency?: string;
  publishedAt?: string;
  imageUrl?: string | null;
  verified?: boolean;
  scanMetrics?: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    uptime: number;
    uniqueUsers: number;
    categoryMetrics: Record<string, unknown>;
  };
}

export interface AgentStudioSyncResult {
  discovered: number;
  updated: number;
  skipped: number;
  purged: number;
  total: number;
}

export interface ChainInfo {
  chainId: number;
  name: string;
  chainKey: string;
  isTestnet: boolean;
  agentCount: number;
}

export interface MarketplaceStats {
  agents: number;
  categories: number;
  protocols: number;
  verified: number;
  studioAgents: number;
  chains: number;
  mainnetAgents: number;
  testnetAgents: number;
}

export interface MarketplaceFilters {
  category?: AgentCategory;
  protocol?: string;
  asset?: string;
  riskLevel?: RiskLevel;
  verified?: boolean;
  source?: AgentSource;
  chainId?: number;
  isTestnet?: boolean;
  minimumCapital?: number;
  search?: string;
  sort?: MarketplaceSort;
  page?: number;
  limit?: number;
}
