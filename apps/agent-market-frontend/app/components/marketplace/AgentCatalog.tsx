"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  agentEndpoints,
  agentHasMcp,
  isHttpUrl,
  isIndexerCatalogAgent,
  isPlaceholderEndpoint,
  shortenAddress,
  verificationLabels,
} from "@/app/lib/agents";
import { demoMarketplaceAgents } from "@/app/lib/demo-agents";
import { frontendBscChainId, frontendNetworkMode } from "@/app/lib/network";
import { X402_PAYMENT_USDC } from "@/app/lib/x402-usdc";

const DEMO_AGENTS = demoMarketplaceAgents();

type A2aHealth = {
  healthy?: boolean;
  status?: string;
  endpoint?: string | null;
  error?: string | null;
  skills?: string[];
  priceLabel?: string | null;
};

export default function AgentCatalog({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (agent: MarketplaceAgent) => void;
}) {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<string, A2aHealth>>({});
  const [checking, setChecking] = useState<string | null>(null);
  const [endpointView, setEndpointView] = useState<
    Record<string, { a2a: string | null; mcp: string | null }>
  >({});
  const [loadingEndpoint, setLoadingEndpoint] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [openScan, setOpenScan] = useState(false);
  const [openAdded, setOpenAdded] = useState<number | null>(null);
  const network = frontendNetworkMode();
  const isTestnet = network === "testnet";
  const chainId = frontendBscChainId(network);

  async function fetchCatalog(expandOpen: boolean) {
    const res = await fetch(
      `/api/marketplace/agents?isTestnet=${isTestnet}&chainId=${chainId}&usable=true${
        expandOpen ? "&open=true" : ""
      }`,
      { cache: "no-store" },
    );
    const payload = (await res.json().catch(() => null)) as
      | MarketplaceAgent[]
      | {
          data?: MarketplaceAgent[];
          total?: number;
          error?: string;
          details?: string;
          message?: unknown;
        }
      | null;
    if (!res.ok) {
      const nested =
        payload &&
        !Array.isArray(payload) &&
        (payload.error || payload.details || JSON.stringify(payload.message));
      throw new Error(
        nested
          ? String(nested)
          : `API ${res.status} — indexer en ${process.env.NEXT_PUBLIC_INDEXER_BNB_URL || "http://127.0.0.1:8085"}`,
      );
    }
    const list = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];
    const listed = list.filter((agent) =>
      isIndexerCatalogAgent(agent, network),
    );
    const total =
      !Array.isArray(payload) && typeof payload?.total === "number"
        ? payload.total
        : listed.length;
    return { listed, total };
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setOpenScan(false);
      setOpenAdded(null);
      try {
        const { listed, total } = await fetchCatalog(false);
        if (!cancelled) {
          setAgents(listed);
          setTotal(total);
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
  }, [isTestnet, network]);

  async function expandOpenCatalog() {
    setExpanding(true);
    setError(null);
    try {
      const previousIds = new Set(agents.map((agent) => agent.agentId));
      const { listed, total } = await fetchCatalog(true);
      setAgents(listed);
      setTotal(total);
      setOpenScan(true);
      setOpenAdded(
        listed.filter((agent) => !previousIds.has(agent.agentId)).length,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExpanding(false);
    }
  }

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

  async function viewEndpoint(agent: MarketplaceAgent) {
    const known = endpointView[agent.agentId] ?? agentEndpoints(agent);
    if (isHttpUrl(known.a2a) || isHttpUrl(known.mcp)) {
      setEndpointView((prev) => ({ ...prev, [agent.agentId]: known }));
      return;
    }

    setLoadingEndpoint(agent.agentId);
    try {
      const res = await fetch(
        `/api/marketplace/agents/${encodeURIComponent(agent.agentId)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as MarketplaceAgent;
      setEndpointView((prev) => ({ ...prev, [agent.agentId]: agentEndpoints(json) }));
    } catch {
      setEndpointView((prev) => ({
        ...prev,
        [agent.agentId]: { a2a: null, mcp: null },
      }));
    } finally {
      setLoadingEndpoint(null);
    }
  }

  return (
    <section className="w-full min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {isTestnet ? "BSC testnet · chain 97" : "BNB Chain · 56"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Agentes
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {isTestnet
              ? "Registered (ERC-8004 + BNB Agent SDK) → Schema (Agent Card) → Live (cron al endpoint). Schema fail = fuera."
              : "Solo BNB Chain (56). Registered → Schema-valid Agent Card → Live. El botón busca más en 8004scan A2A/MCP de esta cadena. Login/OAuth no cuenta."}
          </p>
        </div>
      </div>

      {isTestnet && (
        <>
          <h2 className="mt-8 text-sm font-semibold">Demo</h2>
          <AgentList
            agents={DEMO_AGENTS}
            selectedId={selectedId}
            onSelect={onSelect}
            demo
          />
        </>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold">Schema-valid</h2>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs text-zinc-500">
            {agents.length === total
              ? `${agents.length} listados`
              : `${agents.length} de ${total} listados`}
            {openScan ? " · catálogo ampliado" : ""}
          </p>
          <button
            type="button"
            onClick={() => void expandOpenCatalog()}
            disabled={loading || expanding}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
          >
            {expanding
              ? "Buscando agentes operables…"
              : openScan
                ? "Volver a buscar operables"
                : "Buscar más agentes operables"}
          </button>
        </div>
      </div>
      {expanding && (
        <p className="mt-3 text-sm text-zinc-500">
          Escaneando 8004scan por Agent Cards (A2A/MCP, no solo BNB Agent SDK).
          Puede tardar un minuto. Login/OAuth y factories Termix no entran.
        </p>
      )}
      {!expanding && openScan && openAdded !== null && (
        <p className="mt-3 text-sm text-zinc-500">
          {openAdded > 0
            ? `Se agregaron ${openAdded} agentes schema-valid fuera del SDK.`
            : "No hubo más Agent Cards schema-valid en este scan. 8004scan está lleno de registros sin card JSON invocable."}
        </p>
      )}
      {loading && (
        <p className="mt-4 text-sm text-zinc-500">Cargando 8004scan…</p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      )}
      {!loading && !error && agents.length === 0 && (
        <p className="mt-4 text-sm text-zinc-500">
          {isTestnet
            ? "No hay agentes schema-valid en testnet ahora."
            : "Ningún agente pasó schema-valid (Agent Card con endpoint, capabilities y precio declarado)."}
        </p>
      )}
      <AgentList
        agents={agents}
        selectedId={selectedId}
        onSelect={onSelect}
        health={health}
        checking={checking}
        onCheckHealth={checkHealth}
        endpointView={endpointView}
        loadingEndpoint={loadingEndpoint}
        onViewEndpoint={viewEndpoint}
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
  endpointView = {},
  loadingEndpoint = null,
  onViewEndpoint,
}: {
  agents: MarketplaceAgent[];
  selectedId: string | null;
  onSelect: (agent: MarketplaceAgent) => void;
  demo?: boolean;
  health?: Record<string, A2aHealth>;
  checking?: string | null;
  onCheckHealth?: (agent: MarketplaceAgent) => void;
  endpointView?: Record<string, { a2a: string | null; mcp: string | null }>;
  loadingEndpoint?: string | null;
  onViewEndpoint?: (agent: MarketplaceAgent) => void;
}) {
  return (
    <ul className="mt-3 grid min-w-0 gap-3">
      {agents.map((agent) => {
        const selected = selectedId === agent.agentId;
        const live = health[agent.agentId];
        const x402 = agent.supportedAssets.includes("U");
        const placeholder = !demo && isPlaceholderEndpoint(agent);
        const hasMcp = agentHasMcp(agent);
        const endpoints = endpointView[agent.agentId] ?? agentEndpoints(agent);
        const shownUrl = endpoints.a2a ?? endpoints.mcp;
        const usagePrice =
          live?.priceLabel ??
          agent.verification?.priceLabel ??
          agent.a2a?.priceLabel ??
          (x402 ? `${X402_PAYMENT_USDC} $U hire` : null);
        const levels = verificationLabels(agent);
        const protocolBadges = agent.protocols.filter(
          (protocol) => !["mcp", "a2a", "erc-8004"].includes(protocol.toLowerCase()),
        );
        return (
          <li key={agent.agentId} className="min-w-0 max-w-full">
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
                {!demo && agent.network && (
                  <Badge selected={selected} label={agent.network} />
                )}
                {protocolBadges.map((p) => (
                  <Badge key={p} selected={selected} label={p} />
                ))}
                {!demo && (
                  <>
                    {levels.map((label) => (
                      <Badge key={label} selected={selected} label={label} />
                    ))}
                    <Badge selected={selected} label={hasMcp ? "MCP" : "sin MCP"} />
                  </>
                )}
                {x402 && <Badge selected={selected} label="x402 $U" />}
                {usagePrice && <Badge selected={selected} label={usagePrice} />}
                {demo && <Badge selected={selected} label="JSON fijo" />}
                {placeholder && (
                  <Badge selected={selected} label="placeholder URL" />
                )}
              </div>
              <p
                className={`mt-3 font-mono text-[11px] ${selected ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-400"}`}
              >
                {shortenAddress(agent.agentWallet)}
              </p>
            </button>
            <div className="mt-2 min-w-0 space-y-1 px-1">
              <EndpointLink label="MCP" href={endpoints.mcp} />
              <EndpointLink label="A2A" href={endpoints.a2a} />
              {agent.agentId in endpointView && !shownUrl && (
                <p className="text-[11px] text-zinc-400">sin endpoint A2A/MCP</p>
              )}
            </div>
            {(onCheckHealth || onViewEndpoint) && (
              <div className="mt-1 flex justify-end gap-3">
                {onViewEndpoint && !isHttpUrl(endpoints.mcp) && !isHttpUrl(endpoints.a2a) && (
                  <button
                    type="button"
                    disabled={loadingEndpoint === agent.agentId}
                    onClick={() => onViewEndpoint(agent)}
                    className="px-2 py-1 text-[11px] text-zinc-500 underline disabled:opacity-40"
                  >
                    {loadingEndpoint === agent.agentId
                      ? "buscando endpoint…"
                      : "buscar endpoint"}
                  </button>
                )}
                {onCheckHealth && (
                  <button
                    type="button"
                    disabled={checking === agent.agentId}
                    onClick={() => onCheckHealth(agent)}
                    className="px-2 py-1 text-[11px] text-zinc-500 underline disabled:opacity-40"
                  >
                    {checking === agent.agentId ? "probing A2A…" : "chequear A2A"}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EndpointLink({ label, href }: { label: string; href: string | null }) {
  if (!isHttpUrl(href) || !href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-full truncate font-mono text-[11px] text-sky-700 underline dark:text-sky-400"
      title={href}
    >
      {label}: {href}
    </a>
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
