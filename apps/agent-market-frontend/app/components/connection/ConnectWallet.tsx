"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useBalance, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import { USDC_IS_CONFIGURED, formatUsdc, x402PaymentConfig } from "@/app/lib/x402-usdc";

const erc20BalanceOf = {
  type: "function",
  name: "balanceOf",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ type: "uint256" }],
} as const;

export default function ConnectWallet() {
  const { account } = useWalletReady();
  const [mounted, setMounted] = useState(false);
  const payment = x402PaymentConfig();

  const { data: bnbBalance } = useBalance({
    address: account ?? undefined,
    chainId: payment.chainId,
  });

  const { data: usdcBalance, isError: usdcError } = useReadContract({
    address: payment.token,
    abi: [erc20BalanceOf],
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: payment.chainId,
    query: { enabled: Boolean(account) && USDC_IS_CONFIGURED },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const formattedBnb = bnbBalance
    ? Number(formatUnits(bnbBalance.value, bnbBalance.decimals)).toFixed(4)
    : "0.0000";

  const formattedUsdc = usdcError
    ? "err"
    : usdcBalance !== undefined
      ? formatUsdc(usdcBalance)
      : "…";

  const shortAddress = account
    ? `${account.slice(0, 6)}...${account.slice(-4)}`
    : null;

  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {account ? (
          <>
            <p className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
              {shortAddress}
            </p>
            <p className="font-mono">
              {formattedBnb} BNB · {formattedUsdc} $U
            </p>
          </>
        ) : (
          <p className="font-medium text-amber-600">Wallet desconectada</p>
        )}
      </div>
      <ConnectButton label="Connect" chainStatus="icon" showBalance={false} />
    </div>
  );
}
