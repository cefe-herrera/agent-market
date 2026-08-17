export interface Scan8004PublicListResponse {
  success: boolean;
  data?: Scan8004ListItem[];
  error?: { code?: string; message?: string };
  meta?: {
    pagination?: {
      total: number;
      limit: number;
      page?: number;
      hasMore?: boolean;
    };
  };
}

export interface Scan8004AuthListResponse {
  items: Scan8004ListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface Scan8004PublicDetailResponse {
  success: boolean;
  data: Scan8004AgentDetail;
}

export interface Scan8004ListItem {
  id?: string;
  token_id: string;
  chain_id: number;
  name: string;
  description: string | null;
  owner_address: string;
  created_at: string;
  updated_at?: string;
  agent_id: string;
  is_testnet?: boolean;
  image_url?: string | null;
  is_verified?: boolean;
  star_count?: number;
  supported_protocols?: string[];
  x402_supported?: boolean;
  total_score?: number;
  health_score?: number | null;
  total_feedbacks?: number;
  average_score?: number;
  rank?: number | null;
}

export interface Scan8004Chain {
  chain_key: string;
  chain_id: number;
  name: string;
  is_testnet: boolean;
  enabled: boolean;
}

export interface Scan8004ChainsResponse {
  success?: boolean;
  data?: {
    chains: Scan8004Chain[];
    testnet_chain_ids?: number[];
    mainnet_chain_ids?: number[];
  };
  chains?: Scan8004Chain[];
}

export interface Scan8004OnchainMetadata {
  key: string;
  value: string;
  decoded: string | null;
}

export interface Scan8004AgentDetail {
  id?: string;
  agent_id: string;
  token_id: string;
  chain_id: number;
  name: string;
  description: string | null;
  owner_address: string;
  agent_wallet: string | null;
  image_url: string | null;
  created_at: string;
  updated_at?: string;
  is_testnet?: boolean;
  supported_protocols: string[];
  is_verified: boolean;
  is_active: boolean;
  star_count: number;
  watch_count: number;
  x402_supported: boolean;
  health_score: number | null;
  total_score: number;
  total_feedbacks: number;
  total_validations: number;
  successful_validations: number;
  average_score: number;
  rank: number | null;
  services?: Record<string, { endpoint?: string; version?: string }>;
  a2a_endpoint?: string | null;
  raw_metadata?: {
    offchain_uri?: string;
    onchain?: Scan8004OnchainMetadata[];
    offchain_content?: Record<string, unknown>;
  };
  health_status?: {
    services?: Record<string, { latency_ms?: number; status?: string }>;
  };
}

export interface Erc8004ChainContext {
  chainId: number;
  name: string;
  chainKey: string;
  isTestnet: boolean;
}

export interface Scan8004MetricsPayload {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  uptime: number;
  uniqueUsers: number;
  categoryMetrics: Record<string, unknown>;
}
