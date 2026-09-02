"use client";

import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  USDC_DECIMALS,
  USDC_EIP712,
  X402_CHAIN_ID,
  X402_IS_MAINNET,
  X402_NETWORK,
  X402_PAYMENT_USDC,
  X402_SCHEME,
  x402PaymentConfig,
} from "@/app/lib/x402-usdc";
import PayUsdcButton from "./PayUsdcButton";

export default function WalletStatus({
  selectedPayTo,
  selectedName,
  selectedAgentId,
}: {
  selectedPayTo?: string | null;
  selectedName?: string | null;
  selectedAgentId?: string | null;
}) {
  const { account, isConnected, chainId } = useWalletReady();
  const onPaymentChain = chainId === X402_CHAIN_ID;
  const chainHint = X402_IS_MAINNET ? "bsc mainnet" : "bsc testnet";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          x402 · EIP-3009
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Pagar {X402_PAYMENT_USDC} $U
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Flujo: elegís un agente (demo o indexador) → cobro x402 exact en{" "}
          <strong>$U</strong> → se imprime el JSON que devuelva el seller.
        </p>

        <dl className="mt-8 grid gap-3 font-mono text-xs">
          <Row label="scheme" value={X402_SCHEME} />
          <Row label="network" value={X402_NETWORK} />
          <Row
            label="EIP-712"
            value={`${USDC_EIP712.name} v${USDC_EIP712.version}`}
          />
          <Row label="$U" value={x402PaymentConfig().token} />
          <Row label="decimals" value={String(USDC_DECIMALS)} />
          <Row label="amount" value={`${X402_PAYMENT_USDC} U`} />
          <Row label="payTo" value="campo `to` abajo (no puede ser la wallet que firma)" />
          <Row
            label="wallet"
            value={isConnected && account ? account : "disconnected"}
            warn={!isConnected}
          />
          <Row
            label="chain"
            value={
              chainId
                ? onPaymentChain
                  ? `${chainId} (${chainHint})`
                  : `${chainId} (switch to ${X402_CHAIN_ID})`
                : "—"
            }
            warn={Boolean(chainId) && !onPaymentChain}
          />
        </dl>

        <PayUsdcButton
          selectedPayTo={selectedPayTo}
          selectedName={selectedName}
          selectedAgentId={selectedAgentId}
        />
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
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800">
      <dt className="text-[10px] uppercase tracking-wider text-zinc-400">
        {label}
      </dt>
      <dd
        className={`break-all ${warn ? "text-amber-600" : "text-zinc-800 dark:text-zinc-200"}`}
      >
        {value}
      </dd>
    </div>
  );
}
