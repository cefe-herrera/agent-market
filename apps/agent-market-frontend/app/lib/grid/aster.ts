import "server-only";

import type { AsterMarketQuote } from "./types";

const ASTER_FAPI = "https://fapi.asterdex.com";

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${ASTER_FAPI}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`Aster ${path} HTTP ${res.status}`);
  return res.json();
}

type PremiumIndex = {
  symbol?: string;
  markPrice?: string;
  indexPrice?: string;
  lastFundingRate?: string;
  nextFundingTime?: number;
};

type Ticker24h = {
  symbol?: string;
  highPrice?: string;
  lowPrice?: string;
  priceChangePercent?: string;
};

export async function fetchAsterMarkets(
  symbols: string[] = ["BNBUSDT", "BTCUSDT"],
): Promise<AsterMarketQuote[]> {
  const quotes = await Promise.all(
    symbols.map(async (symbol) => {
      const [premium, ticker] = await Promise.all([
        fetchJson(`/fapi/v1/premiumIndex?symbol=${symbol}`) as Promise<PremiumIndex>,
        fetchJson(`/fapi/v1/ticker/24hr?symbol=${symbol}`).catch(
          () => ({}),
        ) as Promise<Ticker24h>,
      ]);
      const mark = num(premium.markPrice);
      const index = num(premium.indexPrice);
      if (mark == null || index == null) {
        throw new Error(`Aster ${symbol} missing mark/index`);
      }
      return {
        symbol,
        mark,
        index,
        lastFundingRate: num(premium.lastFundingRate) ?? 0,
        nextFundingTime: num(premium.nextFundingTime),
        high24h: num(ticker.highPrice),
        low24h: num(ticker.lowPrice),
        change24hPct: num(ticker.priceChangePercent),
        live: true,
      } satisfies AsterMarketQuote;
    }),
  );
  return quotes;
}
