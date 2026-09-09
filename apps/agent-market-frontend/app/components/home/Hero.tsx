"use client";

import Link from "next/link";
import { CATEGORIES } from "@/app/lib/i18n";
import { useI18n } from "@/app/context/I18nProvider";

export type HeroStats = {
  agents: number;
  categories: number;
  chains: number;
  verified: number;
};

export default function Hero({ stats }: { stats: HeroStats }) {
  const { t } = useI18n();

  return (
    <>
      <section className="hero-section mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-28 lg:px-8">
        <p className="hero-eyebrow mb-8 justify-center">// {t("home.badge")}</p>
        <h1 className="mx-auto max-w-3xl">
          <span className="hero-line-pixel hero-line-pixel--white">
            {t("home.heroLine1")}
          </span>
          <span className="hero-line-pixel hero-line-pixel--accent">
            {t("home.heroLine2")}
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-xl font-mono-data text-sm leading-relaxed text-surface-500 sm:text-[15px]">
          {t("home.subtitle")}
        </p>
        <div className="mx-auto mt-14 max-w-3xl stats-bar">
          <div className="stat-item">
            <p className="stat-value">{stats.agents}</p>
            <p className="stat-label">{t("home.statAgents")}</p>
          </div>
          <div className="stat-item">
            <p className="stat-value">{stats.categories}</p>
            <p className="stat-label">{t("home.statCategories")}</p>
          </div>
          <div className="stat-item">
            <p className="stat-value">{stats.chains}</p>
            <p className="stat-label">{t("home.statChains")}</p>
          </div>
          <div className="stat-item">
            <p className="stat-value">{stats.verified}</p>
            <p className="stat-label">{t("home.statVerified")}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              className="card-interactive group cursor-pointer no-underline"
            >
              <h3 className="font-mono-data text-sm font-medium text-surface-950 group-hover:text-brand-500">
                {t(`categoryName.${cat.id}`)}
              </h3>
              <p className="mt-2 font-mono-data text-xs leading-relaxed text-surface-500">
                {t(`categoryTagline.${cat.id}`)}
              </p>
              <span className="mt-4 inline-block font-mono-data text-xs text-brand-500">
                {t("common.explore")} →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
