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
import AgentCardPreviewPanel from "./AgentCardPreview";
import CreateJob8183 from "./CreateJob8183";

export default function WalletStatus({
  selectedPayTo,
  selectedName,
  selectedAgentId,
  selected8183Provider,
}: {
  selectedPayTo?: string | null;
  selectedName?: string | null;
  selectedAgentId?: string | null;
  selected8183Provider?: string | null;
}) {
  const { account, isConnected, chainId } = useWalletReady();
  const onPaymentChain = chainId === X402_CHAIN_ID;
  const chainHint = X402_IS_MAINNET ? "bsc mainnet" : "bsc testnet";

  return (
    <div className="card md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
        <p className="label-terminal">x402 · EIP-3009</p>
        <h1 className="mt-2 font-pixel-square text-xl text-surface-950">
          Pagar {X402_PAYMENT_USDC} $U
        </h1>
        <p className="mt-3 font-mono-data text-sm leading-6 text-surface-500">
          Antes de pagar se lee el Agent Card (skills, x402, A2A). Después: cobro
          x402 exact en <strong className="text-brand-500">$U</strong> y se
          imprime el JSON del seller.
        </p>

        <AgentCardPreviewPanel agentId={selectedAgentId ?? null} />

        <dl className="mt-8 grid gap-3 font-mono-data text-xs">
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

        <CreateJob8183
          selectedPayTo={selectedPayTo}
          selectedName={selectedName}
          selectedAgentId={selectedAgentId}
          selected8183Provider={selected8183Provider}
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
