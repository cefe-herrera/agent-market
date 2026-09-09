"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import type { GridCardPayload } from "@/app/lib/grid/types";
import { GRID_AGENT_ID, GRID_AGENT_NAME, gridSnapshotPath } from "@/app/lib/gemini/ids";
import { GRID_SKILLS } from "@/app/lib/gemini/skills";
import { marketplaceAgentUrl } from "@/app/lib/nest-routes";

const FALLBACK_CARD: GridCardPayload = {
  agent_id: GRID_AGENT_ID,
  name: GRID_AGENT_NAME,
  category: "Grid Trading",
  standards: ["ERC-8183", "ERC-7579"],
  metrics: {
    mark: "$756.00",
    funding: "+0.0100% / 8h",
    range: "$742–$768",
    status: "In grid (A2A Healthy)",
  },
  action_trigger: "Batch Grid via ERC-7579",
  updatedAt: new Date(0).toISOString(),
  grid: {
    pair: "BNB/USDT",
    levels: [],
    low: 742,
    high: 768,
    mark: 756,
    inRange: true,
    nextFill: "none",
  },
  sources: {
    aster: { live: false, quotes: [] },
    coingecko: { live: false, spotUsd: null, high24h: null, low24h: null },
  },
};

export default function GridAgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: MarketplaceAgent;
  selected: boolean;
  onSelect: (agent: MarketplaceAgent) => void;
}) {
  const [card, setCard] = useState<GridCardPayload>(FALLBACK_CARD);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    healthy?: boolean;
    status?: string;
    error?: string | null;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(gridSnapshotPath(), { cache: "no-store" });
        const json = (await res.json()) as GridCardPayload;
        if (!res.ok) throw new Error("grid snapshot failed");
        if (!cancelled) {
          setCard(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function checkA2a() {
    setChecking(true);
    try {
      const res = await fetch(
        marketplaceAgentUrl(agent.agentId, "/a2a-health"),
        { cache: "no-store" },
      );
      setHealth(
        (await res.json()) as {
          healthy?: boolean;
          status?: string;
          error?: string | null;
        },
      );
    } catch (err) {
      setHealth({
        healthy: false,
        status: "unhealthy",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void checkA2a();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.agentId]);

  const metrics = card?.metrics;
  const asterLive = card?.sources.aster.live;
  const geckoLive = card?.sources.coingecko.live;
  const btc = card?.sources.aster.quotes.find((q) => q.symbol === "BTCUSDT");

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(agent)}
        className={`agent-card w-full ${selected ? "is-selected" : ""}`}
      >
        <div className="agent-card-meta">
          <div className="agent-card-badges">
            <span className="agent-card-studio">Grid Trading</span>
            <span className="agent-card-chain">{agent.network}</span>
          </div>
          {agent.verified && (
            <span className="agent-card-verified" aria-label="verified">
              ✓
            </span>
          )}
        </div>
        <header className="agent-card-header">
          <p className="agent-card-title">{card?.name ?? agent.name}</p>
          <p className="agent-card-category">
            {card?.category ?? "Grid Trading"} · Aster DEX · BNBUSDT
          </p>
        </header>
        <div className="agent-card-tags">
          {(card?.standards ?? ["ERC-8183", "ERC-7579"]).map((standard) => (
            <span key={standard} className="badge-green">
              {standard}
            </span>
          ))}
          <span className="badge-green">x402 $U</span>
          <span className="badge-gray">Gemini</span>
          <span className={asterLive ? "badge-green" : "badge-gray"}>
            Aster {asterLive ? "live" : "fallback"}
          </span>
          <span className={geckoLive ? "badge-green" : "badge-gray"}>
            CoinGecko {geckoLive ? "live" : "fallback"}
          </span>
          {GRID_SKILLS.map((skill) => (
            <span key={skill.id} className="badge-gray">
              {skill.name}
            </span>
          ))}
        </div>
        <div className="agent-card-metrics">
          <div>
            <p className="agent-card-metric-label">Mark</p>
            <p className="agent-card-metric-value">{metrics?.mark ?? "…"}</p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              Aster BNBUSDT
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">Funding</p>
            <p className="agent-card-metric-value text-[12px] leading-snug">
              {metrics?.funding ?? "…"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              {btc ? `BTC ${btc.change24hPct?.toFixed(2) ?? "—"}%` : "8h rate"}
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">24h band</p>
            <p className="agent-card-metric-value text-[12px] leading-snug">
              {metrics?.range ?? "…"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              CoinGecko high/low
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">Status</p>
            <p className="agent-card-metric-value text-[12px] leading-snug">
              {metrics?.status ?? "A2A Healthy"}
            </p>
          </div>
        </div>
        <p className="font-mono-data text-[11px] uppercase tracking-wider text-brand-500">
          {card?.action_trigger ?? "Batch Grid via ERC-7579"}
        </p>
        {error && (
          <p className="mt-2 font-mono-data text-[11px] text-amber-400">
            snapshot fallback · {error}
          </p>
        )}
        {health && (
          <p
            className={`mt-2 font-mono-data text-[11px] ${
              health.healthy ? "text-brand-500" : "text-red-400"
            }`}
          >
            A2A {health.status}
            {health.error ? ` · ${health.error}` : ""}
          </p>
        )}
      </button>
      <div className="mt-1 flex justify-end">
        <button
          type="button"
          disabled={checking}
          onClick={() => void checkA2a()}
          className="px-2 py-1 font-mono-data text-[11px] text-brand-500 underline disabled:opacity-40"
        >
          {checking ? "probing A2A…" : "chequear A2A"}
        </button>
      </div>
    </div>
  );
}
