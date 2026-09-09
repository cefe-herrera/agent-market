"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  X402_CHAIN_ID,
  X402_EXPLORER_TX,
  X402_IS_MAINNET,
  X402_PAYMENT_USDC,
  X402_PAY_TO,
} from "@/app/lib/x402-usdc";
import {
  signExactUsdcPayment,
} from "@/app/lib/x402-client";
import type { AgentWork } from "@/app/lib/agent-work";
import { newHireId, rememberHire } from "@/app/lib/hires-store";
import FeedbackButton from "./FeedbackButton";

export function PayToField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-mono-data uppercase tracking-wider text-surface-500">
        to · quién recibe
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="0x…"
        spellCheck={false}
        className="input-field h-11 text-xs"
      />
    </label>
  );
}

export default function PayUsdcButton({
  selectedPayTo,
  selectedName,
  selectedAgentId,
  payToInput: controlledPayTo,
  onPayToInput,
  compact = false,
}: {
  selectedPayTo?: string | null;
  selectedName?: string | null;
  selectedAgentId?: string | null;
  payToInput?: string;
  onPayToInput?: (value: string) => void;
  compact?: boolean;
}) {
  const { account, walletClient, isConnected, chainId } = useWalletReady();
  const [status, setStatus] = useState<"idle" | "signing" | "settling">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [work, setWork] = useState<AgentWork | null>(null);
  const [internalPayTo, setInternalPayTo] = useState<string>(X402_PAY_TO);
  const payToInput = controlledPayTo ?? internalPayTo;

  function setPayToInput(value: string) {
    if (onPayToInput) onPayToInput(value);
    else setInternalPayTo(value);
  }

  useEffect(() => {
    if (controlledPayTo !== undefined) return;
    if (selectedPayTo) setInternalPayTo(selectedPayTo);
  }, [selectedPayTo, controlledPayTo]);

  const payTo = useMemo(() => {
    if (!isAddress(payToInput)) return null;
    return getAddress(payToInput);
  }, [payToInput]);

  const selfPay =
    Boolean(account && payTo) &&
    account!.toLowerCase() === payTo!.toLowerCase();

  const ready =
    isConnected &&
    Boolean(account) &&
    Boolean(walletClient) &&
    Boolean(payTo) &&
    !selfPay &&
    Boolean(selectedAgentId) &&
    chainId === X402_CHAIN_ID;
  const busy = status !== "idle";

  async function onPay() {
    if (!account || !walletClient || !payTo) return;
    setError(null);
    setTx(null);
    setWork(null);
    try {
      setStatus("signing");
      const body = await signExactUsdcPayment(walletClient, account, payTo);
      setStatus("settling");
      const hire = await fetch("/api/agent/resource", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-agent-id": selectedAgentId ?? "",
          "x-agent-name": selectedName ?? "",
        },
        body: JSON.stringify(body),
      });
      const result = (await hire.json()) as {
        success?: boolean;
        transaction?: string;
        error?: string;
        details?: unknown;
        work?: AgentWork;
      };
      if (!hire.ok || !result.success) {
        const details =
          result.details !== undefined
            ? `\n${JSON.stringify(result.details, null, 2)}`
            : "";
        throw new Error(`${result.error ?? "agent hire failed"}${details}`);
      }
      setTx(result.transaction ?? "ok");
      if (result.work) setWork(result.work);
      rememberHire({
        id: newHireId(result.transaction),
        rail: "x402",
        agentId: selectedAgentId ?? null,
        agentName: selectedName ?? null,
        payTo,
        amount: X402_PAYMENT_USDC,
        asset: "$U",
        tx: result.transaction ?? null,
        chainId: X402_CHAIN_ID,
        client: account,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <PayToField value={payToInput} onChange={setPayToInput} />
      )}
      {selfPay && (
        <p className="hire-warn">
          `to` no puede ser la wallet que firma. Pegá la cuenta que recibe el
          $U — el facilitator solo cubre gas.
        </p>
      )}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={onPay}
        className="btn-primary h-12 w-full px-6"
      >
        {status === "signing"
          ? "Firmá en la wallet…"
          : status === "settling"
            ? "Settling on-chain…"
            : `Contratar y ejecutar (${X402_PAYMENT_USDC} $U)`}
      </button>
      {!ready && !selfPay && (
        <p className="font-mono-data text-[11px] leading-5 text-amber-400">
          Conectá en {X402_IS_MAINNET ? "BNB Chain 56" : "BSC Testnet 97"} y
          un `to` distinto al que firma.
        </p>
      )}
      {error && (
        <pre className="whitespace-pre-wrap break-all font-mono-data text-xs text-red-400">
          {error}
        </pre>
      )}
      {tx && (
        <a
          className="break-all font-mono-data text-xs text-brand-500 underline"
          href={`${X402_EXPLORER_TX}/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          tx {tx}
        </a>
      )}
      {work && (
        <div className="border border-brand-500/30 bg-brand-500/5 p-3">
          <p className="font-mono-data text-xs font-semibold text-surface-950">
            {work.agent}
          </p>
          <p className="mt-1 font-mono-data text-[11px] text-surface-500">
            {work.kind}
            {work.source ? ` · ${work.source}` : ""}
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono-data text-[11px] text-surface-800">
            {JSON.stringify(work.json, null, 2)}
          </pre>
        </div>
      )}
      {tx && selectedAgentId && (
        <div className="mt-4 border-t border-surface-300 pt-4">
          <FeedbackButton enabled agentId={selectedAgentId} />
        </div>
      )}
    </div>
  );
}
