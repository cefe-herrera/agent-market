import type { Address } from "viem";
import type { AgentUriMode } from "./agent-uri";

export type PublicMerchant = {
  agentId: string;
  chainId: number;
  tokenId: string | null;
  owner: Address;
  name: string;
  description: string;
  payTo: Address;
  provider8183: Address | null;
  sessionAddress: Address | null;
  a2a: string | null;
  cardUrl: string | null;
  createdAt: number;
  /** Stable catalog slug (e.g. bsc-yield-optimizer-01). agentId stays this after mint. */
  catalogId?: string | null;
  caipAgentId?: string | null;
  uriMode?: AgentUriMode | null;
};

export type LocalMerchant = PublicMerchant & {
  grantTx?: string | null;
};

export function merchantMatchesId(
  listing: PublicMerchant,
  agentId: string | null | undefined,
): boolean {
  if (!agentId) return false;
  const needle = decodeURIComponent(agentId).toLowerCase();
  return (
    listing.agentId.toLowerCase() === needle ||
    listing.catalogId?.toLowerCase() === needle ||
    listing.caipAgentId?.toLowerCase() === needle ||
    listing.tokenId === agentId
  );
}
