import type { MarketplaceAgent } from "@/app/lib/agents";
import { merchantMatchesId, type PublicMerchant } from "./types";

export function merchantToCatalogAgent(
  listing: PublicMerchant,
): MarketplaceAgent {
  return {
    id: listing.agentId,
    agentId: listing.agentId,
    name: listing.name,
    slug: listing.agentId,
    description: listing.description,
    shortDescription: listing.provider8183
      ? "Merchant · 8004 + Safe 7579"
      : "Merchant · ERC-8004",
    ownerWallet: listing.owner,
    agentWallet: listing.payTo,
    agentUri: listing.cardUrl,
    network: listing.chainId === 56 ? "BNB Chain" : "BSC Testnet",
    chainId: listing.chainId,
    isTestnet: listing.chainId === 97,
    protocols: listing.provider8183
      ? ["A2A", "x402", "ERC-8183"]
      : ["A2A", "x402", "ERC-8004"],
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
  const listedIds = new Set(listed.map((agent) => agent.agentId.toLowerCase()));
  const prepend = extra.filter((agent) => {
    const listing = merchants.find((item) => item.agentId === agent.agentId);
    const alias = listing?.catalogId?.toLowerCase();
    if (alias && listedIds.has(alias)) return false;
    return !listedIds.has(agent.agentId.toLowerCase());
  });
  return [
    ...prepend,
    ...listed.map((agent) => {
      const hit = merchants.find((item) =>
        merchantMatchesId(item, agent.agentId),
      );
      if (!hit) return agent;
      return {
        ...agent,
        verified: Boolean(hit.tokenId) || agent.verified,
        erc8183Provider: hit.provider8183 ?? agent.erc8183Provider,
        ownerWallet: hit.owner,
        agentWallet: hit.payTo,
        a2a: hit.a2a
          ? {
              endpoint: hit.a2a,
              healthy: true,
              status: "listed",
              skills: agent.a2a?.skills,
              x402Support: true,
              priceLabel: agent.a2a?.priceLabel ?? "0.001 $U hire",
            }
          : agent.a2a,
      };
    }),
  ];
}

export function findMerchant(
  merchants: PublicMerchant[],
  agentId: string,
): PublicMerchant | undefined {
  return merchants.find((item) => merchantMatchesId(item, agentId));
}
