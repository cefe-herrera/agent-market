"use client";

import { useState } from "react";
import { zeroHash } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  BSC_TESTNET_CHAIN_ID,
  IDENTITY_REGISTRY,
  REPUTATION_REGISTRY,
  identityAbi,
  reputationAbi,
  isSameAddress,
  parseTokenId,
} from "@/app/lib/erc8004";

export default function FeedbackButton({
  enabled,
  agentId,
}: {
  enabled: boolean;
  agentId: string;
}) {
  const { account, chainId } = useWalletReady();
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const tokenId = parseTokenId(agentId);

  const { data: owner } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: identityAbi,
    functionName: "ownerOf",
    args: tokenId ? [BigInt(tokenId)] : undefined,
    chainId: BSC_TESTNET_CHAIN_ID,
    query: { enabled: Boolean(tokenId) },
  });

  const selfFeedback = isSameAddress(account, owner as `0x${string}` | undefined);
  const ready =
    enabled &&
    Boolean(account) &&
    Boolean(tokenId) &&
    chainId === BSC_TESTNET_CHAIN_ID &&
    !selfFeedback;

  async function onFeedback() {
    if (!tokenId) return;
    setError(null);
    setHash(null);
    try {
      const tx = await writeContractAsync({
        address: REPUTATION_REGISTRY,
        abi: reputationAbi,
        functionName: "giveFeedback",
        args: [
          BigInt(tokenId),
          BigInt(100),
          0,
          "x402",
          "quality",
          `${window.location.origin}/api/agent/resource?seller=${encodeURIComponent(agentId)}`,
          "",
          zeroHash,
        ],
        chainId: BSC_TESTNET_CHAIN_ID,
      });
      setHash(tx);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono-data text-[11px] text-surface-500">
        agentId {agentId}
        {tokenId ? ` · ERC-8004 #${tokenId}` : ""}
        {owner ? ` · owner ${String(owner)}` : ""}
      </p>
      {!tokenId && (
        <p className="font-mono-data text-xs text-surface-500">
          Este seller usa id dinámico de catálogo. Feedback on-chain queda
          para cuando el agente tenga token ERC-8004.
        </p>
      )}
      {selfFeedback && (
        <p className="text-xs text-red-400">
          El registry no deja self-feedback. Conectá una wallet distinta al
          owner y volvé a pagar / puntuar.
        </p>
      )}
      {tokenId > 0 && (
        <button
          type="button"
          disabled={!ready || isPending}
          onClick={onFeedback}
          className="btn-secondary h-11 w-full"
        >
          {isPending ? "Escribí en el registry…" : "Dejar feedback ERC-8004 (100)"}
        </button>
      )}
      {hash && (
        <a
          className="break-all font-mono-data text-xs text-brand-500 underline"
          href={`https://testnet.bscscan.com/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          feedback {hash}
        </a>
      )}
      {error && (
        <pre className="whitespace-pre-wrap break-all font-mono-data text-xs text-red-400">
          {error}
        </pre>
      )}
    </div>
  );
}
