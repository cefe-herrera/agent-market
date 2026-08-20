"use client";

import dynamic from "next/dynamic";

const WalletStatus = dynamic(() => import("./components/connection/WalletStatus"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <p className="text-sm text-zinc-500">Loading wallet…</p>
    </div>
  ),
});

export default function Home() {
  return <WalletStatus />;
}
