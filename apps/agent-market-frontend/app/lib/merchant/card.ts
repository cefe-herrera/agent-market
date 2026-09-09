import { getAddress, type Address } from "viem";
import { frontendBscChainId } from "@/app/lib/network";
import { YIELD_SKILLS } from "@/app/lib/gemini/skills";
import { YIELD_AGENT_ID } from "@/app/lib/gemini/ids";
import { x402PaymentConfig } from "@/app/lib/x402-usdc";
import type { PublicMerchant } from "./types";

export function buildMerchantCard(input: {
  name: string;
  description: string;
  owner: Address;
  payTo: Address;
  provider8183?: Address | null;
  sessionAddress?: Address | null;
  a2a?: string | null;
  chainId?: number;
  tokenId?: string | null;
  registry?: Address | null;
  resourceUrl?: string | null;
  catalogId?: string | null;
  category?: string | null;
}): Record<string, unknown> {
  const x402 = x402PaymentConfig();
  const chainId = input.chainId ?? frontendBscChainId();
  const a2a = input.a2a?.trim() || input.resourceUrl || "";
  const yieldLike = input.catalogId === YIELD_AGENT_ID;
  const skills = yieldLike
    ? YIELD_SKILLS.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        tags: skill.tags,
      }))
    : [
        {
          id: "hire",
          name: "Marketplace hire",
          description: input.description,
          tags: ["x402", "erc-8183"],
        },
      ];
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: input.name,
    description: input.description,
    image: "",
    protocolVersion: "0.3.0",
    url: a2a || undefined,
    owner: getAddress(input.owner),
    capabilities: { x402: true },
    skills,
    services: [
      ...(a2a
        ? [
            { name: "x402", endpoint: a2a, version: "1" },
            { name: "web", endpoint: a2a, version: "1.0.0" },
            { name: "A2A", endpoint: a2a, version: "1" },
          ]
        : []),
    ],
    x402: {
      network: x402.network,
      asset: x402.token,
      payTo: getAddress(input.payTo),
      scheme: "exact",
    },
    ...(input.provider8183
      ? {
          erc8183: {
            provider: getAddress(input.provider8183),
            chainId,
            ...(input.sessionAddress
              ? { session: getAddress(input.sessionAddress) }
              : {}),
          },
        }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.catalogId ? { agentId: input.catalogId } : {}),
    registrations:
      input.tokenId && input.registry
        ? [
            {
              agentId: Number(input.tokenId),
              agentRegistry: `eip155:${chainId}:${getAddress(input.registry)}`,
            },
          ]
        : [],
  };
}

export function cardToDataUri(card: Record<string, unknown>): string {
  return `data:application/json;utf8,${encodeURIComponent(JSON.stringify(card))}`;
}

export function merchantCardFromListing(
  listing: PublicMerchant,
  resourceUrl?: string | null,
): Record<string, unknown> {
  return buildMerchantCard({
    name: listing.name,
    description: listing.description,
    owner: listing.owner,
    payTo: listing.payTo,
    provider8183: listing.provider8183,
    sessionAddress: listing.sessionAddress,
    a2a: listing.a2a,
    chainId: listing.chainId,
    tokenId: listing.tokenId,
    resourceUrl,
    catalogId: listing.catalogId,
  });
}
