"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AgentCatalog from "./components/marketplace/AgentCatalog";
import type { MarketplaceAgent } from "./lib/agents";

const WalletStatus = dynamic(() => import("./components/connection/WalletStatus"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
  ),
});

export default function Home() {
  const [selected, setSelected] = useState<MarketplaceAgent | null>(null);

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-8 px-6 py-10 md:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 overflow-hidden md:col-start-1 md:row-start-1">
        <AgentCatalog
          selectedId={selected?.agentId ?? null}
          onSelect={setSelected}
        />
      </div>
      <aside className="order-first w-full md:order-none md:col-start-2 md:row-start-1 md:sticky md:top-20 md:self-start">
        <WalletStatus
          selectedPayTo={selected?.agentWallet}
          selectedName={selected?.name}
          selectedAgentId={selected?.agentId}
        />
      </aside>
    </div>
  );
}
