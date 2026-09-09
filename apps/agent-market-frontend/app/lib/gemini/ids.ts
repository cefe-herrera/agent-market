export const YIELD_AGENT_ID = "bsc-yield-optimizer-01";
export const YIELD_AGENT_ALIAS_IDS = ["demo:yield"] as const;

export const GEMINI_AGENT_IDS = [
  YIELD_AGENT_ID,
  ...YIELD_AGENT_ALIAS_IDS,
] as const;
export type GeminiAgentId = (typeof GEMINI_AGENT_IDS)[number];

export function isGeminiAgentId(value?: string | null): value is GeminiAgentId {
  return Boolean(value && GEMINI_AGENT_IDS.includes(value as GeminiAgentId));
}

export const YIELD_AGENT_NAME = "AlphaYield Autonomous Router";
export const YIELD_AGENT_CATEGORY = "Yield Optimisation";
