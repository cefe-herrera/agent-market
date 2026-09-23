"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AgentCatalog from "./components/marketplace/AgentCatalog";
import Hero from "./components/home/Hero";
import HomeMetrics from "./components/home/HomeMetrics";
import IntentSelector from "./components/home/IntentSelector";
import FeaturedAgents from "./components/home/FeaturedAgents";
import {
  ChainsStrip,
  FinalCta,
  HowItWorks,
} from "./components/home/HomeSections";
import { agentFocusHref } from "./lib/catalog-summary";
import type { MarketplaceAgent } from "./lib/agents";
import { useMarketplaceCatalog } from "./hooks/useMarketplaceCatalog";
import { useI18n } from "./context/I18nProvider";

const WalletStatus = dynamic(() => import("./components/connection/WalletStatus"), {
  ssr: false,
  loading: () => null,
});

function HomeContent() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const { summary, loading } = useMarketplaceCatalog(lang);
  const [selected, setSelected] = useState<MarketplaceAgent | null>(null);
  const [focusAgentId, setFocusAgentId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("focus");
    if (fromUrl) setFocusAgentId(fromUrl);
  }, [searchParams]);

  const handleFocusAgent = useCallback((agentId: string) => {
    setFocusAgentId(agentId);
    window.history.replaceState(null, "", agentFocusHref(agentId));
  }, []);

  return (
    <div className="flex-1">
      <Hero />
      <HomeMetrics summary={summary} loading={loading} />
      <IntentSelector summary={summary} onFocusAgent={handleFocusAgent} />
      <FeaturedAgents
        summary={summary}
        loading={loading}
        onFocusAgent={handleFocusAgent}
      />
      <HowItWorks />
      <ChainsStrip />
      <FinalCta />

      <section id="mercado" className="section-dark py-16 pb-32 scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="label-terminal mb-2">// {t("marketplace.badge")}</p>
            <h2 className="font-pixel-square text-xl text-surface-950">
              {t("marketplace.title")}
            </h2>
          </div>

          <AgentCatalog
            selectedId={selected?.agentId ?? null}
            onSelect={setSelected}
            focusAgentId={focusAgentId}
          />
          <WalletStatus
            selectedPayTo={selected?.agentWallet}
            selectedName={selected?.name}
            selectedAgentId={selected?.agentId}
            selected8183Provider={selected?.erc8183Provider}
          />
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <HomeContent />
    </Suspense>
  );
}
