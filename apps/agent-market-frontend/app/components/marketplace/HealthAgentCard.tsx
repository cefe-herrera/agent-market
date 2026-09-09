"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import type { HealthCardPayload } from "@/app/lib/health/types";
import { HEALTH_AGENT_ID, HEALTH_AGENT_NAME } from "@/app/lib/gemini/ids";
import { HEALTH_SKILLS } from "@/app/lib/gemini/skills";

const FALLBACK_CARD: HealthCardPayload = {
  agent_id: HEALTH_AGENT_ID,
  name: HEALTH_AGENT_NAME,
  category: "Health Factor",
  standards: ["ERC-8183", "ERC-7579"],
  metrics: {
    healthFactor: "1.72",
    distance: "42.0% to liq",
    collateral: "10 BNB · $7560",
    status: "Watch (A2A Healthy)",
  },
  action_trigger: "Batch Delever via ERC-7579",
  updatedAt: new Date(0).toISOString(),
  position: {
    collateralAsset: "BNB",
    collateralAmount: 10,
    collateralUsd: 7560,
    debtAsset: "USDT",
    debtUsd: 3508,
    collateralFactor: 0.8,
    healthFactor: 1.72,
    liqPriceUsd: 438.5,
    distancePct: 42,
    simulated: true,
  },
  sources: {
    venus: { live: false, markets: [] },
    coingecko: { live: false, bnbUsd: null },
  },
};

export default function HealthAgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: MarketplaceAgent;
  selected: boolean;
  onSelect: (agent: MarketplaceAgent) => void;
}) {
  const [card, setCard] = useState<HealthCardPayload>(FALLBACK_CARD);
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
        const res = await fetch("/api/agent/health", { cache: "no-store" });
        const json = (await res.json()) as HealthCardPayload;
        if (!res.ok) throw new Error("health snapshot failed");
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
        `/api/marketplace/agents/${encodeURIComponent(agent.agentId)}/a2a-health`,
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
  const venusLive = card?.sources.venus.live;
  const geckoLive = card?.sources.coingecko.live;
  const hf = card?.position.healthFactor ?? 0;
  const hfTone =
    hf >= 2 ? "text-brand-500" : hf >= 1.5 ? "text-amber-400" : "text-red-400";

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(agent)}
        className={`agent-card w-full ${selected ? "is-selected" : ""}`}
      >
        <div className="agent-card-meta">
          <div className="agent-card-badges">
            <span className="agent-card-studio">Health Factor</span>
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
            {card?.category ?? "Health Factor"} · Venus · BNB collateral
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
          <span className={venusLive ? "badge-green" : "badge-gray"}>
            Venus {venusLive ? "live" : "fallback"}
          </span>
          <span className={geckoLive ? "badge-green" : "badge-gray"}>
            CoinGecko {geckoLive ? "live" : "fallback"}
          </span>
          {HEALTH_SKILLS.map((skill) => (
            <span key={skill.id} className="badge-gray">
              {skill.name}
            </span>
          ))}
        </div>
        <div className="agent-card-metrics">
          <div>
            <p className="agent-card-metric-label">Health factor</p>
            <p className={`agent-card-metric-value ${hfTone}`}>
              {metrics?.healthFactor ?? "…"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              simulated sleeve
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">Liq distance</p>
            <p className="agent-card-metric-value text-[12px] leading-snug">
              {metrics?.distance ?? "…"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              CF {((card?.position.collateralFactor ?? 0) * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">Collateral</p>
            <p className="agent-card-metric-value text-[12px] leading-snug">
              {metrics?.collateral ?? "…"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              CoinGecko BNB
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
          {card?.action_trigger ?? "Batch Delever via ERC-7579"}
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
