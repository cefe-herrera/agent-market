import "server-only";

import {
  GRID_AGENT_ID,
  GRID_AGENT_NAME,
} from "@/app/lib/gemini/ids";
import {
  coinGeckoGet,
  isCoinGeckoConfigured,
} from "@/app/lib/coingecko/client";
import { fetchAsterMarkets } from "./aster";
import type {
  AsterMarketQuote,
  GridCardPayload,
  GridLevel,
} from "./types";

const CACHE_MS = 45_000;
const LEVELS = 5;

let cached: { at: number; payload: GridCardPayload } | null = null;

type GeckoMarket = {
  id?: string;
  current_price?: number;
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

function fmtFunding(rate: number): string {
  const pct = rate * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4)}% / 8h`;
}

function fallbackAster(): AsterMarketQuote[] {
  return [
    {
      symbol: "BNBUSDT",
      mark: 756,
      index: 755.8,
      lastFundingRate: 0.0001,
      nextFundingTime: null,
      high24h: 768,
      low24h: 742,
      change24hPct: 1.1,
      live: false,
    },
    {
      symbol: "BTCUSDT",
      mark: 110_000,
      index: 109_900,
      lastFundingRate: 0.00005,
      nextFundingTime: null,
      high24h: 112_000,
      low24h: 108_000,
      change24hPct: 0.4,
      live: false,
    },
  ];
}

function buildLevels(low: number, high: number): GridLevel[] {
  const span = Math.max(high - low, low * 0.02);
  const floor = Math.min(low, high);
  const levels: GridLevel[] = [];
  for (let i = 0; i < LEVELS; i++) {
    const price = floor + (span * i) / (LEVELS - 1);
    const mid = (LEVELS - 1) / 2;
    levels.push({
      index: i,
      price,
      side: i < mid ? "buy" : i > mid ? "sell" : "mid",
    });
  }
  return levels;
}

function buildCard(
  aster: AsterMarketQuote[],
  gecko: { live: boolean; spotUsd: number | null; high24h: number | null; low24h: number | null },
): GridCardPayload {
  const bnb =
    aster.find((q) => q.symbol === "BNBUSDT") ?? fallbackAster()[0];
  const low = gecko.low24h ?? bnb.low24h ?? bnb.mark * 0.97;
  const high = gecko.high24h ?? bnb.high24h ?? bnb.mark * 1.03;
  const mark = bnb.mark;
  const levels = buildLevels(low, high);
  const inRange = mark >= low && mark <= high;
  const nextFill: "buy" | "sell" | "none" = inRange
    ? "none"
    : mark < low
      ? "buy"
      : "sell";
  const status = inRange
    ? "In grid (A2A Healthy)"
    : nextFill === "buy"
      ? "Buy fill pending (A2A Healthy)"
      : "Sell fill pending (A2A Healthy)";
  return {
    agent_id: GRID_AGENT_ID,
    name: GRID_AGENT_NAME,
    category: "Grid Trading",
    standards: ["ERC-8183", "ERC-7579"],
    metrics: {
      mark: fmtUsd(mark),
      funding: fmtFunding(bnb.lastFundingRate),
      range: `${fmtUsd(low)}–${fmtUsd(high)}`,
      status,
    },
    action_trigger: "Batch Grid via ERC-7579",
    updatedAt: new Date().toISOString(),
    grid: {
      pair: "BNB/USDT",
      levels,
      low,
      high,
      mark,
      inRange,
      nextFill,
    },
    sources: {
      aster: { live: aster.some((q) => q.live), quotes: aster },
      coingecko: gecko,
    },
  };
}

export async function getGridCard(force = false): Promise<GridCardPayload> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.payload;
  }

  let aster = fallbackAster();
  try {
    aster = await fetchAsterMarkets();
  } catch {
    aster = fallbackAster();
  }

  let gecko = {
    live: false,
    spotUsd: null as number | null,
    high24h: null as number | null,
    low24h: null as number | null,
  };
  if (isCoinGeckoConfigured()) {
    try {
      const rows = await coinGeckoGet<GeckoMarket[]>(
        "/coins/markets?vs_currency=usd&ids=binancecoin&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h",
      );
      const row = Array.isArray(rows) ? rows[0] : null;
      gecko = {
        live: Boolean(row && num(row.current_price)),
        spotUsd: num(row?.current_price),
        high24h: num(row?.high_24h),
        low24h: num(row?.low_24h),
      };
    } catch {
      gecko = { live: false, spotUsd: null, high24h: null, low24h: null };
    }
  }

  const payload = buildCard(aster, gecko);
  cached = { at: Date.now(), payload };
  return payload;
}
