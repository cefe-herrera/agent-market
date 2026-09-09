import "server-only";

import { YIELD_AGENT_ID, YIELD_AGENT_NAME } from "@/app/lib/gemini/ids";
import type { YieldCardPayload, YieldVenueQuote } from "./types";
import {
  fetchPancakeV3Estimates,
  fetchVenusStables,
  simulateListaApy,
} from "./venues";

const CACHE_MS = 45_000;

let cached: { at: number; payload: YieldCardPayload } | null = null;

function fmtPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

function fallbackCard(now = new Date()): YieldCardPayload {
  return {
    agent_id: YIELD_AGENT_ID,
    name: YIELD_AGENT_NAME,
    category: "Yield Optimisation",
    standards: ["ERC-8183", "ERC-7579"],
    metrics: {
      current_strategy: "Venus USDT Supply",
      current_apy: "7.45%",
      target_strategy: "PancakeSwap USDT/BNB V3 LP",
      target_apr: "24.12%",
      status: "Re-routing Pending (A2A Healthy)",
    },
    action_trigger: "Batch Optimize via ERC-7579",
    updatedAt: now.toISOString(),
    sources: {
      venus: { live: false, quotes: [] },
      pancake: { live: false, quotes: [] },
      lista: { live: false, quotes: [simulateListaApy(now.getTime())] },
    },
  };
}

function preferUsdtBnb(quotes: YieldVenueQuote[]): YieldVenueQuote | null {
  if (quotes.length === 0) return null;
  const usdtBnb = quotes.find((quote) => {
    const n = quote.symbol.toUpperCase();
    return n.includes("USDT") && (n.includes("WBNB") || n.includes("BNB"));
  });
  return usdtBnb ?? quotes[0];
}

function buildCard(
  venus: YieldVenueQuote[],
  pancake: YieldVenueQuote[],
  lista: YieldVenueQuote,
): YieldCardPayload {
  const current = venus[0];
  const target = preferUsdtBnb(pancake);
  const currentApy = current?.apy ?? 7.45;
  const targetApr = target?.apy ?? 24.12;
  const reroute = targetApr > currentApy + 0.5;
  return {
    agent_id: YIELD_AGENT_ID,
    name: YIELD_AGENT_NAME,
    category: "Yield Optimisation",
    standards: ["ERC-8183", "ERC-7579"],
    metrics: {
      current_strategy: current?.venue ?? "Venus USDT Supply",
      current_apy: fmtPct(currentApy),
      target_strategy: target?.venue ?? "PancakeSwap USDT/BNB V3 LP",
      target_apr: fmtPct(targetApr),
      status: reroute
        ? "Re-routing Pending (A2A Healthy)"
        : "Holding (A2A Healthy)",
    },
    action_trigger: "Batch Optimize via ERC-7579",
    updatedAt: new Date().toISOString(),
    sources: {
      venus: { live: venus.length > 0, quotes: venus.slice(0, 4) },
      pancake: { live: pancake.length > 0, quotes: pancake.slice(0, 4) },
      lista: { live: false, quotes: [lista] },
    },
  };
}

export async function getYieldCard(force = false): Promise<YieldCardPayload> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.payload;
  }

  const [venusResult, pancakeResult] = await Promise.allSettled([
    fetchVenusStables(),
    fetchPancakeV3Estimates(),
  ]);
  const venus = venusResult.status === "fulfilled" ? venusResult.value : [];
  const pancake =
    pancakeResult.status === "fulfilled" ? pancakeResult.value : [];
  const lista = simulateListaApy();

  const payload =
    venus.length === 0 && pancake.length === 0
      ? fallbackCard()
      : buildCard(venus, pancake, lista);

  cached = { at: Date.now(), payload };
  return payload;
}
