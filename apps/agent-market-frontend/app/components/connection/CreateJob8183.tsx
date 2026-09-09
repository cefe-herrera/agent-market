"use client";

import { useEffect, useState } from "react";
import { formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import { isPimlicoConfigured } from "@/app/lib/aa/addresses";
import { createAndFundJobBatched } from "@/app/lib/aa/batch-8183";
import { useBuyerSafe } from "@/app/lib/aa/useBuyerSafe";
import type { SafeOwnerWallet } from "@/app/lib/aa/safe7579";
import { ERC8183_TOKEN_DECIMALS, getErc8183 } from "@/app/lib/erc8183/addresses";
import { loadStoredJobs, rememberJob } from "@/app/lib/erc8183/jobs-store";
import { readJob } from "@/app/lib/erc8183/read";
import { JOB_STATUS_LABEL, JobStatus, type Job } from "@/app/lib/erc8183/types";
import { local8183Provider } from "@/app/lib/merchant/client-store";
import {
  buildJobDescription,
  claimRefund,
  dispute,
  settle,
  type Erc8183Wallet,
} from "@/app/lib/erc8183/write";
import { isGeminiAgentId } from "@/app/lib/gemini/ids";

const STEPS = ["checking", "bundling", "creating", "funding", "done"] as const;

const STEP_LABEL: Record<(typeof STEPS)[number], string> = {
  checking: "paymentToken() == $U",
  bundling: "UserOp batch 8183",
  creating: "fallback createJob",
  funding: "register + fund",
  done: "FUNDED — waiting submit",
};

export default function CreateJob8183({
  selectedName,
  selectedAgentId,
  selected8183Provider,
}: {
  selectedPayTo?: string | null;
  selectedName?: string | null;
  selectedAgentId?: string | null;
  selected8183Provider?: string | null;
}) {
  const { account, walletClient, isConnected, chainId } = useWalletReady();
  const buyer = useBuyerSafe();
  const cfg = getErc8183();
  const [description, setDescription] = useState("marketplace hire");
  const [budget, setBudget] = useState("0.01");
  const [step, setStep] = useState<(typeof STEPS)[number] | "idle">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<bigint | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [stored, setStored] = useState<string[]>([]);
  const [acting, setActing] = useState<string | null>(null);
  const [provider, setProvider] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (isGeminiAgentId(selectedAgentId)) {
      setDescription((prev) =>
        prev === "marketplace hire"
          ? "Route idle $U to the highest available APR on BSC (advisory, do not execute)."
          : prev,
      );
    }
  }, [selectedAgentId]);

  useEffect(() => {
    let cancelled = false;
    async function resolveProvider() {
      const fromProp =
        selected8183Provider && isAddress(selected8183Provider)
          ? getAddress(selected8183Provider)
          : null;
      const fromLocal = local8183Provider(selectedAgentId);
      if (fromProp || fromLocal) {
        if (!cancelled) setProvider(fromProp ?? fromLocal);
        return;
      }
      if (!selectedAgentId) {
        if (!cancelled) setProvider(null);
        return;
      }
      try {
        const [listingRes, cardRes] = await Promise.all([
          fetch(`/api/merchant?id=${encodeURIComponent(selectedAgentId)}`, {
            cache: "no-store",
          }),
          fetch(
            `/api/marketplace/agents/${encodeURIComponent(selectedAgentId)}/card`,
            { cache: "no-store" },
          ),
        ]);
        if (listingRes.ok) {
          const listing = (await listingRes.json()) as { provider8183?: string };
          if (listing.provider8183 && isAddress(listing.provider8183)) {
            if (!cancelled) setProvider(getAddress(listing.provider8183));
            return;
          }
        }
        if (cardRes.ok) {
          const preview = (await cardRes.json()) as {
            erc8183Provider?: string | null;
            card?: { erc8183?: { provider?: string } };
          };
          const raw =
            preview.erc8183Provider ?? preview.card?.erc8183?.provider ?? null;
          if (raw && isAddress(raw)) {
            if (!cancelled) setProvider(getAddress(raw));
            return;
          }
        }
      } catch {
        /* hide 8183 if this listing has no Safe */
      }
      if (!cancelled) setProvider(null);
    }
    void resolveProvider();
    return () => {
      cancelled = true;
    };
  }, [selected8183Provider, selectedAgentId]);

  const onPaymentChain = chainId === cfg.chainId;
  const busy = step !== "idle" && step !== "done";
  const ready =
    isConnected &&
    Boolean(account) &&
    Boolean(walletClient?.account) &&
    Boolean(provider) &&
    Boolean(buyer.safe) &&
    isPimlicoConfigured() &&
    Boolean(selectedAgentId) &&
    onPaymentChain;

  useEffect(() => {
    if (!account) {
      setStored([]);
      return;
    }
    const fromEoa = loadStoredJobs(cfg.chainId, account);
    const fromSafe = buyer.safe
      ? loadStoredJobs(cfg.chainId, buyer.safe)
      : [];
    const ids = [
      ...new Set([...fromEoa, ...fromSafe].map((item) => item.jobId)),
    ];
    setStored(ids);
  }, [account, buyer.safe, cfg.chainId]);

  useEffect(() => {
    if (activeJobId === null) {
      setJob(null);
      return;
    }
    let cancelled = false;
    void readJob(activeJobId, cfg.chainId)
      .then((next) => {
        if (!cancelled) setJob(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeJobId, cfg.chainId, step, acting]);

  async function onCreate() {
    if (!account || !walletClient?.account || !provider) return;
    setError(null);
    setTx(null);
    setJob(null);
    try {
      const amount = parseUnits(budget.trim() || "0", ERC8183_TOKEN_DECIMALS);
      setStep("checking");
      const result = await createAndFundJobBatched(
        walletClient as unknown as SafeOwnerWallet,
        {
          provider,
          amount,
          chainId: cfg.chainId,
          description: buildJobDescription({
            task: description.trim() || "marketplace hire",
            agentId: selectedAgentId,
            agentName: selectedName,
          }),
          onStep: (next, extra) => {
            if (STEPS.includes(next as (typeof STEPS)[number])) {
              setStep(next as (typeof STEPS)[number]);
            }
            if (extra?.jobId !== undefined) setActiveJobId(extra.jobId);
            if (extra?.hash) setTx(extra.hash);
          },
        },
      );
      setActiveJobId(result.jobId);
      setTx(result.hashes.fund ?? result.hashes.create);
      rememberJob({
        jobId: result.jobId.toString(),
        chainId: cfg.chainId,
        client: result.buyerSafe,
        ownerEoa: account,
        provider,
        createdAt: Date.now(),
        agentId: selectedAgentId,
        agentName: selectedName,
        hashes: result.hashes,
      });
      setStored((prev) => [
        result.jobId.toString(),
        ...prev.filter((id) => id !== result.jobId.toString()),
      ]);
      buyer.refresh();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("idle");
    }
  }

  async function onJobAction(
    name: string,
    fn: () => Promise<{ hash: string }>,
  ) {
    if (!activeJobId) return;
    setError(null);
    setActing(name);
    try {
      const result = await fn();
      setTx(result.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  const stepIndex = STEPS.indexOf(step === "idle" ? "checking" : step);

  return (
    <div className="mt-8 border-t border-surface-300 pt-6">
      <p className="label-terminal">ERC-8183 · escrow</p>
      <h2 className="mt-2 font-pixel-square text-lg text-surface-950">
        Crear job 8183
      </h2>
      <p className="mt-2 font-mono-data text-sm leading-6 text-surface-500">
        Otro riel: un UserOp desde tu Buyer Safe 7579. x402 sigue siendo el hit
        HTTP de la EOA. El <code>provider</code> es el Agent Safe, no el
        agentWallet 8004.
      </p>

      <dl className="mt-4 grid gap-2 font-mono-data text-xs">
        <Row label="commerce" value={cfg.commerce} />
        <Row
          label="buyer safe"
          value={
            buyer.safe
              ? `${buyer.safe}${buyer.deployed ? "" : " · counterfactual"}`
              : "conectá la wallet"
          }
        />
        <Row label="safe BNB" value={buyer.bnbLabel} warn={buyer.bnb === BigInt(0)} />
        <Row
          label="safe $U"
          value={buyer.uLabel}
          warn={buyer.uBalance === BigInt(0)}
        />
        <Row
          label="provider (agent SA)"
          value={
            provider
              ? `${provider}${selectedName ? ` · ${selectedName}` : ""}`
              : "este listing no publicó Agent Safe 7579"
          }
          warn={!provider}
        />
        <Row
          label="chain"
          value={`${cfg.chainId} (${cfg.isMainnet ? "bsc mainnet" : "bsc testnet"})`}
        />
      </dl>

      {buyer.safe && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!walletClient || buyer.funding !== null}
            onClick={() => void buyer.fundBnb()}
            className="btn-secondary !px-3 !py-1 text-[11px]"
          >
            {buyer.funding === "bnb" ? "enviando…" : "Enviar 0.002 BNB al Safe"}
          </button>
          <button
            type="button"
            disabled={!walletClient || buyer.funding !== null}
            onClick={() => void buyer.fundU(budget.trim() || "0.01")}
            className="btn-secondary !px-3 !py-1 text-[11px]"
          >
            {buyer.funding === "u"
              ? "enviando…"
              : `Enviar ${budget || "0.01"} $U al Safe`}
          </button>
        </div>
      )}

      <label className="mt-4 flex flex-col gap-1 text-xs">
        <span className="font-mono-data uppercase tracking-wider text-surface-500">
          descripción
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input-field text-xs"
        />
      </label>

      <label className="mt-3 flex flex-col gap-1 text-xs">
        <span className="font-mono-data uppercase tracking-wider text-surface-500">
          budget $U
        </span>
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          inputMode="decimal"
          className="input-field h-11 text-xs"
        />
      </label>

      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void onCreate()}
        className="btn-secondary mt-4 h-12 w-full"
      >
        {busy
          ? `${STEP_LABEL[step] ?? step}…`
          : "Firmar UserOp (batch 8183)"}
      </button>

      {!ready && (
        <p className="mt-2 text-xs text-amber-400">
          {!provider
            ? "Este agente no publicó un Agent Safe 7579 — solo Agent Card + x402. Registralo en /sell."
            : !isPimlicoConfigured()
              ? "Falta NEXT_PUBLIC_PIMLICO_API_KEY para el bundler."
              : "Conectá la wallet en chain " +
                cfg.chainId +
                ", fondeá BNB+$U al Buyer Safe y firmá un UserOp. El submit lo hace el worker del agente."}
        </p>
      )}

      {(step !== "idle" || activeJobId) && (
        <ol className="mt-4 space-y-1 text-[11px]">
          {STEPS.map((name, index) => {
            const done =
              step === "done" || (step !== "idle" && index < stepIndex);
            const current = name === step;
            return (
              <li
                key={name}
                className={
                  current
                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : done
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-zinc-400"
                }
              >
                {done ? "✓" : current ? "→" : "·"} {STEP_LABEL[name]}
              </li>
            );
          })}
        </ol>
      )}

      {job && (
        <div className="mt-4 border border-surface-300 p-3">
          <p className="font-mono-data text-xs text-surface-950">
            job #{job.id.toString()} · {JOB_STATUS_LABEL[job.status]}
          </p>
          <p className="mt-1 font-mono-data text-[11px] text-surface-500">
            budget {formatUnits(job.budget, ERC8183_TOKEN_DECIMALS)} $U
          </p>
          <p className="mt-1 break-all font-mono-data text-[11px] text-surface-500">
            client {job.client}
          </p>
          <p className="mt-1 break-all font-mono-data text-[11px] text-surface-500">
            provider {job.provider}
          </p>
          {job.status === JobStatus.FUNDED && (
            <p className="mt-2 font-mono-data text-[11px] text-amber-400">
              Esperando submit del agente (session key + worker).
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                !walletClient ||
                !account ||
                acting !== null ||
                job.status !== JobStatus.SUBMITTED
              }
              onClick={() =>
                void onJobAction("settle", () =>
                  settle(walletClient as unknown as Erc8183Wallet, job.id, {
                    account: account!,
                    chainId: cfg.chainId,
                  }),
                )
              }
              className="btn-secondary !px-3 !py-1 text-[11px]"
            >
              {acting === "settle" ? "settle…" : "settle"}
            </button>
            <button
              type="button"
              disabled={
                !walletClient ||
                !account ||
                acting !== null ||
                job.status !== JobStatus.SUBMITTED
              }
              onClick={() =>
                void onJobAction("dispute", () =>
                  dispute(walletClient as unknown as Erc8183Wallet, job.id, {
                    account: account!,
                    chainId: cfg.chainId,
                  }),
                )
              }
              className="btn-secondary !px-3 !py-1 text-[11px]"
            >
              {acting === "dispute" ? "dispute…" : "dispute"}
            </button>
            <button
              type="button"
              disabled={!walletClient || !account || acting !== null}
              onClick={() =>
                void onJobAction("refund", () =>
                  claimRefund(walletClient as unknown as Erc8183Wallet, job.id, {
                    account: account!,
                    chainId: cfg.chainId,
                  }),
                )
              }
              className="btn-secondary !px-3 !py-1 text-[11px]"
            >
              {acting === "refund" ? "refund…" : "claimRefund"}
            </button>
          </div>
        </div>
      )}

      {stored.length > 0 && (
        <label className="mt-3 flex flex-col gap-1 text-xs">
          <span className="font-mono-data uppercase tracking-wider text-surface-500">
            tus jobs en este browser
          </span>
          <select
            value={activeJobId?.toString() ?? ""}
            onChange={(e) =>
              setActiveJobId(e.target.value ? BigInt(e.target.value) : null)
            }
            className="select-field h-10 text-xs"
          >
            <option value="">elegí un jobId</option>
            {stored.map((id) => (
              <option key={id} value={id}>
                #{id}
              </option>
            ))}
          </select>
        </label>
      )}

      {(error || buyer.error) && (
        <pre className="mt-3 whitespace-pre-wrap break-all font-mono-data text-xs text-red-400">
          {error ?? buyer.error}
        </pre>
      )}
      {tx && (
        <a
          className="mt-2 block break-all font-mono-data text-xs text-brand-500 underline"
          href={`${cfg.explorerTx}/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          tx {tx}
        </a>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border border-surface-300 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-surface-500">
        {label}
      </dt>
      <dd
        className={`break-all ${warn ? "text-amber-400" : "text-surface-800"}`}
      >
        {value}
      </dd>
    </div>
  );
}
