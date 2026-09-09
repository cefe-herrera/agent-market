import type { MarketplaceAgent } from "@/app/lib/agents";
import type { PublicMerchant } from "./types";

export function merchantToCatalogAgent(
  listing: PublicMerchant,
): MarketplaceAgent {
  return {
    id: listing.agentId,
    agentId: listing.agentId,
    name: listing.name,
    slug: listing.agentId,
    description: listing.description,
    shortDescription: "Merchant · 8004 + Safe 7579",
    ownerWallet: listing.owner,
    agentWallet: listing.payTo,
    agentUri: listing.cardUrl,
    network: listing.chainId === 56 ? "BNB Chain" : "BSC Testnet",
    chainId: listing.chainId,
    isTestnet: listing.chainId === 97,
    protocols: ["A2A", "x402", "ERC-8183"],
    supportedAssets: ["U"],
    verified: Boolean(listing.tokenId),
    erc8183Provider: listing.provider8183,
    a2a: {
      endpoint: listing.a2a,
      healthy: Boolean(listing.a2a),
      status: listing.a2a ? "listed" : "missing",
      x402Support: true,
      priceLabel: "0.001 $U hire",
    },
    endpoints: {
      a2a: listing.a2a,
      mcp: null,
      agentUrl: listing.cardUrl,
    },
    verification: {
      level: listing.tokenId ? "schema_valid" : "registered",
      registered: true,
      schemaValid: true,
      live: Boolean(listing.a2a),
      livePending: false,
      schemaErrors: [],
      liveError: null,
      priceLabel: "0.001 $U hire",
      skills: ["hire"],
    },
  };
}

export function mergeCatalogWithMerchants(
  listed: MarketplaceAgent[],
  merchants: PublicMerchant[],
): MarketplaceAgent[] {
  const extra = merchants.map(merchantToCatalogAgent);
  const ids = new Set(listed.map((agent) => agent.agentId.toLowerCase()));
  const prepend = extra.filter(
    (agent) => !ids.has(agent.agentId.toLowerCase()),
  );
  return [
    ...prepend,
    ...listed.map((agent) => {
      const hit = extra.find(
        (item) => item.agentId.toLowerCase() === agent.agentId.toLowerCase(),
      );
      if (!hit) return agent;
      return { ...agent, erc8183Provider: hit.erc8183Provider };
    }),
  ];
}

export function findMerchant(
  merchants: PublicMerchant[],
  agentId: string,
): PublicMerchant | undefined {
  const needle = agentId.toLowerCase();
  return merchants.find(
    (item) =>
      item.agentId.toLowerCase() === needle ||
      (item.tokenId != null && item.tokenId === agentId),
  );
}
