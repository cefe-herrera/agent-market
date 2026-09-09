"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AgentCatalog from "./components/marketplace/AgentCatalog";
import Hero, { type HeroStats } from "./components/home/Hero";
import type { MarketplaceAgent } from "./lib/agents";
import { useI18n } from "./context/I18nProvider";

const WalletStatus = dynamic(() => import("./components/connection/WalletStatus"), {
  ssr: false,
  loading: () => <div className="card h-64 animate-pulse" />,
});

export default function Home() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<MarketplaceAgent | null>(null);
  const [stats, setStats] = useState<HeroStats>({
    agents: 0,
    categories: 4,
    chains: 1,
    verified: 0,
  });

  return (
    <div className="flex-1">
      <Hero stats={stats} />

      <section id="mercado" className="section-dark py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="label-terminal mb-2">// {t("marketplace.badge")}</p>
            <h2 className="font-pixel-square text-xl text-surface-950">
              {t("marketplace.title")}
            </h2>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <AgentCatalog
                selectedId={selected?.agentId ?? null}
                onSelect={setSelected}
                onStats={setStats}
              />
            </div>
            <aside
              id="hire"
              className="order-first w-full lg:order-none lg:sticky lg:top-20 lg:self-start"
            >
              <WalletStatus
                selectedPayTo={selected?.agentWallet}
                selectedName={selected?.name}
                selectedAgentId={selected?.agentId}
              />
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
