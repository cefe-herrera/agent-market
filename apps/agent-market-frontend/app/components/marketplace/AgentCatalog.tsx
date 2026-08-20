"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  isPlaceholderEndpoint,
  isUsableBscTestnetAgent,
  shortenAddress,
} from "@/app/lib/agents";
import { demoMarketplaceAgents } from "@/app/lib/demo-agents";
import { apiOrigin } from "@/app/lib/api";

const DEMO_AGENTS = demoMarketplaceAgents();

type A2aHealth = {
  healthy?: boolean;
  status?: string;
  endpoint?: string | null;
  error?: string | null;
  skills?: string[];
};

export default function AgentCatalog({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (agent: MarketplaceAgent) => void;
}) {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, A2aHealth>>({});
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/marketplace/agents", {
          cache: "no-store",
        });
        const payload = (await res.json().catch(() => null)) as
          | MarketplaceAgent[]
          | { error?: string; details?: string; message?: unknown }
          | null;
        if (!res.ok) {
          const nested =
            payload &&
            !Array.isArray(payload) &&
            (payload.error || payload.details || JSON.stringify(payload.message));
          throw new Error(
            nested
              ? String(nested)
              : `API ${res.status} — Nest en ${apiOrigin()}`,
          );
        }
        if (!cancelled) {
          const list = Array.isArray(payload) ? payload : [];
          setAgents(list.filter(isUsableBscTestnetAgent));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function checkHealth(agent: MarketplaceAgent) {
    setChecking(agent.agentId);
    try {
      const res = await fetch(
        `/api/marketplace/agents/${encodeURIComponent(agent.agentId)}/a2a-health`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as A2aHealth;
      setHealth((prev) => ({ ...prev, [agent.agentId]: json }));
    } catch (err) {
      setHealth((prev) => ({
        ...prev,
        [agent.agentId]: {
          healthy: false,
          status: "unhealthy",
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    } finally {
      setChecking(null);
    }
  }

  return (
    <section className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            BSC testnet · chain 97
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Agentes
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            4 sellers de demo (JSON fijo) + el indexador 8004scan. Si el
            agente responde, se imprime el JSON crudo.
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold">Demo</h2>
      <AgentList
        agents={DEMO_AGENTS}
        selectedId={selectedId}
        onSelect={onSelect}
        demo
      />

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold">Indexador</h2>
        <p className="text-xs text-zinc-500">{agents.length} listados</p>
      </div>
      {loading && (
        <p className="mt-4 text-sm text-zinc-500">Cargando 8004scan…</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      )}
      {!loading && !error && agents.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          No hay agentes A2A/x402 en BSC testnet ahora.
        </p>
      )}
      <AgentList
        agents={agents}
        selectedId={selectedId}
        onSelect={onSelect}
        health={health}
        checking={checking}
        onCheckHealth={checkHealth}
      />
    </section>
  );
}

function AgentList({
  agents,
  selectedId,
  onSelect,
  demo = false,
  health = {},
  checking = null,
  onCheckHealth,
}: {
  agents: MarketplaceAgent[];
  selectedId: string | null;
  onSelect: (agent: MarketplaceAgent) => void;
  demo?: boolean;
  health?: Record<string, A2aHealth>;
  checking?: string | null;
  onCheckHealth?: (agent: MarketplaceAgent) => void;
}) {
  return (
    <ul className="mt-3 grid gap-3">
      {agents.map((agent) => {
        const selected = selectedId === agent.agentId;
        const a2a = health[agent.agentId];
        const x402 = agent.supportedAssets.includes("U");
        const placeholder = !demo && isPlaceholderEndpoint(agent);
        return (
          <li key={agent.agentId}>
            <button
              type="button"
              onClick={() => onSelect(agent)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{agent.name}</p>
                  <p
                    className={`mt-1 text-xs ${selected ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-500"}`}
                  >
                    {agent.shortDescription}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider">
                  {demo
                    ? agent.slug
                    : `#${agent.agentId.split(":").at(-1)}`}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {agent.protocols.map((p) => (
                  <Badge key={p} selected={selected} label={p} />
                ))}
                {x402 && <Badge selected={selected} label="x402 $U" />}
                {demo && <Badge selected={selected} label="JSON fijo" />}
                {placeholder && (
                  <Badge selected={selected} label="placeholder URL" />
                )}
                {a2a && (
                  <Badge
                    selected={selected}
                    label={
                      a2a.healthy
                        ? "A2A healthy"
                        : `A2A ${a2a.status ?? "down"}`
                    }
                  />
                )}
              </div>
              <p
                className={`mt-3 font-mono text-[11px] ${selected ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"}`}
              >
                {shortenAddress(agent.agentWallet)}
              </p>
            </button>
            {onCheckHealth && (
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  disabled={checking === agent.agentId}
                  onClick={() => onCheckHealth(agent)}
                  className="px-2 py-1 text-[11px] text-zinc-500 underline disabled:opacity-40"
                >
                  {checking === agent.agentId ? "probing A2A…" : "chequear A2A"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Badge({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        selected
          ? "bg-white/15 text-white dark:bg-zinc-900/10 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {label}
    </span>
  );
}
