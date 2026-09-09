import "server-only";

import { getGridCard } from "@/app/lib/grid/snapshot";
import { geminiJson, isGeminiConfigured } from "./client";
import { GRID_AGENT_ID } from "./ids";
import { GRID_SKILLS, formatSkillsForPrompt, skillIds } from "./skills";

export { GRID_AGENT_ID };

export type GridRunInput = {
  task?: string | null;
  capital?: string | null;
  payer?: string | null;
  jobId?: string | null;
};

function fallbackGrid(input: GridRunInput): Record<string, unknown> {
  return {
    category: "GRID_TRADING",
    chain: "bsc",
    venue: "aster",
    executed: false,
    model: "fallback-static",
    capital: { asset: "U", amount: input.capital || "1000" },
    pair: "BNB/USDT",
    action: "hold",
    orders: [],
    risks: ["funding flip", "mark-index basis", "snapshot stale"],
    disclaimer:
      "Advisory only. Aster/Gemini missing so this is a static grid, not executed on-chain.",
    task: input.task ?? null,
    jobId: input.jobId ?? null,
  };
}

export async function runGridTrader(
  input: GridRunInput = {},
): Promise<Record<string, unknown>> {
  const card = await getGridCard().catch(() => null);
  if (!isGeminiConfigured()) {
    return {
      ...fallbackGrid(input),
      card,
      skills: GRID_SKILLS,
      usedSkills: skillIds(GRID_SKILLS),
    };
  }

  const prompt = [
    "You are a BNB Chain (BSC) perpetual grid agent.",
    "Category: GRID_TRADING. Venue: Aster DEX (not GMX — GMX is not on BSC).",
    "Advisory only — do not claim you placed Aster orders or opened a GMX position.",
    formatSkillsForPrompt(GRID_SKILLS),
    "Ground every number in this snapshot. If sources.aster.live is false, say the perps feed is fallback.",
    JSON.stringify(card, null, 2),
    "Default pair is BNB/USDT. BTCUSDT is a reference market only.",
    "If grid.inRange, action=hold. If nextFill=buy, propose a long/buy at the lowest level. If nextFill=sell, propose a short/sell at the highest level.",
    "Return ONLY JSON with keys:",
    "category, chain, venue, executed (false), capital {asset, amount}, pair,",
    "mark, funding8h, action, orders [{side, price, sizeBps, why, skill}],",
    "usedSkills[], basisNote, risks[], nextCheckHours, disclaimer.",
    `Capital hint: ${input.capital || "1000 U"}.`,
    `User task: ${input.task || "Keep a BNB/USDT grid on Aster using live mark/funding and CoinGecko 24h bands."}`,
    input.payer ? `Payer (do not leak extra PII): ${input.payer}` : "",
    input.jobId ? `Job id: ${input.jobId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await geminiJson(prompt);
    return {
      ...json,
      category: "GRID_TRADING",
      chain: json.chain ?? "bsc",
      venue: "aster",
      executed: false,
      model: "gemini",
      task: input.task ?? null,
      jobId: input.jobId ?? null,
      card,
      skills: GRID_SKILLS,
    };
  } catch (err) {
    const fallback = fallbackGrid(input);
    return {
      ...fallback,
      model: "fallback-after-gemini-error",
      error: err instanceof Error ? err.message : String(err),
      card,
      skills: GRID_SKILLS,
      usedSkills: skillIds(GRID_SKILLS),
    };
  }
}
