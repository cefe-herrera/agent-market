import "server-only";

import { getRebalanceCard } from "@/app/lib/rebalance/snapshot";
import { geminiJson, isGeminiConfigured } from "./client";
import { REBALANCE_AGENT_ID } from "./ids";
import {
  REBALANCE_SKILLS,
  formatSkillsForPrompt,
  skillIds,
} from "./skills";

export { REBALANCE_AGENT_ID };

export type RebalanceRunInput = {
  task?: string | null;
  capital?: string | null;
  payer?: string | null;
  jobId?: string | null;
};

function fallbackRebalance(input: RebalanceRunInput): Record<string, unknown> {
  return {
    category: "REBALANCING",
    chain: "bsc",
    executed: false,
    model: "fallback-static",
    capital: { asset: "U", amount: input.capital || "1000" },
    target: { bnbBps: 5000, usdtBps: 5000 },
    implied: { bnbBps: 5060, usdtBps: 4940 },
    driftBps: 60,
    action: "hold",
    trades: [],
    risks: ["price-oracle lag", "LP out of range", "snapshot stale"],
    disclaimer:
      "Advisory only. CoinGecko/Gemini missing so this is a static sleeve, not executed on-chain.",
    task: input.task ?? null,
    jobId: input.jobId ?? null,
  };
}

export async function runRebalancer(
  input: RebalanceRunInput = {},
): Promise<Record<string, unknown>> {
  const card = await getRebalanceCard().catch(() => null);
  if (!isGeminiConfigured()) {
    return {
      ...fallbackRebalance(input),
      card,
      skills: REBALANCE_SKILLS,
      usedSkills: skillIds(REBALANCE_SKILLS),
    };
  }

  const prompt = [
    "You are a BNB Chain (BSC) liquidity rebalancing agent.",
    "Category: REBALANCING. Advisory only — do not claim you moved funds or recentered an LP.",
    formatSkillsForPrompt(REBALANCE_SKILLS),
    "Ground every number in this CoinGecko snapshot. If sources.coingecko.live is false, say the feed is fallback.",
    JSON.stringify(card, null, 2),
    "Default sleeve is 50/50 BNB/USDT (or $U as the stable). CAKE is optional satellite < 10%. BTC is reference only.",
    "If |sleeve.driftBps| >= sleeve.thresholdBps, action=rebalance and propose trades in bps. Else action=hold.",
    "Return ONLY JSON with keys:",
    "category, chain, executed (false), capital {asset, amount}, target {bnbBps, usdtBps},",
    "implied {bnbBps, usdtBps}, driftBps, action, trades [{from, to, weightBps, why, skill}],",
    "usedSkills[], rangeNote, risks[], nextCheckHours, disclaimer.",
    `Capital hint: ${input.capital || "1000 U"}.`,
    `User task: ${input.task || "Keep a 50/50 BNB–USDT sleeve in range using CoinGecko prices."}`,
    input.payer ? `Payer (do not leak extra PII): ${input.payer}` : "",
    input.jobId ? `Job id: ${input.jobId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await geminiJson(prompt);
    return {
      ...json,
      category: "REBALANCING",
      chain: json.chain ?? "bsc",
      executed: false,
      model: "gemini",
      task: input.task ?? null,
      jobId: input.jobId ?? null,
      card,
      skills: REBALANCE_SKILLS,
    };
  } catch (err) {
    const fallback = fallbackRebalance(input);
    return {
      ...fallback,
      model: "fallback-after-gemini-error",
      error: err instanceof Error ? err.message : String(err),
      card,
      skills: REBALANCE_SKILLS,
      usedSkills: skillIds(REBALANCE_SKILLS),
    };
  }
}
