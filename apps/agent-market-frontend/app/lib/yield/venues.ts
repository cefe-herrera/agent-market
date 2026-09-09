import "server-only";

import type { YieldVenueQuote } from "./types";

const VENUS_MARKETS = "https://api.venus.io/markets?chainId=56&limit=100";
const GECKO_PANCAKE_V3 =
  "https://api.geckoterminal.com/api/v2/networks/bsc/dexes/pancakeswap-v3-bsc/pools?page=1";

const BLUE_CHIP = new Set(["USDT", "USDC", "WBNB", "BNB", "USD1", "U"]);

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type VenusMarket = {
  symbol?: string;
  underlyingSymbol?: string;
  supplyApy?: string | number | null;
};

function isCoreVenusStable(market: VenusMarket): boolean {
  const underlying = (market.underlyingSymbol ?? "").toUpperCase();
  if (!["USDT", "USDC", "U", "USD1"].includes(underlying)) return false;
  const symbol = market.symbol ?? "";
  return !symbol.includes("_");
}

export async function fetchVenusStables(): Promise<YieldVenueQuote[]> {
  const body = (await fetchJson(VENUS_MARKETS)) as { result?: VenusMarket[] };
  const markets = Array.isArray(body.result) ? body.result : [];
  return markets
    .filter(isCoreVenusStable)
    .map((market) => {
      const apy = num(market.supplyApy) ?? 0;
      const symbol = (market.underlyingSymbol ?? "USDT").toUpperCase();
      return {
        venue: `Venus ${symbol} Supply`,
        symbol,
        apy,
        source: "venus" as const,
        live: true,
      };
    })
    .filter((quote) => quote.apy > 0)
    .sort((a, b) => b.apy - a.apy);
}

function feeRateFromPoolName(name: string): number | null {
  const match = name.match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  return Number(match[1]) / 100;
}

function poolTokens(name: string): [string, string] | null {
  const [left, right] = name.split("/").map((part) => part.trim());
  if (!left || !right) return null;
  const base = left.split(/\s+/)[0]?.toUpperCase();
  const quote = right.split(/\s+/)[0]?.toUpperCase();
  if (!base || !quote) return null;
  return [base, quote];
}

function isBlueChipPool(name: string): boolean {
  const tokens = poolTokens(name);
  if (!tokens) return false;
  return BLUE_CHIP.has(tokens[0]) && BLUE_CHIP.has(tokens[1]);
}

type GeckoPool = {
  attributes?: {
    name?: string;
    volume_usd?: { h24?: string };
    reserve_in_usd?: string;
  };
};

export async function fetchPancakeV3Estimates(): Promise<YieldVenueQuote[]> {
  const body = (await fetchJson(GECKO_PANCAKE_V3, {
    Accept: "application/json;version=20230302",
  })) as { data?: GeckoPool[] };
  const pools = Array.isArray(body.data) ? body.data : [];
  const quotes: YieldVenueQuote[] = [];
  for (const pool of pools) {
    const name = pool.attributes?.name ?? "";
    if (!isBlueChipPool(name)) continue;
    const fee = feeRateFromPoolName(name);
    const volume = num(pool.attributes?.volume_usd?.h24);
    const tvl = num(pool.attributes?.reserve_in_usd);
    if (fee == null || volume == null || tvl == null || tvl < 250_000) continue;
    const apr = (volume * fee * 365 * 100) / tvl;
    if (!Number.isFinite(apr) || apr <= 0) continue;
    quotes.push({
      venue: `PancakeSwap ${name} V3 LP`,
      symbol: name,
      apy: Math.min(apr, 999),
      source: "pancake-v3",
      live: true,
      volumeUsd24h: volume,
      tvlUsd: tvl,
    });
  }
  return quotes.sort((a, b) => b.apy - a.apy);
}

/** Lista liquid staking has no public APY feed here — keep it in the 7–11% band. */
export function simulateListaApy(now = Date.now()): YieldVenueQuote {
  const hours = now / 3_600_000;
  const wave = (Math.sin(hours) + 1) / 2;
  const apy = 7 + wave * 4;
  return {
    venue: "Lista DAO slisBNB staking",
    symbol: "slisBNB",
    apy: Number(apy.toFixed(2)),
    source: "lista",
    live: false,
  };
}
