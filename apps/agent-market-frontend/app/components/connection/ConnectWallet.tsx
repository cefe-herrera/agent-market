"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useBalance, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import { useI18n } from "@/app/context/I18nProvider";
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
  const { t } = useI18n();
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

  return (
    <div className="flex items-center gap-2">
      {account && (
        <p className="hidden font-mono-data text-[10px] text-surface-500 lg:block">
          {formattedBnb} BNB · {formattedUsdc} $U
        </p>
      )}
      <ConnectButton.Custom>
        {({ account: rkAccount, openAccountModal, openConnectModal, mounted: rkMounted }) => {
          if (!rkMounted) return null;
          if (!rkAccount) {
            return (
              <button
                type="button"
                className="btn-primary !px-3 !py-1.5 text-xs"
                onClick={openConnectModal}
              >
                {t("wallet.connect")}
              </button>
            );
          }
          return (
            <button
              type="button"
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={openAccountModal}
            >
              {rkAccount.displayName}
            </button>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
