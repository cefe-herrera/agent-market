"use client";

import Link from "next/link";
import { useI18n } from "@/app/context/I18nProvider";

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="hero-section mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 sm:py-14 lg:px-8">
      <p className="hero-eyebrow mb-5 justify-center">// {t("home.badge")}</p>
      <h1 className="mx-auto max-w-3xl font-pixel-square text-[clamp(1.75rem,4.5vw,3.25rem)] leading-[1.12] text-surface-950">
        {t("home.heroPrefix")}{" "}
        <span className="hero-line-pixel--accent">{t("home.heroAccent")}</span>
        {t("home.heroSuffix") ? ` ${t("home.heroSuffix")}` : ""}
      </h1>
      <p className="hero-prose mx-auto mt-5 max-w-xl">{t("home.subtitle")}</p>

      <div className="hero-actions">
        <Link href="/#mercado" className="btn-primary !px-5 !py-2.5">
          {t("home.ctaExplore")}
        </Link>
        <Link href="/sell" className="btn-ghost !px-5 !py-2.5">
          {t("nav.publishAgent")}
        </Link>
      </div>
    </section>
  );
}
