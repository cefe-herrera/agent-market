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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10 lg:flex-row">
      <div className="min-w-0 flex-1">
        <AgentCatalog
          selectedId={selected?.agentId ?? null}
          onSelect={setSelected}
        />
      </div>
      <div className="w-full shrink-0 lg:w-[26rem]">
        <WalletStatus
          selectedPayTo={selected?.agentWallet}
          selectedName={selected?.name}
          selectedAgentId={selected?.agentId}
        />
      </div>
    </div>
  );
}
