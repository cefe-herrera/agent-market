import "server-only";

import { getHealthCard } from "@/app/lib/health/snapshot";
import { geminiJson, isGeminiConfigured } from "./client";
import { HEALTH_AGENT_ID } from "./ids";
import { HEALTH_SKILLS, formatSkillsForPrompt, skillIds } from "./skills";

export { HEALTH_AGENT_ID };

export type HealthRunInput = {
  task?: string | null;
  capital?: string | null;
  payer?: string | null;
  jobId?: string | null;
};

function fallbackHealth(input: HealthRunInput): Record<string, unknown> {
  return {
    category: "HEALTH_FACTOR_MONITORING",
    chain: "bsc",
    venue: "venus",
    executed: false,
    model: "fallback-static",
    capital: { asset: "U", amount: input.capital || "1000" },
    healthFactor: 1.72,
    action: "watch",
    moves: [],
    risks: ["BNB drawdown", "Venus CF change", "snapshot stale"],
    disclaimer:
      "Advisory only. Venus/Gemini missing so this is a static sleeve, not executed on-chain.",
    task: input.task ?? null,
    jobId: input.jobId ?? null,
  };
}

export async function runHealthGuard(
  input: HealthRunInput = {},
): Promise<Record<string, unknown>> {
  const card = await getHealthCard().catch(() => null);
  if (!isGeminiConfigured()) {
    return {
      ...fallbackHealth(input),
      card,
      skills: HEALTH_SKILLS,
      usedSkills: skillIds(HEALTH_SKILLS),
    };
  }

  const prompt = [
    "You are a BNB Chain (BSC) Venus loan-health agent.",
    "Category: HEALTH_FACTOR_MONITORING. Advisory only — do not claim you repaid Venus or added collateral.",
    "The snapshot position is a simulated sleeve (10 BNB collateral vs USDT debt), not a wallet read.",
    formatSkillsForPrompt(HEALTH_SKILLS),
    "Ground every number in this snapshot. If sources.venus.live is false, say the Venus feed is fallback.",
    JSON.stringify(card, null, 2),
    "HF >= 2 → action=hold. 1.5–2 → action=watch. < 1.5 → action=delever (repay USDT or add BNB).",
    "Return ONLY JSON with keys:",
    "category, chain, venue, executed (false), capital {asset, amount},",
    "healthFactor, liqPriceUsd, distancePct, action,",
    "moves [{from, to, weightBps, why, skill}], usedSkills[], risks[], nextCheckHours, disclaimer.",
    `Capital hint: ${input.capital || "1000 U"}.`,
    `User task: ${input.task || "Monitor Venus BNB/USDT health factor using CoinGecko collateral price (advisory, do not execute)."}`,
    input.payer ? `Payer (do not leak extra PII): ${input.payer}` : "",
    input.jobId ? `Job id: ${input.jobId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await geminiJson(prompt);
    return {
      ...json,
      category: "HEALTH_FACTOR_MONITORING",
      chain: json.chain ?? "bsc",
      venue: "venus",
      executed: false,
      model: "gemini",
      task: input.task ?? null,
      jobId: input.jobId ?? null,
      card,
      skills: HEALTH_SKILLS,
    };
  } catch (err) {
    const fallback = fallbackHealth(input);
    return {
      ...fallback,
      model: "fallback-after-gemini-error",
      error: err instanceof Error ? err.message : String(err),
      card,
      skills: HEALTH_SKILLS,
      usedSkills: skillIds(HEALTH_SKILLS),
    };
  }
}
