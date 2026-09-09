"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/app/context/I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";

const ConnectWallet = dynamic(() => import("../connection/ConnectWallet"), {
  ssr: false,
});

const NAV = [
  { href: "/#mercado", key: "nav.marketplace" },
  { href: "/#mercado", key: "nav.rebalancing" },
  { href: "/#mercado", key: "nav.gridTrading" },
  { href: "/#mercado", key: "nav.yield" },
  { href: "/#mercado", key: "nav.healthFactor" },
] as const;

export default function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const onMyAgents = pathname === "/my-agents";

  return (
    <header className="sticky top-0 z-50 border-b border-surface-300 bg-surface-50/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="font-pixel text-lg text-brand-500 glow-accent">
            agent<span className="text-surface-950">market</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-link ${!onMyAgents && item.key === "nav.marketplace" ? "nav-link-active" : ""}`}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ConnectWallet />
          <Link
            href="/my-agents"
            className={`btn-primary !px-3 !py-1.5 text-xs ${onMyAgents ? "bg-brand-400" : ""}`}
          >
            {t("nav.myAgents")}
          </Link>
        </div>
      </div>
    </header>
  );
}
