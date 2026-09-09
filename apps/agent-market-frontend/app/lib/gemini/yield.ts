import "server-only";

import { getYieldCard } from "@/app/lib/yield/snapshot";
import { geminiJson, isGeminiConfigured } from "./client";
import { YIELD_AGENT_ID } from "./ids";

export { YIELD_AGENT_ID };

export type YieldRunInput = {
  task?: string | null;
  capital?: string | null;
  payer?: string | null;
  jobId?: string | null;
};

const VENUES = [
  "Venus (USDT / $U isolated)",
  "PancakeSwap stable LP (USDT-USDC)",
  "Lista DAO lisUSD",
  "Kinza / Lista lending",
  "BNB liquid staking (Aave BNB / Lista slisBNB) only as a satellite sleeve",
];

function fallbackYield(input: YieldRunInput): Record<string, unknown> {
  return {
    category: "YIELD_OPTIMISATION",
    chain: "bsc",
    executed: false,
    model: "fallback-static",
    capital: { asset: "U", amount: input.capital || "1000" },
    blendedApr: "5.4",
    allocations: [
      {
        venue: "Venus USDT",
        weightBps: 4500,
        apr: "4.8",
        why: "Base lending sleeve, liquid, first-class on BSC.",
      },
      {
        venue: "PancakeSwap USDT-USDC LP",
        weightBps: 3500,
        apr: "6.1",
        why: "Stable LP yield; keep IL risk in the stable box.",
      },
      {
        venue: "Lista lisUSD",
        weightBps: 2000,
        apr: "5.9",
        why: "Satellite; cap size until you trust the oracle path.",
      },
    ],
    risks: ["smart-contract", "stable-depeg", "APR snapshot stale"],
    disclaimer:
      "Advisory only. GEMINI_API_KEY missing so this is a static sleeve, not executed on-chain.",
    task: input.task ?? null,
    jobId: input.jobId ?? null,
  };
}

export async function runYieldOptimiser(
  input: YieldRunInput = {},
): Promise<Record<string, unknown>> {
  const card = await getYieldCard().catch(() => null);
  if (!isGeminiConfigured()) {
    return {
      ...fallbackYield(input),
      card,
    };
  }

  const prompt = [
    "You are a BNB Chain (BSC) DeFi yield-routing agent.",
    "Category: YIELD_OPTIMISATION. Advisory only — do not claim you moved funds.",
    "Ground allocations in this live snapshot (Venus API, GeckoTerminal Pancake V3 volume, Lista simulated 7-11%):",
    JSON.stringify(card, null, 2),
    "Prefer these venues:",
    ...VENUES.map((v) => `- ${v}`),
    "Pancake APR is a volume×fee/TVL estimate, not guaranteed LP return.",
    "Lista slisBNB is simulated in the 7–11% band — do not treat it as an on-chain read.",
    "Weights must sum to 10000 bps. Use $U / USDT / BNB as the capital box.",
    "Return ONLY JSON with keys:",
    "category, chain, executed (false), capital {asset, amount}, blendedApr,",
    "allocations [{venue, weightBps, apr, why}], risks[], nextCheckHours, disclaimer.",
    `Capital hint: ${input.capital || "1000 U"}.`,
    `User task: ${input.task || "Route idle stablecoins to the highest available APR on BSC with conservative risk."}`,
    input.payer ? `Payer (do not leak extra PII): ${input.payer}` : "",
    input.jobId ? `Job id: ${input.jobId}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const json = await geminiJson(prompt);
    return {
      ...json,
      category: "YIELD_OPTIMISATION",
      chain: json.chain ?? "bsc",
      executed: false,
      model: "gemini",
      task: input.task ?? null,
      jobId: input.jobId ?? null,
      card,
    };
  } catch (err) {
    const fallback = fallbackYield(input);
    return {
      ...fallback,
      model: "fallback-after-gemini-error",
      error: err instanceof Error ? err.message : String(err),
      card,
    };
  }
}
