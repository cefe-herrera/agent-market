"use client";

import Link from "next/link";
import { useI18n } from "@/app/context/I18nProvider";

export function HowItWorks() {
  const { t } = useI18n();
  const steps = ["discover", "compare", "activate"] as const;

  return (
    <section className="section-dark py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="label-terminal mb-2">// {t("home.howBadge")}</p>
        <h2 className="font-pixel-square text-xl text-surface-950 sm:text-2xl">
          {t("home.howTitle")}
        </h2>
        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="how-step">
              <p className="how-step-num">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-mono-data text-sm font-medium text-surface-950">
                {t(`home.howStep.${step}.title`)}
              </h3>
              <p className="mt-2 font-sans text-xs leading-relaxed text-surface-500">
                {t(`home.howStep.${step}.body`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChainsStrip() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="label-terminal mb-2">// {t("home.chainsBadge")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="badge-green">BNB Chain</span>
        <span className="font-sans text-sm text-surface-500">
          {t("home.chainsNote")}
        </span>
      </div>
    </section>
  );
}

export function FinalCta() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="home-cta-band">
        <h2 className="font-pixel-square text-xl text-surface-950 sm:text-2xl">
          {t("home.finalCtaTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg font-sans text-sm text-surface-500">
          {t("home.finalCtaSubtitle")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/#mercado" className="btn-primary !px-5 !py-2.5">
            {t("home.ctaExplore")}
          </Link>
          <Link href="/sell" className="btn-ghost !px-5 !py-2.5">
            {t("nav.publishAgent")}
          </Link>
        </div>
      </div>
    </section>
  );
}
