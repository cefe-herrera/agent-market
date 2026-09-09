"use client";

import dynamic from "next/dynamic";
import Navbar from "./components/navbar/Navbar";
import { I18nProvider } from "./context/I18nProvider";

const Web3Provider = dynamic(
  () => import("./context/ConnectionProvider").then((mod) => mod.Web3Provider),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <Web3Provider>
        <Navbar />
        {children}
      </Web3Provider>
    </I18nProvider>
  );
}
