import { BSC_MAINNET_CHAIN_ID } from "@/app/lib/network";

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
    priceLabel?: string | null;
  };
  endpoints?: {
    a2a: string | null;
    mcp: string | null;
    agentUrl?: string | null;
  };
  verification?: {
    level: "registered" | "schema_valid" | "live";
    registered: boolean;
    schemaValid: boolean;
    live: boolean;
    livePending: boolean;
    schemaErrors: string[];
    liveError: string | null;
    priceLabel: string | null;
    skills: string[];
    studioSdk?: boolean;
  };
  /** Agent Safe 7579 used as ERC-8183 `provider`. Not the x402 payTo. */
  erc8183Provider?: string | null;
};

export const BSC_TESTNET_CHAIN_ID = 97;

export function agentHasMcp(agent: MarketplaceAgent): boolean {
  if (agent.protocols.some((protocol) => protocol.toLowerCase() === "mcp")) {
    return true;
  }
  return Boolean(agent.endpoints?.mcp);
}

export function agentEndpoints(agent: MarketplaceAgent): {
  a2a: string | null;
  mcp: string | null;
} {
  const metricsMcp = agent.metrics?.categoryMetrics?.["mcpEndpoint"];
  return {
    a2a: agent.a2a?.endpoint ?? agent.endpoints?.a2a ?? null,
    mcp:
      agent.endpoints?.mcp ??
      (typeof metricsMcp === "string" ? metricsMcp : null),
  };
}

export function isHttpUrl(value: string | null | undefined): boolean {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

export function verificationLabels(agent: MarketplaceAgent): string[] {
  const v = agent.verification;
  if (!v) return [];
  const labels = ["Registered"];
  if (v.studioSdk === true) labels.push("SDK");
  else if (v.studioSdk === false) labels.push("open");
  if (v.schemaValid) labels.push("Schema");
  if (v.live) labels.push("Live");
  else if (v.livePending) labels.push("Live pending");
  else if (v.schemaValid) labels.push("Live down");
  return labels;
}

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

/** Indexer rows: backend already dropped factory noise when usable=true. BSC only. */
export function isIndexerCatalogAgent(
  agent: MarketplaceAgent,
  mode: "mainnet" | "testnet",
): boolean {
  const chainId = mode === "testnet" ? BSC_TESTNET_CHAIN_ID : BSC_MAINNET_CHAIN_ID;
  if (agent.chainId !== chainId) return false;
  if (mode === "testnet" && agent.isTestnet === false) return false;
  if (mode !== "testnet" && agent.isTestnet === true) return false;
  if (agent.verification && agent.verification.schemaValid === false) return false;
  return true;
}

export function isConsumableCatalogAgent(agent: MarketplaceAgent): boolean {
  if (agent.verification?.schemaValid) return true;
  const endpoints = agentEndpoints(agent);
  return isHttpUrl(endpoints.a2a) || isHttpUrl(endpoints.mcp);
}

export function shortenAddress(value: string): string {
  if (!value || value.length < 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

/** 8004scan listings whose service URL is a dummy host, not a live seller. */
export function isPlaceholderEndpoint(agent: MarketplaceAgent): boolean {
  const endpoints = agentEndpoints(agent);
  const uri = `${agent.agentUri ?? ""} ${endpoints.a2a ?? ""} ${endpoints.mcp ?? ""}`.toLowerCase();
  if (uri.includes(".example") || uri.includes("example.com")) return true;
  const desc = `${agent.description} ${agent.shortDescription}`.toLowerCase();
  if (desc.includes("research only")) return true;
  const protocols = agent.protocols.map((p) => p.toLowerCase());
  return protocols.includes("web") && !protocols.includes("a2a");
}
