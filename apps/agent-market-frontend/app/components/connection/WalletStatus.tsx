"use client";

import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  BSC_TESTNET_CHAIN_ID,
  USDC_ADDRESS,
  USDC_DECIMALS,
  USDC_EIP712,
  X402_NETWORK,
  X402_PAYMENT_USDC,
  X402_SCHEME,
} from "@/app/lib/x402-usdc";
import PayUsdcButton from "./PayUsdcButton";

export default function WalletStatus() {
  const { account, isConnected, chainId } = useWalletReady();
  const onBscTestnet = chainId === BSC_TESTNET_CHAIN_ID;

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-16 font-sans dark:bg-black">
      <main className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          x402 · EIP-3009
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Pagar {X402_PAYMENT_USDC} $U
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Flujo: registrás el agente en ERC-8004 → este endpoint cobra x402
          exact en <strong>$U</strong> → el cliente deja feedback on-chain
          (no puede ser el owner). GET{" "}
          <code>/api/agent/resource</code> responde 402 hasta que pagues.
        </p>

        <dl className="mt-8 grid gap-3 font-mono text-xs">
          <Row label="scheme" value={X402_SCHEME} />
          <Row label="network" value={X402_NETWORK} />
          <Row
            label="EIP-712"
            value={`${USDC_EIP712.name} v${USDC_EIP712.version}`}
          />
          <Row label="$U" value={USDC_ADDRESS} />
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
                ? onBscTestnet
                  ? `${chainId} (bsc testnet)`
                  : `${chainId} (switch to 97)`
                : "—"
            }
            warn={Boolean(chainId) && !onBscTestnet}
          />
        </dl>

        <PayUsdcButton />
      </main>
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
