"use client";

import Link from "next/link";
import { useI18n } from "@/app/context/I18nProvider";
import {
  agentFocusHref,
  getAgentDisplayMeta,
  type CatalogSummary,
} from "@/app/lib/catalog-summary";

export default function FeaturedAgents({
  summary,
  loading,
  onFocusAgent,
}: {
  summary: CatalogSummary | null;
  loading: boolean;
  onFocusAgent?: (agentId: string) => void;
}) {
  const { t } = useI18n();
  const agents = summary?.featured ?? [];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-terminal mb-2">// {t("home.featuredBadge")}</p>
          <h2 className="font-pixel-square text-xl text-surface-950 sm:text-2xl">
            {t("home.featured")}
          </h2>
        </div>
        <Link href="/#mercado" className="btn-ghost !px-3 !py-1.5 text-xs">
          {t("home.viewAllAgents")} →
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-52 animate-pulse border border-surface-300 bg-surface-100"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {agents.map((agent) => {
            const meta = getAgentDisplayMeta(agent);
            return (
              <article key={agent.agentId} className="featured-card">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {agent.protocols.slice(0, 2).map((protocol) => (
                    <span key={protocol} className="badge-gray">
                      {protocol}
                    </span>
                  ))}
                  <span className="badge-green">{agent.network}</span>
                </div>
                <h3 className="featured-card-title">{agent.name}</h3>
                <p className="mt-1 font-mono-data text-[10px] uppercase tracking-wide text-brand-500">
                  {meta.strategy}
                </p>
                <p className="mt-2 line-clamp-2 flex-1 font-sans text-xs leading-relaxed text-surface-500">
                  {agent.shortDescription}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-300 pt-3">
                  <div>
                    <p className="font-mono-data text-[9px] uppercase tracking-wide text-surface-500">
                      {t("home.featuredApy")}
                    </p>
                    <p className="mt-0.5 font-mono-data text-xs text-surface-950">
                      {meta.apyLabel ?? agent.verification?.priceLabel ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono-data text-[9px] uppercase tracking-wide text-surface-500">
                      {t("home.featuredRisk")}
                    </p>
                    <p className="mt-0.5 font-mono-data text-xs text-surface-950">
                      {t(`home.risk.${meta.risk}`)}
                    </p>
                  </div>
                </div>
                <Link
                  href={agentFocusHref(agent.agentId)}
                  onClick={() => onFocusAgent?.(agent.agentId)}
                  className="btn-primary mt-4 inline-flex w-full justify-center !py-2 text-xs"
                >
                  {t("home.viewDetail")}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
