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
import {
  geminiMarketplaceAgents,
  isGeminiAgentId,
  isGridAgentId,
  isHealthAgentId,
  isRebalanceAgentId,
  isYieldAgentId,
} from "@/app/lib/gemini/catalog";
import { frontendBscChainId, frontendNetworkMode } from "@/app/lib/network";
import YieldAgentCard from "./YieldAgentCard";
import RebalanceAgentCard from "./RebalanceAgentCard";
import GridAgentCard from "./GridAgentCard";
import HealthAgentCard from "./HealthAgentCard";
import { loadLocalMerchants } from "@/app/lib/merchant/client-store";
import { mergeCatalogWithMerchants } from "@/app/lib/merchant/to-catalog";
import { X402_PAYMENT_USDC } from "@/app/lib/x402-usdc";
import type { HeroStats } from "@/app/components/home/Hero";

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
  onStats,
}: {
  selectedId: string | null;
  onSelect: (agent: MarketplaceAgent) => void;
  onStats?: (stats: HeroStats) => void;
}) {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [registered, setRegistered] = useState<number | null>(null);
  const [filteredOut, setFilteredOut] = useState<number | null>(null);
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
  const [geminiAgents, setGeminiAgents] = useState(() =>
    geminiMarketplaceAgents(),
  );

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
          registered?: number;
          consumable?: number;
          filteredOut?: number;
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
    const registered =
      !Array.isArray(payload) && typeof payload?.registered === "number"
        ? payload.registered
        : null;
    const filteredOut =
      !Array.isArray(payload) && typeof payload?.filteredOut === "number"
        ? payload.filteredOut
        : null;
    return { listed, total, registered, filteredOut };
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setOpenScan(false);
      setOpenAdded(null);
      try {
        const { listed, total, registered, filteredOut } = await fetchCatalog(false);
        if (!cancelled) {
          const merchants = loadLocalMerchants().filter(
            (item) => item.chainId === chainId,
          );
          const withMine = mergeCatalogWithMerchants(listed, merchants);
          setGeminiAgents(
            overlayGeminiFromCatalog(geminiMarketplaceAgents(), withMine),
          );
          setAgents(
            withMine.filter((agent) => !isGeminiAgentId(agent.agentId)),
          );
          setTotal(total);
          setRegistered(registered);
          setFilteredOut(filteredOut);
          onStats?.({
            agents: withMine.length,
            categories: 4,
            chains: 1,
            verified: withMine.filter((agent) => agent.verified).length,
          });
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
      const { listed, total, registered, filteredOut } = await fetchCatalog(true);
      const merchants = loadLocalMerchants().filter(
        (item) => item.chainId === chainId,
      );
      const withMine = mergeCatalogWithMerchants(listed, merchants);
      setGeminiAgents(
        overlayGeminiFromCatalog(geminiMarketplaceAgents(), withMine),
      );
      setAgents(withMine.filter((agent) => !isGeminiAgentId(agent.agentId)));
      setTotal(total);
      setRegistered(registered);
      setFilteredOut(filteredOut);
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
          <p className="label-terminal">
            {isTestnet ? "BSC testnet · chain 97" : "BNB Chain · 56"}
          </p>
          <h3 className="mt-2 font-pixel-square text-xl text-surface-950">
            Agentes
          </h3>
          <p className="mt-2 max-w-2xl font-mono-data text-sm text-surface-500">
            {isTestnet
              ? "Registered (ERC-8004) → consumible (A2A/MCP invocable). Factories Termix, perfiles EvoEvo y OAuth no entran."
              : "Solo BNB Chain (56). Consumible = Agent Card con A2A/MCP de máquina. Termix .agent, EvoEvo web y placeholders quedan afuera."}
          </p>
        </div>
      </div>

      <h2 className="mt-8 font-mono-data text-xs uppercase tracking-wider text-brand-500">
        Rebalancing
      </h2>
      <p className="mt-2 max-w-2xl font-mono-data text-sm text-surface-500">
        Snapshot CoinGecko: spot USD, 24h drift, banda high/low para un sleeve
        50/50 BNB–USDT. Hire x402; el batch 7579 queda como trigger, no
        recentra LPs.
      </p>
      <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        {geminiAgents
          .filter((agent) => isRebalanceAgentId(agent.agentId))
          .map((agent) => (
            <li key={agent.agentId} className="min-w-0 max-w-full">
              <RebalanceAgentCard
                agent={agent}
                selected={selectedId === agent.agentId}
                onSelect={onSelect}
              />
            </li>
          ))}
      </ul>

      <h2 className="mt-8 font-mono-data text-xs uppercase tracking-wider text-brand-500">
        Yield Optimisation
      </h2>
      <p className="mt-2 max-w-2xl font-mono-data text-sm text-surface-500">
        Snapshot live: Venus supply APY, PancakeSwap V3 fee APR (volumen
        GeckoTerminal), Lista slisBNB simulado 7–11%. Hire x402; el batch
        7579 queda como trigger, no ejecuta fondos.
      </p>
      <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        {geminiAgents
          .filter((agent) => isYieldAgentId(agent.agentId))
          .map((agent) => (
            <li key={agent.agentId} className="min-w-0 max-w-full">
              <YieldAgentCard
                agent={agent}
                selected={selectedId === agent.agentId}
                onSelect={onSelect}
              />
            </li>
          ))}
      </ul>

      <h2 className="mt-8 font-mono-data text-xs uppercase tracking-wider text-brand-500">
        Grid Trading
      </h2>
      <p className="mt-2 max-w-2xl font-mono-data text-sm text-surface-500">
        Snapshot Aster DEX: mark, funding 8h, rango 24h. Bandas CoinGecko
        high/low para un grid BNB/USDT. Hire x402; el batch 7579 queda como
        trigger, no coloca órdenes de perps.
      </p>
      <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        {geminiAgents
          .filter((agent) => isGridAgentId(agent.agentId))
          .map((agent) => (
            <li key={agent.agentId} className="min-w-0 max-w-full">
              <GridAgentCard
                agent={agent}
                selected={selectedId === agent.agentId}
                onSelect={onSelect}
              />
            </li>
          ))}
      </ul>

      <h2 className="mt-8 font-mono-data text-xs uppercase tracking-wider text-brand-500">
        Health Factor
      </h2>
      <p className="mt-2 max-w-2xl font-mono-data text-sm text-surface-500">
        Snapshot Venus: collateral factor y borrow APY. Precio BNB de CoinGecko
        para un sleeve simulado BNB/USDT. Hire x402; el batch 7579 queda como
        trigger, no hace repay.
      </p>
      <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        {geminiAgents
          .filter((agent) => isHealthAgentId(agent.agentId))
          .map((agent) => (
            <li key={agent.agentId} className="min-w-0 max-w-full">
              <HealthAgentCard
                agent={agent}
                selected={selectedId === agent.agentId}
                onSelect={onSelect}
              />
            </li>
          ))}
      </ul>

      {isTestnet && (
        <>
          <h2 className="mt-8 font-mono-data text-xs uppercase tracking-wider text-brand-500">
            Demo
          </h2>
          <AgentList
            agents={DEMO_AGENTS}
            selectedId={selectedId}
            onSelect={onSelect}
            demo
          />
        </>
      )}

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-mono-data text-xs uppercase tracking-wider text-brand-500">
          Consumibles
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono-data text-xs uppercase tracking-wider text-surface-500">
            {agents.length === total
              ? `${agents.length} listados`
              : `${agents.length} de ${total} listados`}
            {registered != null
              ? ` · ${registered} registrados`
              : ""}
            {filteredOut
              ? ` · ${filteredOut} filtrados`
              : ""}
            {openScan ? " · búsqueda ampliada" : ""}
          </p>
          <button
            type="button"
            onClick={() => void expandOpenCatalog()}
            disabled={loading || expanding}
            className="btn-secondary !px-3 !py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="mt-3 font-mono-data text-sm text-surface-500">
          Buscando A2A/MCP invocables en el indexer (sin factories Termix ni perfiles web).
        </p>
      )}
      {!expanding && openScan && openAdded !== null && (
        <p className="mt-3 font-mono-data text-sm text-surface-500">
          {openAdded > 0
            ? `Se agregaron ${openAdded} agentes consumibles.`
            : "No hubo más A2A/MCP invocables. El indexer está lleno de Termix/EvoEvo sin endpoint de máquina."}
        </p>
      )}
      {loading && (
        <p className="mt-4 font-mono-data text-sm text-surface-500">
          Filtrando agentes consumibles…
        </p>
      )}
      {error && (
        <p className="mt-4 whitespace-pre-wrap font-mono-data text-sm text-red-400">
          {error}
        </p>
      )}
      {!loading && !error && agents.length === 0 && (
        <p className="mt-4 font-mono-data text-sm text-surface-500">
          {isTestnet
            ? "No hay agentes schema-valid en testnet ahora."
            : "Ningún agente del indexer tiene A2A/MCP invocable. Se filtraron factories Termix, perfiles EvoEvo y registros sin endpoint."}
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

function overlayGeminiFromCatalog(
  gemini: MarketplaceAgent[],
  catalog: MarketplaceAgent[],
): MarketplaceAgent[] {
  return gemini.map((agent) => {
    const hit = catalog.find((item) => item.agentId === agent.agentId);
    if (!hit) return agent;
    return {
      ...agent,
      verified: hit.verified || agent.verified,
      agentWallet: hit.agentWallet,
      ownerWallet: hit.ownerWallet,
      erc8183Provider: hit.erc8183Provider ?? agent.erc8183Provider,
      a2a: hit.a2a ?? agent.a2a,
    };
  });
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
    <ul className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
      {agents.map((agent) => {
        const selected = selectedId === agent.agentId;
        const probe = health[agent.agentId];
        const x402 = agent.supportedAssets.includes("U");
        const placeholder = !demo && isPlaceholderEndpoint(agent);
        const hasMcp = agentHasMcp(agent);
        const endpoints = endpointView[agent.agentId] ?? agentEndpoints(agent);
        const shownUrl = endpoints.a2a ?? endpoints.mcp;
        const usagePrice =
          probe?.priceLabel ??
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
              className={`agent-card w-full ${selected ? "is-selected" : ""}`}
            >
              <div className="agent-card-meta">
                <div className="agent-card-badges">
                  <span className="agent-card-studio">ERC-8004</span>
                  {!demo && agent.network && (
                    <span
                      className={
                        agent.isTestnet
                          ? "agent-card-testnet"
                          : "agent-card-chain"
                      }
                    >
                      {agent.network}
                    </span>
                  )}
                </div>
                {agent.verified && (
                  <span className="agent-card-verified" aria-label="verified">
                    ✓
                  </span>
                )}
              </div>
              <header className="agent-card-header">
                <p className="agent-card-title">{agent.name}</p>
                <p className="agent-card-category">
                  {agent.shortDescription ||
                    (demo ? agent.slug : `#${agent.agentId.split(":").at(-1)}`)}
                </p>
              </header>
              <div className="agent-card-tags">
                {protocolBadges.map((p) => (
                  <span key={p} className="badge-gray">
                    {p}
                  </span>
                ))}
                {!demo &&
                  levels.map((label) => (
                    <span key={label} className="badge-green">
                      {label}
                    </span>
                  ))}
                {!demo && (
                  <span className={hasMcp ? "badge-green" : "badge-gray"}>
                    {hasMcp ? "MCP" : "sin MCP"}
                  </span>
                )}
                {x402 && <span className="badge-green">x402 $U</span>}
                {agent.erc8183Provider && (
                  <span className="badge-green">8183</span>
                )}
                {usagePrice && <span className="badge-gray">{usagePrice}</span>}
                {demo && <span className="badge-gray">JSON fijo</span>}
                {placeholder && (
                  <span className="badge-yellow">placeholder URL</span>
                )}
              </div>
              <p className="font-mono-data text-[11px] text-surface-500">
                {shortenAddress(agent.agentWallet)}
              </p>
              {probe && (
                <p
                  className={`mt-2 font-mono-data text-[11px] ${
                    probe.healthy ? "text-brand-500" : "text-red-400"
                  }`}
                >
                  A2A {probe.status}
                  {probe.error ? ` · ${probe.error}` : ""}
                </p>
              )}
            </button>
            <div className="mt-2 min-w-0 space-y-1 px-1">
              <EndpointLink label="MCP" href={endpoints.mcp} />
              <EndpointLink label="A2A" href={endpoints.a2a} />
              {agent.agentId in endpointView && !shownUrl && (
                <p className="font-mono-data text-[11px] text-surface-500">
                  sin endpoint A2A/MCP
                </p>
              )}
            </div>
            {(onCheckHealth || onViewEndpoint) && (
              <div className="mt-1 flex justify-end gap-3">
                {onViewEndpoint && !isHttpUrl(endpoints.mcp) && !isHttpUrl(endpoints.a2a) && (
                  <button
                    type="button"
                    disabled={loadingEndpoint === agent.agentId}
                    onClick={() => onViewEndpoint(agent)}
                    className="px-2 py-1 font-mono-data text-[11px] text-brand-500 underline disabled:opacity-40"
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
                    className="px-2 py-1 font-mono-data text-[11px] text-brand-500 underline disabled:opacity-40"
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
      className="block max-w-full truncate font-mono-data text-[11px] text-brand-500 underline"
      title={href}
    >
      {label}: {href}
    </a>
  );
}

