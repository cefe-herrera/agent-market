import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  isGridAgentId,
  isHealthAgentId,
  isRebalanceAgentId,
  isYieldAgentId,
} from "@/app/lib/gemini/catalog";
import type { CATEGORIES } from "@/app/lib/i18n";

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_AGENT_IDS: Record<CategoryId, string> = {
  YIELD_OPTIMISATION: "bsc-yield-optimizer-01",
  REBALANCING: "bsc-rebalancer-01",
  GRID_TRADING: "bsc-grid-trader-01",
  HEALTH_FACTOR_MONITORING: "bsc-health-guard-01",
};

export type CatalogSummary = {
  agents: MarketplaceAgent[];
  stats: {
    agents: number;
    categories: number;
    chains: number;
    protocols: number;
    activeAgents: number;
    agentsHint: string | null;
    chainsHint: string | null;
    protocolsHint: string | null;
  };
  categoryCounts: Record<CategoryId, number>;
  featured: MarketplaceAgent[];
};

export type AgentDisplayMeta = {
  strategy: string;
  risk: "low" | "medium" | "high";
  apyLabel: string | null;
  categoryId: CategoryId | null;
};

const BASELINE_KEY = "agent-catalog-baseline-v1";

function agentCategoryId(agentId: string): CategoryId | null {
  if (isYieldAgentId(agentId)) return "YIELD_OPTIMISATION";
  if (isRebalanceAgentId(agentId)) return "REBALANCING";
  if (isGridAgentId(agentId)) return "GRID_TRADING";
  if (isHealthAgentId(agentId)) return "HEALTH_FACTOR_MONITORING";
  return null;
}

function isActiveAgent(agent: MarketplaceAgent): boolean {
  return Boolean(
    agent.verification?.live ||
      agent.a2a?.healthy ||
      agent.verified,
  );
}

function agentsDeltaHint(total: number, lang: "en" | "es"): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    if (!raw) {
      localStorage.setItem(
        BASELINE_KEY,
        JSON.stringify({ count: total, at: Date.now() }),
      );
      return null;
    }
    const baseline = JSON.parse(raw) as { count: number; at: number };
    const delta = total - baseline.count;
    if (delta > 0) {
      return lang === "es"
        ? `+${delta} desde tu 1ª visita`
        : `+${delta} since first visit`;
    }
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - baseline.at > weekMs) {
      localStorage.setItem(
        BASELINE_KEY,
        JSON.stringify({ count: total, at: Date.now() }),
      );
    }
    return null;
  } catch {
    return null;
  }
}

export function countAgentsByCategory(
  agents: MarketplaceAgent[],
): Record<CategoryId, number> {
  const counts: Record<CategoryId, number> = {
    YIELD_OPTIMISATION: 0,
    REBALANCING: 0,
    GRID_TRADING: 0,
    HEALTH_FACTOR_MONITORING: 0,
  };
  for (const agent of agents) {
    const category = agentCategoryId(agent.agentId);
    if (category) counts[category] += 1;
  }
  return counts;
}

export function getAgentDisplayMeta(agent: MarketplaceAgent): AgentDisplayMeta {
  const categoryId = agentCategoryId(agent.agentId);
  const strategy =
    agent.shortDescription.split("·")[0]?.trim() ||
    agent.shortDescription ||
    "DeFi agent";

  const riskByCategory: Record<CategoryId, AgentDisplayMeta["risk"]> = {
    YIELD_OPTIMISATION: "medium",
    REBALANCING: "low",
    GRID_TRADING: "high",
    HEALTH_FACTOR_MONITORING: "low",
  };

  const apyByCategory: Partial<Record<CategoryId, string>> = {
    YIELD_OPTIMISATION: "7–24% APY",
    REBALANCING: "Drift advisory",
    GRID_TRADING: "Funding + bands",
    HEALTH_FACTOR_MONITORING: "HF monitor",
  };

  return {
    strategy,
    risk: categoryId ? riskByCategory[categoryId] : "medium",
    apyLabel: categoryId ? (apyByCategory[categoryId] ?? null) : null,
    categoryId,
  };
}

export function buildCatalogSummary(
  agents: MarketplaceAgent[],
  lang: "en" | "es",
): CatalogSummary {
  const chains = new Set(agents.map((agent) => agent.network)).size;
  const protocols = new Set(agents.flatMap((agent) => agent.protocols)).size;
  const activeAgents = agents.filter(isActiveAgent).length;
  const deltaHint = agentsDeltaHint(agents.length, lang);

  const agentsHint =
    deltaHint ??
    (activeAgents > 0
      ? lang === "es"
        ? `${activeAgents} activos`
        : `${activeAgents} active`
      : null);

  const chainsHint =
    chains === 1
      ? lang === "es"
        ? "BNB activa"
        : "BNB live"
      : lang === "es"
        ? `${chains} activas`
        : `${chains} live`;

  const protocolsHint =
    protocols > 0
      ? lang === "es"
        ? `${protocols} integrados`
        : `${protocols} integrated`
      : null;

  return {
    agents,
    stats: {
      agents: agents.length,
      categories: 4,
      chains: Math.max(chains, 1),
      protocols: Math.max(protocols, 1),
      activeAgents,
      agentsHint,
      chainsHint,
      protocolsHint,
    },
    categoryCounts: countAgentsByCategory(agents),
    featured: agents.slice(0, 4),
  };
}

export function agentFocusHref(agentId: string): string {
  return `/?focus=${encodeURIComponent(agentId)}#mercado`;
}
