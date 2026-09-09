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
  { href: "/yield", key: "nav.yield" },
  { href: "/rebalance", key: "nav.rebalancing" },
  { href: "/#mercado", key: "nav.marketplace" },
  { href: "/grid", key: "nav.gridTrading" },
  { href: "/health", key: "nav.healthFactor" },
] as const;

export default function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const onMyAgents = pathname === "/my-agents";
  const onSell = pathname === "/sell";
  const onYield = pathname === "/yield";
  const onRebalance = pathname === "/rebalance";
  const onGrid = pathname === "/grid";
  const onHealth = pathname === "/health";

  return (
    <header className="sticky top-0 z-50 border-b border-surface-300 bg-surface-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 no-underline" aria-label="4Agents">
          <span className="font-pixel text-lg text-brand-500 glow-accent">
            4<span className="text-surface-950">Agents</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-4 lg:flex">
          {NAV.map((item) => {
            const active =
              (item.key === "nav.yield" && onYield) ||
              (item.key === "nav.rebalancing" && onRebalance) ||
              (item.key === "nav.gridTrading" && onGrid) ||
              (item.key === "nav.healthFactor" && onHealth) ||
              (item.key === "nav.marketplace" && pathname === "/");
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`nav-link whitespace-nowrap ${active ? "nav-link-active" : ""}`}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <ConnectWallet />
          <Link
            href="/sell"
            className={`btn-secondary whitespace-nowrap !px-3 !py-1.5 text-xs ${onSell ? "bg-brand-400/20" : ""}`}
          >
            {t("nav.sell")}
          </Link>
          <Link
            href="/my-agents"
            className={`btn-primary whitespace-nowrap !px-3 !py-1.5 text-xs ${onMyAgents ? "bg-brand-400" : ""}`}
          >
            {t("nav.myAgents")}
          </Link>
        </div>
      </div>
    </header>
  );
}
