"use client";

import { useEffect, useState } from "react";
import { formatEther, formatUnits, parseEther, parseUnits, type Address } from "viem";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  BUYER_SAFE_SALT_NONCE,
  isPimlicoConfigured,
  pimlicoSponsor,
} from "@/app/lib/aa/addresses";
import {
  predictSafe7579Address,
  sendNativeToSafe,
  sendTokenToSafe,
  type SafeOwnerWallet,
} from "@/app/lib/aa/safe7579";
import {
  ERC8183_TOKEN_DECIMALS,
  getErc8183,
} from "@/app/lib/erc8183/addresses";
import {
  erc8183PublicClient,
  readPaymentToken,
  readTokenBalance,
} from "@/app/lib/erc8183/read";

export function useBuyerSafe() {
  const { account, walletClient, chainId } = useWalletReady();
  const cfg = getErc8183();
  const [safe, setSafe] = useState<Address | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [bnb, setBnb] = useState<bigint | null>(null);
  const [uBalance, setUBalance] = useState<bigint | null>(null);
  const [token, setToken] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!account) {
      setSafe(null);
      setDeployed(false);
      setBnb(null);
      setUBalance(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const predicted = await predictSafe7579Address({
          ownerAddress: account,
          chainId: cfg.chainId,
          saltNonce: BUYER_SAFE_SALT_NONCE,
        });
        if (cancelled) return;
        setSafe(predicted.address);
        setDeployed(predicted.deployed);
        const [native, payment] = await Promise.all([
          erc8183PublicClient(cfg.chainId).getBalance({
            address: predicted.address,
          }),
          readPaymentToken(cfg.chainId),
        ]);
        const u = await readTokenBalance(
          predicted.address,
          payment,
          cfg.chainId,
        );
        if (cancelled) return;
        setBnb(native);
        setToken(payment);
        setUBalance(u);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, cfg.chainId, nonce]);

  async function fundBnb(amount = "0.002") {
    if (!walletClient?.account || !safe) return;
    setFunding("bnb");
    setError(null);
    try {
      await sendNativeToSafe(walletClient as unknown as SafeOwnerWallet, {
        to: safe,
        value: parseEther(amount),
        chainId: cfg.chainId,
      });
      setNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFunding(null);
    }
  }

  async function fundU(amount: string) {
    if (!walletClient?.account || !safe || !token) return;
    setFunding("u");
    setError(null);
    try {
      await sendTokenToSafe(walletClient as unknown as SafeOwnerWallet, {
        to: safe,
        token,
        amount: parseUnits(amount, ERC8183_TOKEN_DECIMALS),
        chainId: cfg.chainId,
      });
      setNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFunding(null);
    }
  }

  return {
    account,
    walletClient,
    chainId,
    cfg,
    safe,
    deployed,
    bnb,
    uBalance,
    token,
    error,
    funding,
    pimlico: isPimlicoConfigured(),
    sponsor: pimlicoSponsor(),
    bnbLabel: bnb === null ? "…" : `${formatEther(bnb)} BNB`,
    uLabel:
      uBalance === null
        ? "…"
        : `${formatUnits(uBalance, ERC8183_TOKEN_DECIMALS)} $U`,
    refresh: () => setNonce((n) => n + 1),
    fundBnb,
    fundU,
  };
}
