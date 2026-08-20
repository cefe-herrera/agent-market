"use client";

import { useMemo, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  BSC_TESTNET_CHAIN_ID,
  X402_PAYMENT_USDC,
  X402_PAY_TO,
} from "@/app/lib/x402-usdc";
import {
  signExactUsdcPayment,
} from "@/app/lib/x402-client";
import FeedbackButton from "./FeedbackButton";

export default function PayUsdcButton() {
  const { account, walletClient, isConnected, chainId } = useWalletReady();
  const [status, setStatus] = useState<"idle" | "signing" | "settling">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<string | null>(null);
  const [payToInput, setPayToInput] = useState(X402_PAY_TO);

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
    chainId === BSC_TESTNET_CHAIN_ID;
  const busy = status !== "idle";

  async function onPay() {
    if (!account || !walletClient || !payTo) return;
    setError(null);
    setTx(null);
    try {
      setStatus("signing");
      const body = await signExactUsdcPayment(walletClient, account, payTo);
      setStatus("settling");
      const hire = await fetch("/api/agent/resource", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await hire.json()) as {
        success?: boolean;
        transaction?: string;
        error?: string;
        details?: unknown;
        work?: unknown;
      };
      if (!hire.ok || !result.success) {
        const details =
          result.details !== undefined
            ? `\n${JSON.stringify(result.details, null, 2)}`
            : "";
        throw new Error(`${result.error ?? "agent hire failed"}${details}`);
      }
      setTx(result.transaction ?? "ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs">
        <span className="uppercase tracking-wider text-zinc-400">
          to · quién recibe el $U
        </span>
        <input
          value={payToInput}
          onChange={(e) => setPayToInput(e.target.value.trim())}
          placeholder="0x…"
          spellCheck={false}
          className="h-11 rounded-lg border border-zinc-200 bg-white px-3 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </label>
      <p className="font-mono text-[11px] text-zinc-500">
        from (pagador) = {account ?? "conectá wallet"}
      </p>
      {selfPay && (
        <p className="text-xs text-red-600">
          Estás firmando con la misma cuenta que `to`. Pegá otra wallet
          receptora — el facilitator solo paga gas, no tiene que ser el
          destinatario.
        </p>
      )}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={onPay}
        className="h-12 rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {status === "signing"
          ? "Firmá en la wallet…"
          : status === "settling"
            ? "Settling on-chain…"
            : `Pagar ${X402_PAYMENT_USDC} $U al agente`}
      </button>
      {!ready && !selfPay && (
        <p className="text-xs text-amber-600">
          Conectá la wallet en BNB Testnet (97) y poné un `to` distinto.
        </p>
      )}
      {error && (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-red-600">
          {error}
        </pre>
      )}
      {tx && (
        <a
          className="break-all font-mono text-xs text-emerald-600 underline"
          href={`https://testnet.bscscan.com/tx/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          tx {tx}
        </a>
      )}
      {tx && (
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <FeedbackButton enabled />
        </div>
      )}
    </div>
  );
}
