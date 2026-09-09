"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import YieldAgentCard from "@/app/components/marketplace/YieldAgentCard";
import { yieldMarketplaceAgents } from "@/app/lib/gemini/catalog";
import { YIELD_AGENT_ID } from "@/app/lib/gemini/ids";
import { YIELD_SKILLS } from "@/app/lib/gemini/skills";
import type { MarketplaceAgent } from "@/app/lib/agents";
import { useI18n } from "@/app/context/I18nProvider";
import { loadLocalMerchants } from "@/app/lib/merchant/client-store";
import { mergeCatalogWithMerchants } from "@/app/lib/merchant/to-catalog";
import type { PublicMerchant } from "@/app/lib/merchant/types";

const WalletStatus = dynamic(
  () => import("@/app/components/connection/WalletStatus"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function YieldPage() {
  const { t } = useI18n();
  const [agents, setAgents] = useState<MarketplaceAgent[]>(() =>
    yieldMarketplaceAgents(),
  );
  const [selected, setSelected] = useState<MarketplaceAgent>(agents[0]);
  const [tokenId, setTokenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const local = loadLocalMerchants();
    const merged = mergeCatalogWithMerchants(yieldMarketplaceAgents(), local);
    setAgents(merged);
    setSelected((prev) => merged.find((item) => item.agentId === prev.agentId) ?? merged[0]);
    const remembered = local.find(
      (item) =>
        item.agentId === YIELD_AGENT_ID || item.catalogId === YIELD_AGENT_ID,
    );
    if (remembered?.tokenId) setTokenId(remembered.tokenId);

    void fetch(`/api/merchant?id=${encodeURIComponent(YIELD_AGENT_ID)}`, {
      cache: "no-store",
    })
      .then(async (res) => (res.ok ? ((await res.json()) as PublicMerchant) : null))
      .then((merchant) => {
        if (cancelled || !merchant) return;
        if (merchant.tokenId) setTokenId(merchant.tokenId);
        const next = mergeCatalogWithMerchants(yieldMarketplaceAgents(), [
          merchant,
          ...local,
        ]);
        setAgents(next);
        setSelected(
          (prev) => next.find((item) => item.agentId === prev.agentId) ?? next[0],
        );
      })
      .catch(() => {
        /* local overlay is enough */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="label-terminal mb-3">// {t("yield.badge")}</p>
        <h1 className="font-pixel-square text-2xl text-surface-950">
          {t("yield.title")}
        </h1>
        <p className="mt-3 max-w-2xl font-mono-data text-sm text-surface-500">
          {t("yield.subtitle")}
        </p>
        <p className="mt-4 font-mono-data text-sm">
          {tokenId ? (
            <span className="text-brand-500">
              ERC-8004 token #{tokenId}. Si cambia el dominio,{" "}
              <Link href="/sell?template=yield" className="underline">
                actualizá la URI
              </Link>
              .
            </span>
          ) : (
            <Link
              href="/sell?template=yield"
              className="text-brand-500 underline"
            >
              {t("yield.register")}
            </Link>
          )}
        </p>
      </section>

      <section className="section-dark py-16 pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
              {agents.map((agent) => (
                <li key={agent.agentId} className="min-w-0 max-w-full">
                  <YieldAgentCard
                    agent={agent}
                    selected={selected.agentId === agent.agentId}
                    onSelect={setSelected}
                  />
                </li>
              ))}
            </ul>
            <div>
              <p className="label-terminal mb-3">skills · Agent Card</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {YIELD_SKILLS.map((skill) => (
                  <li
                    key={skill.id}
                    className="border border-surface-300 px-3 py-2"
                  >
                    <p className="font-mono-data text-xs font-semibold text-surface-950">
                      {skill.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-surface-500">
                      {skill.description}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-surface-500">
                      {skill.tags.join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <WalletStatus
            selectedPayTo={selected.agentWallet}
            selectedName={selected.name}
            selectedAgentId={selected.agentId}
            selected8183Provider={selected.erc8183Provider}
          />
        </div>
      </section>
    </div>
  );
}
