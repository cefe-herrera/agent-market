"use client";

import { useEffect, useState } from "react";
import type { MarketplaceAgent } from "@/app/lib/agents";
import { isIndexerCatalogAgent } from "@/app/lib/agents";
import {
  buildCatalogSummary,
  type CatalogSummary,
} from "@/app/lib/catalog-summary";
import { demoMarketplaceAgents } from "@/app/lib/demo-agents";
import { geminiMarketplaceAgents } from "@/app/lib/gemini/catalog";
import { loadLocalMerchants } from "@/app/lib/merchant/client-store";
import { mergeCatalogWithMerchants } from "@/app/lib/merchant/to-catalog";
import { frontendBscChainId, frontendNetworkMode } from "@/app/lib/network";
import { marketplaceAgentsUrl } from "@/app/lib/nest-routes";
import type { Lang } from "@/app/lib/i18n";

export function useMarketplaceCatalog(lang: Lang) {
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const network = frontendNetworkMode();
    const isTestnet = network === "testnet";
    const chainId = frontendBscChainId(network);

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          marketplaceAgentsUrl(
            `?isTestnet=${isTestnet}&chainId=${chainId}&usable=true`,
          ),
          { cache: "no-store" },
        );
        const payload = (await res.json().catch(() => null)) as
          | MarketplaceAgent[]
          | { data?: MarketplaceAgent[] }
          | null;
        const listed = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        const indexed = listed.filter((agent) =>
          isIndexerCatalogAgent(agent, network),
        );
        const merchants = loadLocalMerchants().filter(
          (item) => item.chainId === chainId,
        );
        const merged = mergeCatalogWithMerchants(indexed, merchants);
        const gemini = geminiMarketplaceAgents();
        const demo = isTestnet ? demoMarketplaceAgents() : [];
        const byId = new Map<string, MarketplaceAgent>();
        for (const agent of [...gemini, ...merged, ...demo]) {
          byId.set(agent.agentId, agent);
        }
        const agents = [...byId.values()];
        if (!cancelled) {
          setSummary(buildCatalogSummary(agents, lang));
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = buildCatalogSummary(geminiMarketplaceAgents(), lang);
          setSummary(fallback);
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
  }, [lang]);

  return { summary, loading, error };
}
