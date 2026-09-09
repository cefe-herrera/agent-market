import { X402_PAY_TO } from "@/app/lib/x402-usdc";
import { frontendBscChainId, frontendNetworkMode } from "@/app/lib/network";
import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  YIELD_AGENT_ID,
  YIELD_AGENT_NAME,
  GEMINI_AGENT_IDS,
  isGeminiAgentId,
} from "./ids";

export {
  YIELD_AGENT_ID,
  YIELD_AGENT_NAME,
  GEMINI_AGENT_IDS,
  isGeminiAgentId,
};
export type { GeminiAgentId } from "./ids";

export function geminiAgentName(agentId?: string | null): string | null {
  if (isGeminiAgentId(agentId)) return YIELD_AGENT_NAME;
  return null;
}

export function geminiMarketplaceAgents(): MarketplaceAgent[] {
  const chainId = frontendBscChainId();
  const testnet = frontendNetworkMode() === "testnet";
  return [
    {
      id: YIELD_AGENT_ID,
      agentId: YIELD_AGENT_ID,
      name: YIELD_AGENT_NAME,
      slug: "alpha-yield-router",
      description:
        "Yield router on BSC: Venus supply APY, PancakeSwap V3 fee APR from GeckoTerminal volume, Lista staking band. Advisory — does not move funds until 7579 batch.",
      shortDescription: "Yield optimisation · live venues",
      ownerWallet: X402_PAY_TO,
      agentWallet: X402_PAY_TO,
      agentUri: `/api/agent/resource?seller=${YIELD_AGENT_ID}`,
      network: testnet ? "BSC Testnet" : "BNB Chain",
      chainId,
      isTestnet: testnet,
      protocols: ["x402", "gemini", "ERC-8183", "ERC-7579"],
      supportedAssets: ["U"],
      verified: true,
      a2a: {
        endpoint: `/api/agent/resource?seller=${YIELD_AGENT_ID}`,
        healthy: true,
        status: "gemini",
        skills: ["yield"],
        x402Support: true,
        priceLabel: "0.001 $U hire",
      },
      endpoints: {
        a2a: `/api/agent/yield`,
        mcp: null,
      },
      verification: {
        level: "live",
        registered: true,
        schemaValid: true,
        live: true,
        livePending: false,
        schemaErrors: [],
        liveError: null,
        priceLabel: "0.001 $U hire",
        skills: ["yield"],
      },
    },
  ];
}
