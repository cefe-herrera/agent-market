"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/app/components/brand/Logo";
import { useI18n } from "@/app/context/I18nProvider";
import LanguageSwitcher from "./LanguageSwitcher";
import MobileNav from "./MobileNav";

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
      <div className="relative mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-4 lg:px-8">
        <MobileNav />
        <Logo />

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

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <Link
            href="/my-agents"
            className={`btn-ghost hidden whitespace-nowrap !px-3 !py-1.5 text-xs lg:inline-flex ${onMyAgents ? "!border-brand-500/50 !text-brand-500" : ""}`}
          >
            {t("nav.myAgents")}
          </Link>
          <Link
            href="/sell"
            className={`btn-ghost hidden whitespace-nowrap !px-3 !py-1.5 text-xs lg:inline-flex ${onSell ? "!border-brand-500/50 !text-brand-500" : ""}`}
          >
            {t("nav.publishAgent")}
          </Link>
          <ConnectWallet primary />
        </div>
      </div>
    </header>
  );
}
