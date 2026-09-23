"use client";

import { useI18n } from "@/app/context/I18nProvider";
import type { CatalogSummary } from "@/app/lib/catalog-summary";

export default function HomeMetrics({
  summary,
  loading,
}: {
  summary: CatalogSummary | null;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (loading && !summary) {
    return (
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="stats-grid animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="stat-item">
              <div className="mx-auto h-10 w-16 bg-surface-200" />
              <div className="mx-auto mt-2 h-3 w-20 bg-surface-200" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!summary) return null;

  const { stats } = summary;
  const metrics = [
    {
      value: stats.agents,
      label: t("home.statAgents"),
      hint: stats.agentsHint ?? undefined,
    },
    {
      value: stats.activeAgents,
      label: t("home.statActive"),
      hint:
        stats.activeAgents > 0
          ? t("home.statActiveHint")
          : undefined,
    },
    {
      value: stats.chains,
      label: t("home.statChains"),
      hint: stats.chainsHint ?? undefined,
    },
    {
      value: stats.protocols,
      label: t("home.statProtocols"),
      hint: stats.protocolsHint ?? undefined,
    },
  ];

  return (
    <section
      className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8"
      aria-label={t("home.metricsAria")}
    >
      <div className="stats-grid sm:grid-cols-4">
        {metrics.map((item) => (
          <div key={item.label} className="stat-item">
            <p className="stat-value">{item.value}</p>
            <p className="stat-label">{item.label}</p>
            {item.hint ? <p className="stat-hint">{item.hint}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
