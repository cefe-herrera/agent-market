"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import type { RebalanceCardPayload } from "@/app/lib/rebalance/types";
import {
  REBALANCE_AGENT_ID,
  REBALANCE_AGENT_NAME,
  rebalanceSnapshotPath,
} from "@/app/lib/gemini/ids";
import { REBALANCE_SKILLS } from "@/app/lib/gemini/skills";
import { marketplaceAgentUrl } from "@/app/lib/nest-routes";

const FALLBACK_CARD: RebalanceCardPayload = {
  agent_id: REBALANCE_AGENT_ID,
  name: REBALANCE_AGENT_NAME,
  category: "Rebalancing",
  standards: ["ERC-8183", "ERC-7579"],
  metrics: {
    spot: "$580.00",
    change24h: "+1.20%",
    driftBps: "+60 bps",
    target: "50/50 BNB–USDT",
    status: "In range (A2A Healthy)",
  },
  action_trigger: "Batch Rebalance via ERC-7579",
  updatedAt: new Date(0).toISOString(),
  sleeve: {
    asset: "BNB",
    quote: "USDT",
    targetBps: 5000,
    impliedBps: 5060,
    driftBps: 60,
    thresholdBps: 300,
  },
  sources: {
    coingecko: { live: false, quotes: [] },
  },
};

export default function RebalanceAgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: MarketplaceAgent;
  selected: boolean;
  onSelect: (agent: MarketplaceAgent) => void;
}) {
  const [card, setCard] = useState<RebalanceCardPayload>(FALLBACK_CARD);
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
        const res = await fetch(rebalanceSnapshotPath(), { cache: "no-store" });
        const json = (await res.json()) as RebalanceCardPayload;
        if (!res.ok) throw new Error("rebalance snapshot failed");
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
  const geckoLive = card?.sources.coingecko.live;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(agent)}
        className={`agent-card w-full ${selected ? "is-selected" : ""}`}
      >
        <div className="agent-card-meta">
          <div className="agent-card-badges">
            <span className="agent-card-studio">Rebalancing</span>
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
            {card?.category ?? "Rebalancing"} · CoinGecko · 50/50 BNB–USDT
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
          <span className={geckoLive ? "badge-green" : "badge-gray"}>
            CoinGecko {geckoLive ? "live" : "fallback"}
          </span>
          {REBALANCE_SKILLS.map((skill) => (
            <span key={skill.id} className="badge-gray">
              {skill.name}
            </span>
          ))}
        </div>
        <div className="agent-card-metrics">
          <div>
            <p className="agent-card-metric-label">BNB spot</p>
            <p className="agent-card-metric-value">{metrics?.spot ?? "…"}</p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              CoinGecko USD
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">24h</p>
            <p className="agent-card-metric-value">
              {metrics?.change24h ?? "…"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              drift {metrics?.driftBps ?? "…"}
            </p>
          </div>
          <div>
            <p className="agent-card-metric-label">Target</p>
            <p className="agent-card-metric-value text-[12px] leading-snug">
              {metrics?.target ?? "50/50"}
            </p>
            <p className="mt-1 font-mono-data text-[10px] text-surface-500">
              threshold ±300 bps
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
          {card?.action_trigger ?? "Batch Rebalance via ERC-7579"}
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
