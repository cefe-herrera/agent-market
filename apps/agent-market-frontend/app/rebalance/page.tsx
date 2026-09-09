"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import RebalanceAgentCard from "@/app/components/marketplace/RebalanceAgentCard";
import { rebalanceMarketplaceAgents } from "@/app/lib/gemini/catalog";
import { REBALANCE_SKILLS } from "@/app/lib/gemini/skills";
import type { MarketplaceAgent } from "@/app/lib/agents";
import { useI18n } from "@/app/context/I18nProvider";

const WalletStatus = dynamic(
  () => import("@/app/components/connection/WalletStatus"),
  {
    ssr: false,
    loading: () => null,
  },
);

export default function RebalancePage() {
  const { t } = useI18n();
  const agents = rebalanceMarketplaceAgents();
  const [selected, setSelected] = useState<MarketplaceAgent>(agents[0]);

  return (
    <div className="flex-1">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="label-terminal mb-3">// {t("rebalance.badge")}</p>
        <h1 className="font-pixel-square text-2xl text-surface-950">
          {t("rebalance.title")}
        </h1>
        <p className="mt-3 max-w-2xl font-mono-data text-sm text-surface-500">
          {t("rebalance.subtitle")}
        </p>
      </section>

      <section className="section-dark py-16 pb-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
              {agents.map((agent) => (
                <li key={agent.agentId} className="min-w-0 max-w-full">
                  <RebalanceAgentCard
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
                {REBALANCE_SKILLS.map((skill) => (
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
