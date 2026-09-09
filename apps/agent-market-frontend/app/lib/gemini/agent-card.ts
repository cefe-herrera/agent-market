import type { AgentCardPreview } from "@/app/lib/agent-card";
import { frontendBscChainId } from "@/app/lib/network";
import { identityRegistry } from "@/app/lib/erc8004";
import {
  X402_PAY_TO,
  X402_PAYMENT_USDC,
  x402PaymentConfig,
} from "@/app/lib/x402-usdc";
import {
  YIELD_AGENT_CATEGORY,
  YIELD_AGENT_ID,
  YIELD_AGENT_NAME,
  REBALANCE_AGENT_CATEGORY,
  REBALANCE_AGENT_ID,
  REBALANCE_AGENT_NAME,
  GRID_AGENT_CATEGORY,
  GRID_AGENT_ID,
  GRID_AGENT_NAME,
  HEALTH_AGENT_CATEGORY,
  HEALTH_AGENT_ID,
  HEALTH_AGENT_NAME,
  geminiAgentKind,
  yieldCardPath,
  yieldHirePath,
  yieldSnapshotPath,
  rebalanceCardPath,
  rebalanceHirePath,
  rebalanceSnapshotPath,
  gridCardPath,
  gridHirePath,
  gridSnapshotPath,
  healthCardPath,
  healthHirePath,
  healthSnapshotPath,
  type GeminiAgentKind,
} from "./ids";
import {
  GRID_SKILLS,
  HEALTH_SKILLS,
  REBALANCE_SKILLS,
  YIELD_SKILLS,
  skillsForKind,
  type PromptSkill,
} from "./skills";

export type YieldCardOverlay = {
  tokenId?: string | null;
  owner?: string | null;
  payTo?: string | null;
  provider8183?: string | null;
  skills?: PromptSkill[];
};

type CardSpec = {
  name: string;
  description: string;
  category: string;
  agentId: string;
  hire: string;
  cardUrl: string;
  snapshot: string;
  skills: PromptSkill[];
  provider: string;
};

function specFor(
  kind: GeminiAgentKind,
  origin: string | undefined,
  overlay: YieldCardOverlay,
): CardSpec {
  if (kind === "health") {
    return {
      name: HEALTH_AGENT_NAME,
      description:
        "Venus loan health on BSC. Collateral factor and CoinGecko BNB price are declared here and injected into Gemini as prompt policy — advisory, not executed.",
      category: HEALTH_AGENT_CATEGORY,
      agentId: HEALTH_AGENT_ID,
      hire: abs(origin, healthHirePath()),
      cardUrl: abs(origin, healthCardPath()),
      snapshot: abs(origin, healthSnapshotPath()),
      skills: overlay.skills ?? HEALTH_SKILLS,
      provider: "VenusGuard",
    };
  }
  if (kind === "grid") {
    return {
      name: GRID_AGENT_NAME,
      description:
        "Perpetual grid on BSC via Aster DEX. Mark, funding and CoinGecko 24h bands are declared here and injected into Gemini as prompt policy — advisory, not executed.",
      category: GRID_AGENT_CATEGORY,
      agentId: GRID_AGENT_ID,
      hire: abs(origin, gridHirePath()),
      cardUrl: abs(origin, gridCardPath()),
      snapshot: abs(origin, gridSnapshotPath()),
      skills: overlay.skills ?? GRID_SKILLS,
      provider: "GridPilot",
    };
  }
  if (kind === "rebalance") {
    return {
      name: REBALANCE_AGENT_NAME,
      description:
        "Liquidity rebalancing on BSC. CoinGecko spot and 24h drift are declared here and injected into Gemini as prompt policy — advisory, not executed.",
      category: REBALANCE_AGENT_CATEGORY,
      agentId: REBALANCE_AGENT_ID,
      hire: abs(origin, rebalanceHirePath()),
      cardUrl: abs(origin, rebalanceCardPath()),
      snapshot: abs(origin, rebalanceSnapshotPath()),
      skills: overlay.skills ?? REBALANCE_SKILLS,
      provider: "RangeKeeper",
    };
  }
  return {
    name: YIELD_AGENT_NAME,
    description:
      "Yield optimisation on BSC. Skills are declared here and injected into Gemini as prompt policy — advisory, not executed.",
    category: YIELD_AGENT_CATEGORY,
    agentId: YIELD_AGENT_ID,
    hire: abs(origin, yieldHirePath()),
    cardUrl: abs(origin, yieldCardPath()),
    snapshot: abs(origin, yieldSnapshotPath()),
    skills: overlay.skills ?? YIELD_SKILLS,
    provider: "AlphaYield",
  };
}

