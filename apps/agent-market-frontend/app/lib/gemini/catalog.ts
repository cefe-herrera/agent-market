import { X402_PAY_TO } from "@/app/lib/x402-usdc";
import { frontendBscChainId, frontendNetworkMode } from "@/app/lib/network";
import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  YIELD_AGENT_ID,
  YIELD_AGENT_NAME,
  REBALANCE_AGENT_ID,
  REBALANCE_AGENT_NAME,
  GRID_AGENT_ID,
  GRID_AGENT_NAME,
  HEALTH_AGENT_ID,
  HEALTH_AGENT_NAME,
  GEMINI_AGENT_IDS,
  geminiAgentKind,
  isGeminiAgentId,
  isYieldAgentId,
  isRebalanceAgentId,
  isGridAgentId,
  isHealthAgentId,
  geminiCardPath,
  geminiHirePath,
} from "./ids";
import {
  GRID_SKILLS,
  HEALTH_SKILLS,
  REBALANCE_SKILLS,
  YIELD_SKILLS,
  skillIds,
} from "./skills";

export {
  YIELD_AGENT_ID,
  YIELD_AGENT_NAME,
  REBALANCE_AGENT_ID,
  REBALANCE_AGENT_NAME,
  GRID_AGENT_ID,
  GRID_AGENT_NAME,
  HEALTH_AGENT_ID,
  HEALTH_AGENT_NAME,
  GEMINI_AGENT_IDS,
  isGeminiAgentId,
  isYieldAgentId,
  isRebalanceAgentId,
  isGridAgentId,
  isHealthAgentId,
  geminiAgentKind,
};
export type { GeminiAgentId, GeminiAgentKind } from "./ids";

export function geminiAgentName(agentId?: string | null): string | null {
  const kind = geminiAgentKind(agentId);
  if (kind === "health") return HEALTH_AGENT_NAME;
  if (kind === "grid") return GRID_AGENT_NAME;
  if (kind === "rebalance") return REBALANCE_AGENT_NAME;
  if (kind === "yield") return YIELD_AGENT_NAME;
  return null;
}

function baseAgent(
  opts: {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    skills: string[];
  },
): MarketplaceAgent {
  const chainId = frontendBscChainId();
  const testnet = frontendNetworkMode() === "testnet";
  return {
    id: opts.id,
    agentId: opts.id,
    name: opts.name,
    slug: opts.slug,
    description: opts.description,
    shortDescription: opts.shortDescription,
    ownerWallet: X402_PAY_TO,
    agentWallet: X402_PAY_TO,
    agentUri: geminiCardPath(opts.id),
    network: testnet ? "BSC Testnet" : "BNB Chain",
    chainId,
    isTestnet: testnet,
    protocols: ["x402", "gemini", "ERC-8183", "ERC-7579"],
    supportedAssets: ["U"],
    verified: true,
    a2a: {
      endpoint: geminiHirePath(opts.id),
      healthy: true,
      status: "gemini",
      skills: opts.skills,
      x402Support: true,
      priceLabel: "0.001 $U hire",
    },
    endpoints: {
      a2a: geminiCardPath(opts.id),
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
      skills: opts.skills,
    },
  };
}

export function yieldMarketplaceAgents(): MarketplaceAgent[] {
  return [
    baseAgent({
      id: YIELD_AGENT_ID,
      name: YIELD_AGENT_NAME,
      slug: "alpha-yield-router",
      description:
        "Yield router on BSC: Venus supply APY, PancakeSwap V3 fee APR from GeckoTerminal volume, Lista staking band. Advisory — does not move funds until 7579 batch.",
      shortDescription: "Yield optimisation · live venues",
      skills: skillIds(YIELD_SKILLS),
    }),
  ];
}

export function rebalanceMarketplaceAgents(): MarketplaceAgent[] {
  return [
    baseAgent({
      id: REBALANCE_AGENT_ID,
      name: REBALANCE_AGENT_NAME,
      slug: "rangekeeper-rebalancer",
      description:
        "Liquidity rebalancer on BSC. CoinGecko spot + 24h drift for a 50/50 BNB–USDT sleeve. Advisory — does not recenter LPs until 7579 batch.",
      shortDescription: "Rebalancing · CoinGecko",
      skills: skillIds(REBALANCE_SKILLS),
    }),
  ];
}

export function gridMarketplaceAgents(): MarketplaceAgent[] {
  return [
    baseAgent({
      id: GRID_AGENT_ID,
      name: GRID_AGENT_NAME,
      slug: "gridpilot-aster",
      description:
        "Perpetual grid on BSC via Aster DEX (mark, funding, 24h range) plus CoinGecko spot bands. Advisory — does not place Aster orders until 7579 batch.",
      shortDescription: "Grid trading · Aster perps",
      skills: skillIds(GRID_SKILLS),
    }),
  ];
}

export function healthMarketplaceAgents(): MarketplaceAgent[] {
  return [
    baseAgent({
      id: HEALTH_AGENT_ID,
      name: HEALTH_AGENT_NAME,
      slug: "venusguard-health",
      description:
        "Venus loan health on BSC. Collateral factor + CoinGecko BNB price → health factor and liquidation distance. Advisory — does not repay until 7579 batch.",
      shortDescription: "Health factor · Venus",
      skills: skillIds(HEALTH_SKILLS),
    }),
  ];
}

export function geminiMarketplaceAgents(): MarketplaceAgent[] {
  return [
    ...rebalanceMarketplaceAgents(),
    ...yieldMarketplaceAgents(),
    ...gridMarketplaceAgents(),
    ...healthMarketplaceAgents(),
  ];
}
