import "server-only";

import {
  REBALANCE_AGENT_ID,
  REBALANCE_AGENT_NAME,
} from "@/app/lib/gemini/ids";
import {
  coinGeckoGet,
  isCoinGeckoConfigured,
} from "@/app/lib/coingecko/client";
import type { RebalanceAssetQuote, RebalanceCardPayload } from "./types";

const CACHE_MS = 45_000;
const TARGET_BNB_BPS = 5000;
const DRIFT_THRESHOLD_BPS = 300;
const MARKET_IDS = [
  "binancecoin",
  "tether",
  "usd-coin",
  "pancakeswap-token",
  "bitcoin",
] as const;

let cached: { at: number; payload: RebalanceCardPayload } | null = null;

type GeckoMarket = {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function fmtUsd(value: number): string {
  if (value >= 100) return `$${value.toFixed(2)}`;
  if (value >= 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(5)}`;
}

function fmtPct(value: number | null): string {
  if (value == null) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function fallbackQuotes(): RebalanceAssetQuote[] {
  return [
    {
      id: "binancecoin",
      symbol: "BNB",
      name: "BNB",
      usd: 580,
      change24hPct: 1.2,
      high24h: 588,
      low24h: 572,
      live: false,
    },
    {
      id: "tether",
      symbol: "USDT",
      name: "Tether",
      usd: 1,
      change24hPct: 0.01,
      high24h: 1.001,
      low24h: 0.999,
      live: false,
    },
  ];
}

function impliedBnbWeightBps(change24hPct: number | null): number {
  const move = (change24hPct ?? 0) / 100;
  const bnb = 0.5 * (1 + move);
  const usdt = 0.5;
  const total = bnb + usdt;
  return Math.round((bnb / total) * 10_000);
}

function buildCard(quotes: RebalanceAssetQuote[], live: boolean): RebalanceCardPayload {
  const bnb =
    quotes.find((q) => q.id === "binancecoin") ?? fallbackQuotes()[0];
  const implied = impliedBnbWeightBps(bnb.change24hPct);
  const drift = implied - TARGET_BNB_BPS;
  const stressed = Math.abs(drift) >= DRIFT_THRESHOLD_BPS;
  const nearBand =
    bnb.high24h != null &&
    bnb.low24h != null &&
    bnb.high24h > 0 &&
    (bnb.usd - bnb.low24h) / (bnb.high24h - bnb.low24h) > 0.85;
  return {
    agent_id: REBALANCE_AGENT_ID,
    name: REBALANCE_AGENT_NAME,
    category: "Rebalancing",
    standards: ["ERC-8183", "ERC-7579"],
    metrics: {
      spot: fmtUsd(bnb.usd),
      change24h: fmtPct(bnb.change24hPct),
      driftBps: `${drift >= 0 ? "+" : ""}${drift} bps`,
      target: "50/50 BNB–USDT",
      status: stressed
        ? "Rebalance pending (A2A Healthy)"
        : nearBand
          ? "Range stressed (A2A Healthy)"
          : "In range (A2A Healthy)",
    },
    action_trigger: "Batch Rebalance via ERC-7579",
    updatedAt: new Date().toISOString(),
    sleeve: {
      asset: "BNB",
      quote: "USDT",
      targetBps: TARGET_BNB_BPS,
      impliedBps: implied,
      driftBps: drift,
      thresholdBps: DRIFT_THRESHOLD_BPS,
    },
    sources: {
      coingecko: { live, quotes },
    },
  };
}

function mapMarkets(rows: GeckoMarket[]): RebalanceAssetQuote[] {
  const quotes: RebalanceAssetQuote[] = [];
  for (const row of rows) {
    const usd = num(row.current_price);
    if (!usd || !row.id) continue;
    quotes.push({
      id: row.id,
      symbol: (row.symbol ?? row.id).toUpperCase(),
      name: row.name ?? row.id,
      usd,
      change24hPct: num(row.price_change_percentage_24h),
      high24h: num(row.high_24h),
      low24h: num(row.low_24h),
      live: true,
    });
  }
  return quotes;
}

export async function getRebalanceCard(
  force = false,
): Promise<RebalanceCardPayload> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.payload;
  }

  if (!isCoinGeckoConfigured()) {
    const payload = buildCard(fallbackQuotes(), false);
    cached = { at: Date.now(), payload };
    return payload;
  }

  try {
    const ids = MARKET_IDS.join(",");
    const rows = await coinGeckoGet<GeckoMarket[]>(
      `/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`,
    );
    const quotes = Array.isArray(rows) ? mapMarkets(rows) : [];
    const payload =
      quotes.length === 0
        ? buildCard(fallbackQuotes(), false)
        : buildCard(quotes, true);
    cached = { at: Date.now(), payload };
    return payload;
  } catch {
    const payload = buildCard(fallbackQuotes(), false);
    cached = { at: Date.now(), payload };
    return payload;
  }
}
