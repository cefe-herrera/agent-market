import {
  agentCardPath,
  agentGridApiPath,
  agentHealthApiPath,
  agentRebalanceApiPath,
  agentYieldApiPath,
  hireApiPathWithSeller,
} from "@/app/lib/env-routes";

export const YIELD_AGENT_ID = "bsc-yield-optimizer-01";
export const YIELD_AGENT_ALIAS_IDS = ["demo:yield"] as const;

export const REBALANCE_AGENT_ID = "bsc-rebalancer-01";
export const REBALANCE_AGENT_ALIAS_IDS = ["demo:rebalance"] as const;

export const GRID_AGENT_ID = "bsc-grid-trader-01";
export const GRID_AGENT_ALIAS_IDS = ["demo:grid"] as const;

export const HEALTH_AGENT_ID = "bsc-health-guard-01";
export const HEALTH_AGENT_ALIAS_IDS = ["demo:health"] as const;

export const GEMINI_AGENT_IDS = [
  YIELD_AGENT_ID,
  ...YIELD_AGENT_ALIAS_IDS,
  REBALANCE_AGENT_ID,
  ...REBALANCE_AGENT_ALIAS_IDS,
  GRID_AGENT_ID,
  ...GRID_AGENT_ALIAS_IDS,
  HEALTH_AGENT_ID,
  ...HEALTH_AGENT_ALIAS_IDS,
] as const;
export type GeminiAgentId = (typeof GEMINI_AGENT_IDS)[number];
export type GeminiAgentKind = "yield" | "rebalance" | "grid" | "health";

export function isGeminiAgentId(value?: string | null): value is GeminiAgentId {
  return Boolean(value && GEMINI_AGENT_IDS.includes(value as GeminiAgentId));
}

function matches(
  value: string | null | undefined,
  id: string,
  aliases: readonly string[],
): boolean {
  return value === id || aliases.includes(value ?? "");
}

export function isYieldAgentId(value?: string | null): boolean {
  return matches(value, YIELD_AGENT_ID, YIELD_AGENT_ALIAS_IDS);
}

export function isRebalanceAgentId(value?: string | null): boolean {
  return matches(value, REBALANCE_AGENT_ID, REBALANCE_AGENT_ALIAS_IDS);
}

export function isGridAgentId(value?: string | null): boolean {
  return matches(value, GRID_AGENT_ID, GRID_AGENT_ALIAS_IDS);
}

export function isHealthAgentId(value?: string | null): boolean {
  return matches(value, HEALTH_AGENT_ID, HEALTH_AGENT_ALIAS_IDS);
}

/** Yield is never the default for an unknown Gemini id. */
export function geminiAgentKind(
  value?: string | null,
): GeminiAgentKind | null {
  if (isHealthAgentId(value)) return "health";
  if (isGridAgentId(value)) return "grid";
  if (isRebalanceAgentId(value)) return "rebalance";
  if (isYieldAgentId(value)) return "yield";
  return null;
}

export const YIELD_AGENT_NAME = "AlphaYield Autonomous Router";
export const YIELD_AGENT_CATEGORY = "Yield Optimisation";

export const REBALANCE_AGENT_NAME = "RangeKeeper Liquidity Rebalancer";
export const REBALANCE_AGENT_CATEGORY = "Rebalancing";

export const GRID_AGENT_NAME = "GridPilot Aster Perps";
export const GRID_AGENT_CATEGORY = "Grid Trading";

export const HEALTH_AGENT_NAME = "VenusGuard Loan Sentinel";
export const HEALTH_AGENT_CATEGORY = "Health Factor";

export function geminiCardPath(agentId: string): string {
  return agentCardPath(agentId);
}

export function geminiHirePath(agentId: string): string {
  return hireApiPathWithSeller(agentId);
}

export function yieldCardPath(agentId: string = YIELD_AGENT_ID): string {
  return geminiCardPath(agentId);
}

export function yieldHirePath(agentId: string = YIELD_AGENT_ID): string {
  return geminiHirePath(agentId);
}

export function yieldSnapshotPath(): string {
  return agentYieldApiPath();
}

export function rebalanceCardPath(
  agentId: string = REBALANCE_AGENT_ID,
): string {
  return geminiCardPath(agentId);
}

export function rebalanceHirePath(
  agentId: string = REBALANCE_AGENT_ID,
): string {
  return geminiHirePath(agentId);
}

export function rebalanceSnapshotPath(): string {
  return agentRebalanceApiPath();
}

export function gridCardPath(agentId: string = GRID_AGENT_ID): string {
  return geminiCardPath(agentId);
}

export function gridHirePath(agentId: string = GRID_AGENT_ID): string {
  return geminiHirePath(agentId);
}

export function gridSnapshotPath(): string {
  return agentGridApiPath();
}

export function healthCardPath(agentId: string = HEALTH_AGENT_ID): string {
  return geminiCardPath(agentId);
}

export function healthHirePath(agentId: string = HEALTH_AGENT_ID): string {
  return geminiHirePath(agentId);
}

export function healthSnapshotPath(): string {
  return agentHealthApiPath();
}
