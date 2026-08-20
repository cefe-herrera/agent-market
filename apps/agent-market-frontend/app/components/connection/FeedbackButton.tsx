"use client";

import { useState } from "react";
import { zeroHash } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  AGENT_ID,
  BSC_TESTNET_CHAIN_ID,
  IDENTITY_REGISTRY,
  REPUTATION_REGISTRY,
  identityAbi,
  reputationAbi,
  isSameAddress,
} from "@/app/lib/erc8004";

export default function FeedbackButton({
  enabled,
  agentId = AGENT_ID,
}: {
  enabled: boolean;
  agentId?: number;
}) {
  const { account, chainId } = useWalletReady();
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: owner } = useReadContract({
    address: IDENTITY_REGISTRY,
    abi: identityAbi,
    functionName: "ownerOf",
    args: agentId ? [BigInt(agentId)] : undefined,
    chainId: BSC_TESTNET_CHAIN_ID,
    query: { enabled: Boolean(agentId) },
  });

  const selfFeedback = isSameAddress(account, owner as `0x${string}` | undefined);
  const ready =
    enabled &&
    Boolean(account) &&
    Boolean(agentId) &&
    chainId === BSC_TESTNET_CHAIN_ID &&
    !selfFeedback;

  async function onFeedback() {
    if (!agentId) return;
    setError(null);
    setHash(null);
    try {
      const tx = await writeContractAsync({
        address: REPUTATION_REGISTRY,
        abi: reputationAbi,
        functionName: "giveFeedback",
        args: [
          BigInt(agentId),
          BigInt(100),
          0,
          "x402",
          "quality",
          `${window.location.origin}/api/agent/resource`,
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

  if (!agentId) {
    return (
      <p className="text-xs text-zinc-500">
        Registrá el agente (`forge script RegisterAgent`) y poné{" "}
        <code>NEXT_PUBLIC_AGENT_ID</code> para dejar reputación ERC-8004.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[11px] text-zinc-500">
        agent #{agentId} · owner {owner ? String(owner) : "…"}
      </p>
      {selfFeedback && (
        <p className="text-xs text-red-600">
          El registry no deja self-feedback. Conectá una wallet distinta al
          owner y volvé a pagar / puntuar.
        </p>
      )}
      <button
        type="button"
        disabled={!ready || isPending}
        onClick={onFeedback}
        className="h-11 rounded-full border border-zinc-300 px-6 text-sm font-semibold disabled:opacity-40"
      >
        {isPending ? "Escribí en el registry…" : "Dejar feedback ERC-8004 (100)"}
      </button>
      {hash && (
        <a
          className="break-all font-mono text-xs text-emerald-600 underline"
          href={`https://testnet.bscscan.com/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
        >
          feedback {hash}
        </a>
      )}
      {error && (
        <pre className="whitespace-pre-wrap break-all font-mono text-xs text-red-600">
          {error}
        </pre>
      )}
    </div>
  );
}
