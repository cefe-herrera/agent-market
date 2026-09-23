"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/app/context/I18nProvider";

const NAV = [
  { href: "/yield", key: "nav.yield" },
  { href: "/rebalance", key: "nav.rebalancing" },
  { href: "/#mercado", key: "nav.marketplace" },
  { href: "/grid", key: "nav.gridTrading" },
  { href: "/health", key: "nav.healthFactor" },
  { href: "/my-agents", key: "nav.myAgents" },
  { href: "/sell", key: "nav.publishAgent" },
] as const;

export default function MobileNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={t("nav.menu")}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center border border-surface-300 font-mono-data text-sm text-surface-700"
      >
        {open ? "×" : "≡"}
      </button>
      {open ? (
        <nav className="absolute inset-x-0 top-14 z-50 border-b border-surface-300 bg-surface-50/98 px-4 py-3 backdrop-blur-md">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href.replace("/#mercado", "/") ||
                (item.href === "/#mercado" && pathname === "/");
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`block px-2 py-2 font-mono-data text-sm no-underline ${
                      active
                        ? "text-brand-500"
                        : "text-surface-600 hover:text-surface-950"
                    }`}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
