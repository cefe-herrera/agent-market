"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import IntentIcon from "@/app/components/brand/IntentIcon";
import { useI18n } from "@/app/context/I18nProvider";
import {
  CATEGORY_AGENT_IDS,
  agentFocusHref,
  type CatalogSummary,
  type CategoryId,
} from "@/app/lib/catalog-summary";
import { CATEGORIES } from "@/app/lib/i18n";

export default function IntentSelector({
  summary,
  onFocusAgent,
}: {
  summary: CatalogSummary | null;
  onFocusAgent?: (agentId: string) => void;
}) {
  const { t, lang } = useI18n();
  const [active, setActive] = useState<CategoryId>(CATEGORIES[0].id);

  const counts = summary?.categoryCounts ?? {
    YIELD_OPTIMISATION: 0,
    REBALANCING: 0,
    GRID_TRADING: 0,
    HEALTH_FACTOR_MONITORING: 0,
  };

  const previewAgent = useMemo(() => {
    const agentId = CATEGORY_AGENT_IDS[active];
    return summary?.agents.find((agent) => agent.agentId === agentId) ?? null;
  }, [active, summary]);

  function categoryBadge(categoryId: CategoryId): string {
    const count = counts[categoryId];
    const label = t(`categoryShort.${categoryId}`);
    const unit =
      count === 1
        ? lang === "es"
          ? "agente"
          : "agent"
        : lang === "es"
          ? "agentes"
          : "agents";
    return `${label} · ${Math.max(count, 1)} ${unit}`;
  }

  function goToAgent(agentId: string) {
    onFocusAgent?.(agentId);
    const el = document.getElementById("mercado");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="label-terminal mb-2">// {t("home.intentBadge")}</p>
        <h2 className="font-pixel-square text-xl text-surface-950 sm:text-2xl">
          {t("home.intentTitle")}
        </h2>
      </div>

      <div className="intent-panel">
        <div
          className="intent-list"
          role="tablist"
          aria-label={t("home.intentTitle")}
        >
          {CATEGORIES.map((cat) => {
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onMouseEnter={() => setActive(cat.id)}
                onFocus={() => setActive(cat.id)}
                onClick={() => {
                  setActive(cat.id);
                  goToAgent(CATEGORY_AGENT_IDS[cat.id]);
                }}
                className={`intent-option ${isActive ? "is-active" : ""}`}
              >
                <span className="intent-option-title">
                  <span className="mr-2 inline-flex text-brand-500">
                    <IntentIcon category={cat.id} />
                  </span>
                  {t(`intentPrompt.${cat.id}`)}
                </span>
                <p className="intent-option-tagline">
                  {t(`categoryTagline.${cat.id}`)}
                </p>
                <span className="mt-2 inline-block font-mono-data text-[10px] uppercase tracking-wide text-brand-500/80">
                  {categoryBadge(cat.id)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="intent-preview" role="tabpanel">
          <span className="intent-preview-badge">{categoryBadge(active)}</span>
          <h3 className="mt-4 font-mono-data text-base font-semibold text-surface-950">
            {previewAgent?.name ?? t(`intentPreviewName.${active}`)}
          </h3>
          <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-surface-500">
            {previewAgent?.shortDescription ?? t(`intentPreviewDesc.${active}`)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge-gray">{t("home.previewChain")}</span>
            <span className="badge-green">{t(`intentPreviewTag.${active}`)}</span>
          </div>
          <Link
            href={agentFocusHref(CATEGORY_AGENT_IDS[active])}
            onClick={() => goToAgent(CATEGORY_AGENT_IDS[active])}
            className="btn-primary mt-5 inline-flex w-fit !px-4 !py-2 text-xs"
          >
            {t("home.viewAgent")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
