"use client";

import dynamic from "next/dynamic";
import SellWizard from "@/app/components/sell/SellWizard";
import { useI18n } from "@/app/context/I18nProvider";

const ConnectWallet = dynamic(
  () => import("@/app/components/connection/ConnectWallet"),
  { ssr: false },
);

export default function SellPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="label-terminal mb-3">// {t("sell.badge")}</p>
      <h1 className="mb-2 font-pixel text-2xl text-surface-950">
        {t("sell.title")}
      </h1>
      <p className="mb-8 font-mono-data text-sm text-surface-500">
        {t("sell.subtitle")}
      </p>
      <div className="mb-6">
        <ConnectWallet />
      </div>
      <SellWizard />
    </div>
  );
}
