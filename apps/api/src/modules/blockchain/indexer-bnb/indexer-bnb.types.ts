export type IndexerAgentRow = {
  id: string;
  chainId: number;
  onchainId: string | number;
  ownerAddress: string;
  agentWalletAddress?: string | null;
  name: string | null;
  description: string | null;
  metadataUri?: string | null;
  imageUri?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type SpringPage<T> = {
  content?: T[];
  totalElements?: number;
  number?: number;
  size?: number;
  page?: {
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
  };
};

export type IndexerListFilters = {
  isTestnet?: boolean;
  chainId?: number;
  limit?: number;
  page?: number;
  search?: string;
  usable?: boolean;
  open?: boolean;
};

export type IndexerListResult = {
  data: import('@bnb-marketplace/shared-types').MarketplaceAgentDto[];
  total: number;
  page: number;
  limit: number;
  registered?: number;
  consumable?: number;
  filteredOut?: number;
};

export class IndexerHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Indexer HTTP ${status}`);
  }
}