function buildAgentCard(
  kind: GeminiAgentKind,
  origin?: string,
  overlay: YieldCardOverlay = {},
): Record<string, unknown> {
  const x402 = x402PaymentConfig();
  const chainId = frontendBscChainId();
  const spec = specFor(kind, origin, overlay);
  const payTo = overlay.payTo || X402_PAY_TO;
  const owner = overlay.owner || payTo;
  const tokenId = overlay.tokenId?.trim() || "";
  const minted = Boolean(tokenId);
  const registry = identityRegistry(chainId);
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: spec.name,
    description: spec.description,
    protocolVersion: "0.3.0",
    url: spec.hire,
    owner,
    capabilities: { x402: true, streaming: false },
    skills: spec.skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      tags: skill.tags,
    })),
    services: [
      { name: "x402", endpoint: spec.hire, version: "1" },
      { name: "A2A", endpoint: spec.hire, version: "1" },
      { name: "web", endpoint: spec.snapshot, version: "1.0.0" },
    ],
    x402: {
      network: x402.network,
      asset: x402.token,
      payTo,
      scheme: "exact",
      priceLabel: `${X402_PAYMENT_USDC} $U hire`,
    },
    ...(overlay.provider8183
      ? { erc8183: { provider: overlay.provider8183, chainId } }
      : {}),
    category: spec.category,
    agentId: spec.agentId,
    chainId,
    reputation: {
      minted,
      tokenId: minted ? tokenId : null,
      modality: "gemini-skill-prompt",
    },
    registrations: minted
      ? [
          {
            agentId: Number(tokenId),
            agentRegistry: `eip155:${chainId}:${registry}`,
          },
        ]
      : [],
    documentationUrl: spec.cardUrl,
  };
}

export function yieldAgentCard(
  origin?: string,
  overlay: YieldCardOverlay = {},
): Record<string, unknown> {
  return buildAgentCard("yield", origin, overlay);
}

export function rebalanceAgentCard(
  origin?: string,
  overlay: YieldCardOverlay = {},
): Record<string, unknown> {
  return buildAgentCard("rebalance", origin, overlay);
}

export function gridAgentCard(
  origin?: string,
  overlay: YieldCardOverlay = {},
): Record<string, unknown> {
  return buildAgentCard("grid", origin, overlay);
}

export function healthAgentCard(
  origin?: string,
  overlay: YieldCardOverlay = {},
): Record<string, unknown> {
  return buildAgentCard("health", origin, overlay);
}

export function geminiAgentCardPreview(
  agentId: string,
  origin?: string,
  overlay: YieldCardOverlay = {},
): AgentCardPreview | null {
  const kind = geminiAgentKind(agentId);
  if (!kind) return null;
  const spec = specFor(kind, origin, overlay);
  const card = buildAgentCard(kind, origin, overlay);
  const skills = skillsForKind(kind).map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    tags: skill.tags,
  }));
  return {
    sourceUrl: spec.cardUrl,
    name: spec.name,
    description: spec.description,
    endpoint: spec.hire,
    provider: spec.provider,
    documentationUrl: spec.cardUrl,
    x402: true,
    erc8183Provider: overlay.provider8183 ?? null,
    protocolVersion: "0.3.0",
    preferredTransport: "http",
    skills,
    interfaces: [
      { transport: "x402", url: spec.hire },
      { transport: "http", url: spec.snapshot },
    ],
    card,
  };
}

function abs(origin: string | undefined, path: string): string {
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}
