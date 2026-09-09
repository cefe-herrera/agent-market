import "server-only";

import {
  HEALTH_AGENT_ID,
  HEALTH_AGENT_NAME,
} from "@/app/lib/gemini/ids";
import {
  coinGeckoGet,
  isCoinGeckoConfigured,
} from "@/app/lib/coingecko/client";
import { fetchVenusCoreMarkets } from "./venus";
import type { HealthCardPayload, VenusMarketQuote } from "./types";

const CACHE_MS = 45_000;
const COLLATERAL_BNB = 10;
const UTILIZATION = 0.58;

let cached: { at: number; payload: HealthCardPayload } | null = null;

type GeckoMarket = {
  current_price?: number;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function fmtHf(value: number): string {
  return value.toFixed(2);
}

function fmtUsd(value: number): string {
  if (value >= 1000) return `$${value.toFixed(0)}`;
  if (value >= 100) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(3)}`;
}

function fallbackVenus(): VenusMarketQuote[] {
  return [
    {
      symbol: "VBNB",
      underlying: "BNB",
      collateralFactor: 0.8,
      liquidationThreshold: 0.85,
      borrowApy: 2.1,
      supplyApy: 0.4,
      live: false,
    },
    {
      symbol: "VUSDT",
      underlying: "USDT",
      collateralFactor: 0.8,
      liquidationThreshold: 0.85,
      borrowApy: 4.2,
      supplyApy: 3.1,
      live: false,
    },
  ];
}

function statusFor(hf: number): string {
  if (hf >= 2) return "Safe (A2A Healthy)";
  if (hf >= 1.5) return "Watch (A2A Healthy)";
  if (hf >= 1.1) return "Danger (A2A Healthy)";
  return "Liquidatable (A2A Healthy)";
}

function buildCard(
  markets: VenusMarketQuote[],
  bnbUsd: number,
  geckoLive: boolean,
): HealthCardPayload {
  const bnb =
    markets.find((m) => m.underlying === "BNB" || m.underlying === "WBNB") ??
    fallbackVenus()[0];
  const usdt =
    markets.find((m) => m.underlying === "USDT") ?? fallbackVenus()[1];
  const cf =
    bnb.collateralFactor && bnb.collateralFactor > 0
      ? bnb.collateralFactor
      : bnb.liquidationThreshold && bnb.liquidationThreshold > 0
        ? bnb.liquidationThreshold
        : 0.8;
  const collateralUsd = COLLATERAL_BNB * bnbUsd;
  const adj = collateralUsd * cf;
  const debtUsd = adj * UTILIZATION;
  const healthFactor = debtUsd > 0 ? adj / debtUsd : 99;
  const liqPriceUsd = (debtUsd / (COLLATERAL_BNB * cf)) || 0;
  const distancePct =
    bnbUsd > 0 ? Math.max(0, ((bnbUsd - liqPriceUsd) / bnbUsd) * 100) : 0;
  return {
    agent_id: HEALTH_AGENT_ID,
    name: HEALTH_AGENT_NAME,
    category: "Health Factor",
    standards: ["ERC-8183", "ERC-7579"],
    metrics: {
      healthFactor: fmtHf(healthFactor),
      distance: `${distancePct.toFixed(1)}% to liq`,
      collateral: `${COLLATERAL_BNB} BNB · ${fmtUsd(collateralUsd)}`,
      status: statusFor(healthFactor),
    },
    action_trigger: "Batch Delever via ERC-7579",
    updatedAt: new Date().toISOString(),
    position: {
      collateralAsset: "BNB",
      collateralAmount: COLLATERAL_BNB,
      collateralUsd,
      debtAsset: usdt.underlying,
      debtUsd,
      collateralFactor: cf,
      healthFactor,
      liqPriceUsd,
      distancePct,
      simulated: true,
    },
    sources: {
      venus: { live: markets.some((m) => m.live), markets },
      coingecko: { live: geckoLive, bnbUsd },
    },
  };
}

export async function getHealthCard(force = false): Promise<HealthCardPayload> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.payload;
  }

  let markets = fallbackVenus();
  try {
    const live = await fetchVenusCoreMarkets();
    if (live.length > 0) markets = live;
  } catch {
    markets = fallbackVenus();
  }

  let bnbUsd = 756;
  let geckoLive = false;
  if (isCoinGeckoConfigured()) {
    try {
      const rows = await coinGeckoGet<GeckoMarket[]>(
        "/coins/markets?vs_currency=usd&ids=binancecoin&order=market_cap_desc&per_page=1&page=1&sparkline=false",
      );
      const px = Array.isArray(rows) ? num(rows[0]?.current_price) : null;
      if (px) {
        bnbUsd = px;
        geckoLive = true;
      }
    } catch {
      geckoLive = false;
    }
  }

  const payload = buildCard(markets, bnbUsd, geckoLive);
  cached = { at: Date.now(), payload };
  return payload;
}
