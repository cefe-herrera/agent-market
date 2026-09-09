"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import type { YieldCardPayload } from "@/app/lib/yield/types";
import { YIELD_AGENT_ID, YIELD_AGENT_NAME } from "@/app/lib/gemini/ids";

const FALLBACK_CARD: YieldCardPayload = {
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
  updatedAt: new Date(0).toISOString(),
  sources: {
    venus: { live: false, quotes: [] },
    pancake: { live: false, quotes: [] },
    lista: {
      live: false,
      quotes: [
        {
          venue: "Lista DAO slisBNB staking",
          symbol: "slisBNB",
          apy: 9.2,
          source: "lista",
          live: false,
        },
      ],
    },
  },
};

export default function YieldAgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: MarketplaceAgent;
  selected: boolean;
  onSelect: (agent: MarketplaceAgent) => void;
}) {
  const [card, setCard] = useState<YieldCardPayload>(FALLBACK_CARD);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/agent/yield", { cache: "no-store" });
        const json = (await res.json()) as YieldCardPayload;
        if (!res.ok) throw new Error("yield snapshot failed");
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

  const metrics = card?.metrics;
  const lista = card?.sources.lista.quotes[0];

  return (
    <button
      type="button"
      onClick={() => onSelect(agent)}
      className={`agent-card w-full ${selected ? "is-selected" : ""}`}
    >
      <div className="agent-card-meta">
        <div className="agent-card-badges">
          <span className="agent-card-studio">Yield Optimisation</span>
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
          {card?.category ?? "Yield Optimisation"} · Venus · Pancake V3 · Lista
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
      </div>
      <div className="agent-card-metrics">
        <div>
          <p className="agent-card-metric-label">Current</p>
          <p className="agent-card-metric-value">
            {metrics?.current_apy ?? "…"}
          </p>
          <p className="mt-1 line-clamp-2 font-mono-data text-[10px] text-surface-500">
            {metrics?.current_strategy ?? "Venus USDT Supply"}
          </p>
        </div>
        <div>
          <p className="agent-card-metric-label">Target (est.)</p>
          <p className="agent-card-metric-value">
            {metrics?.target_apr ?? "…"}
          </p>
          <p className="mt-1 line-clamp-2 font-mono-data text-[10px] text-surface-500">
            {metrics?.target_strategy ?? "PancakeSwap USDT/BNB V3 LP"}
          </p>
        </div>
        <div>
          <p className="agent-card-metric-label">Lista (sim)</p>
          <p className="agent-card-metric-value">
            {lista ? `${lista.apy.toFixed(2)}%` : "7–11%"}
          </p>
          <p className="mt-1 font-mono-data text-[10px] text-surface-500">
            slisBNB staking band
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
        {card?.action_trigger ?? "Batch Optimize via ERC-7579"}
      </p>
      {error && (
        <p className="mt-2 font-mono-data text-[11px] text-amber-400">
          snapshot fallback · {error}
        </p>
      )}
    </button>
  );
}
