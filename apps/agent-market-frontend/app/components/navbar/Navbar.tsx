"use client";

import dynamic from "next/dynamic";

const ConnectWallet = dynamic(() => import("../connection/ConnectWallet"), {
  ssr: false,
});

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <a href="/" className="text-sm font-semibold tracking-tight">
          BNB Agent Market
        </a>
        <ConnectWallet />
      </div>
    </nav>
  );
}
