import "server-only";

import type { VenusMarketQuote } from "./types";

const VENUS_MARKETS = "https://api.venus.io/markets?chainId=56&limit=100";
const CORE_COMPTROLLER = "0xfd36e2c2a6789db23113685031d7f16329158384";

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mantissa(value: unknown): number | null {
  const raw = num(value);
  if (raw == null) return null;
  if (raw > 1) return raw / 1e18;
  return raw;
}

type VenusMarket = {
  symbol?: string;
  underlyingSymbol?: string;
  collateralFactorMantissa?: string | number | null;
  liquidationThresholdMantissa?: string | number | null;
  borrowApy?: string | number | null;
  supplyApy?: string | number | null;
  poolComptrollerAddress?: string | null;
  isListed?: boolean;
};

function isCore(market: VenusMarket): boolean {
  const pool = (market.poolComptrollerAddress ?? "").toLowerCase();
  if (pool && pool !== CORE_COMPTROLLER) return false;
  const symbol = market.symbol ?? "";
  return !symbol.includes("_");
}

function mapMarket(market: VenusMarket): VenusMarketQuote | null {
  const underlying = (market.underlyingSymbol ?? "").toUpperCase();
  const symbol = (market.symbol ?? "").toUpperCase();
  if (!underlying && !symbol) return null;
  return {
    symbol: symbol || `v${underlying}`,
    underlying: underlying || symbol.replace(/^V/, ""),
    collateralFactor: mantissa(market.collateralFactorMantissa),
    liquidationThreshold: mantissa(market.liquidationThresholdMantissa),
    borrowApy: num(market.borrowApy),
    supplyApy: num(market.supplyApy),
    live: true,
  };
}

export async function fetchVenusCoreMarkets(
  underlyings: string[] = ["BNB", "WBNB", "USDT"],
): Promise<VenusMarketQuote[]> {
  const res = await fetch(VENUS_MARKETS, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Venus markets HTTP ${res.status}`);
  const body = (await res.json()) as { result?: VenusMarket[] };
  const markets = Array.isArray(body.result) ? body.result : [];
  const wanted = new Set(underlyings.map((s) => s.toUpperCase()));
  const quotes: VenusMarketQuote[] = [];
  for (const market of markets) {
    if (market.isListed === false) continue;
    if (!isCore(market)) continue;
    const mapped = mapMarket(market);
    if (!mapped) continue;
    if (!wanted.has(mapped.underlying) && !wanted.has(mapped.symbol)) continue;
    quotes.push(mapped);
  }
  return quotes;
}
