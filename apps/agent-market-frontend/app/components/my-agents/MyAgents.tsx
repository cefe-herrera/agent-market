"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useI18n } from "@/app/context/I18nProvider";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  ERC8183_TOKEN_DECIMALS,
  getErc8183,
} from "@/app/lib/erc8183/addresses";
import { loadStoredJobs } from "@/app/lib/erc8183/jobs-store";
import { readJob } from "@/app/lib/erc8183/read";
import { JOB_STATUS_LABEL, JobStatus } from "@/app/lib/erc8183/types";
import { loadStoredHires, type StoredX402Hire } from "@/app/lib/hires-store";
import { x402PaymentConfig } from "@/app/lib/x402-usdc";

const ConnectWallet = dynamic(
  () => import("../connection/ConnectWallet"),
  { ssr: false },
);

type ListedHire = {
  id: string;
  rail: "x402" | "8183";
  name: string;
  status: string;
  amount: string;
  asset: string;
  createdAt: number;
  href?: string;
  agentId?: string | null;
};

function statusClass(status: string): string {
  if (status === "PAID" || status === "COMPLETED" || status === "FUNDED") {
    return "badge-green";
  }
  if (status === "REJECTED" || status === "EXPIRED") return "badge-red";
  if (status === "SUBMITTED" || status === "OPEN") return "badge-yellow";
  return "badge-gray";
}

export default function MyAgents() {
  const { t, lang } = useI18n();
  const { account, isConnected } = useWalletReady();
  const cfg = getErc8183();
  const x402 = x402PaymentConfig();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ListedHire[]>([]);

  useEffect(() => {
    if (!account) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      const x402Hires = loadStoredHires(x402.chainId, account as string);
      const jobs = loadStoredJobs(cfg.chainId, account as string);
      const listed: ListedHire[] = x402Hires.map((hire: StoredX402Hire) => ({
        id: hire.id,
        rail: "x402",
        name: hire.agentName || hire.agentId || hire.payTo,
        status: "PAID",
        amount: hire.amount,
        asset: hire.asset,
        createdAt: hire.createdAt,
        href: hire.tx ? `${x402.explorerTx}/${hire.tx}` : undefined,
        agentId: hire.agentId,
      }));

      await Promise.all(
        jobs.map(async (job) => {
          let status = "FUNDED";
          let amount = "—";
          try {
            const onchain = await readJob(BigInt(job.jobId), cfg.chainId);
            status = JOB_STATUS_LABEL[onchain.status as JobStatus] ?? status;
            amount = formatUnits(onchain.budget, ERC8183_TOKEN_DECIMALS);
          } catch {
            /* keep local snapshot */
          }
          listed.push({
            id: `8183:${job.jobId}`,
            rail: "8183",
            name: job.agentName || job.agentId || job.provider,
            status,
            amount,
            asset: "$U",
            createdAt: job.createdAt,
            href: job.hashes.fund
              ? `${cfg.explorerTx}/${job.hashes.fund}`
              : job.hashes.create
                ? `${cfg.explorerTx}/${job.hashes.create}`
                : undefined,
            agentId: job.agentId,
          });
        }),
      );

      listed.sort((a, b) => b.createdAt - a.createdAt);
      if (!cancelled) {
        setItems(listed);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [account, cfg.chainId, cfg.explorerTx, x402.chainId, x402.explorerTx]);

  const locale = lang === "es" ? "es-AR" : "en-US";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="label-terminal mb-3">// {t("myAgents.title")}</p>
      <h1 className="mb-2 font-pixel text-2xl text-surface-950">
        {t("myAgents.title")}
      </h1>
      <p className="mb-8 font-mono-data text-sm text-surface-500">
        {t("myAgents.subtitle")}
      </p>

      {!isConnected || !account ? (
        <div className="card py-12 text-center">
          <p className="mb-4 font-mono-data text-sm text-surface-500">
            {t("wallet.connectPrompt")}
          </p>
          <div className="flex justify-center">
            <ConnectWallet />
          </div>
        </div>
      ) : loading ? (
        <p className="font-mono-data text-sm text-surface-500">
          {t("myAgents.loading")}
        </p>
      ) : items.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-mono-data text-sm text-surface-500">
            {t("myAgents.empty")}
          </p>
          <Link href="/#mercado" className="btn-primary mt-4 inline-block">
            {t("myAgents.browse")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((hire) => (
            <article key={hire.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono-data text-sm font-medium text-surface-950">
                      {hire.name}
                    </h3>
                    <span className={statusClass(hire.status)}>
                      {t(`status.${hire.status}`)}
                    </span>
                    <span className="badge-gray">{hire.rail}</span>
                  </div>
                  {hire.agentId && (
                    <p className="mt-1 break-all font-mono-data text-xs text-surface-500">
                      {hire.agentId}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link href="/#mercado" className="btn-secondary text-xs">
                    {t("myAgents.view")}
                  </Link>
                  {hire.href && (
                    <a
                      href={hire.href}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary text-xs"
                    >
                      tx
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="font-mono-data text-xs text-surface-500">
                    {t("myAgents.capital")}
                  </p>
                  <p className="font-mono-data font-medium text-surface-950">
                    {hire.amount} {hire.asset}
                  </p>
                </div>
                <div>
                  <p className="font-mono-data text-xs text-surface-500">
                    {t("myAgents.activated")}
                  </p>
                  <p className="font-mono-data font-medium text-surface-950">
                    {new Date(hire.createdAt).toLocaleDateString(locale)}
                  </p>
                </div>
                <div>
                  <p className="font-mono-data text-xs text-surface-500">
                    {t("myAgents.rail")}
                  </p>
                  <p className="font-mono-data font-medium text-surface-950">
                    {hire.rail}
                  </p>
                </div>
                <div>
                  <p className="font-mono-data text-xs text-surface-500">
                    {t("myAgents.hireId")}
                  </p>
                  <p className="break-all font-mono-data text-xs text-surface-800">
                    {hire.id.length > 18
                      ? `${hire.id.slice(0, 14)}…`
                      : hire.id}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
