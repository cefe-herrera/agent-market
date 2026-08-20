export type MarketplaceAgent = {
  id: string;
  agentId: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  ownerWallet: string;
  agentWallet: string;
  agentUri: string | null;
  network: string;
  chainId: number;
  isTestnet: boolean;
  protocols: string[];
  supportedAssets: string[];
  verified: boolean;
  marketplaceScore?: number;
  metrics?: {
    categoryMetrics?: Record<string, unknown>;
  };
  a2a?: {
    endpoint: string | null;
    healthy: boolean;
    status: string;
    skills?: string[];
    x402Support?: boolean | null;
    error?: string | null;
  };
};

export const BSC_TESTNET_CHAIN_ID = 97;

export function isUsableBscTestnetAgent(agent: MarketplaceAgent): boolean {
  if (agent.chainId !== BSC_TESTNET_CHAIN_ID) return false;
  if (agent.isTestnet === false) return false;

  const protocols = agent.protocols.map((p) => p.toLowerCase());
  const hasA2a = protocols.includes("a2a");
  const hasX402 =
    agent.supportedAssets.includes("U") ||
    agent.metrics?.categoryMetrics?.["x402Supported"] === true;
  return hasA2a || hasX402;
}

export function shortenAddress(value: string): string {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** 8004scan listings whose service URL is a dummy host, not a live seller. */
export function isPlaceholderEndpoint(agent: MarketplaceAgent): boolean {
  const uri = (agent.agentUri ?? "").toLowerCase();
  if (uri.includes(".example") || uri.includes("example.com")) return true;
  const desc = `${agent.description} ${agent.shortDescription}`.toLowerCase();
  if (desc.includes("research only")) return true;
  const protocols = agent.protocols.map((p) => p.toLowerCase());
  return protocols.includes("web") && !protocols.includes("a2a");
}
