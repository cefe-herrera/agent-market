"use client";

import { useEffect, useState } from "react";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  AGENT_SAFE_SALT_NONCE,
  agentSafeProvider,
  agentSessionAddress,
  isPimlicoConfigured,
} from "@/app/lib/aa/addresses";
import {
  grantAgentSubmitSession,
  revokeAgentSubmitSession,
} from "@/app/lib/aa/smart-sessions";
import {
  predictSafe7579Address,
  type SafeOwnerWallet,
} from "@/app/lib/aa/safe7579";
import { getErc8183 } from "@/app/lib/erc8183/addresses";

export default function AgentSafePanel() {
  const { account, walletClient, isConnected } = useWalletReady();
  const cfg = getErc8183();
  const published = agentSafeProvider();
  const sessionAddr = agentSessionAddress();
  const [predicted, setPredicted] = useState<Address | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tx, setTx] = useState<Hex | null>(null);
  const [permissionId, setPermissionId] = useState<Hex | null>(null);

  useEffect(() => {
    if (!account) {
      setPredicted(null);
      return;
    }
    let cancelled = false;
    void predictSafe7579Address({
      ownerAddress: account,
      chainId: cfg.chainId,
      saltNonce: AGENT_SAFE_SALT_NONCE,
    })
      .then((next) => {
        if (cancelled) return;
        setPredicted(next.address);
        setDeployed(next.deployed);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [account, cfg.chainId]);

  async function onGrant() {
    if (!walletClient?.account || !sessionAddr) return;
    setActing("grant");
    setError(null);
    try {
      const result = await grantAgentSubmitSession({
        owner: walletClient as unknown as SafeOwnerWallet,
        sessionOwner: sessionAddr,
        chainId: cfg.chainId,
      });
      setTx(result.hashes.at(-1) ?? null);
      setPermissionId(result.permissionId);
      setPredicted(result.agentSafe);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  async function onRevoke() {
    if (!walletClient?.account || !sessionAddr) return;
    setActing("revoke");
    setError(null);
    try {
      const result = await revokeAgentSubmitSession({
        owner: walletClient as unknown as SafeOwnerWallet,
        sessionOwner: sessionAddr,
        chainId: cfg.chainId,
      });
      setTx(result.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  if (!isConnected || !account) return null;

  const matchesPublished =
    published &&
    predicted &&
    published.toLowerCase() === predicted.toLowerCase();

  return (
    <section className="card mb-8">
      <p className="label-terminal">ERC-7579 · agent SA</p>
      <h2 className="mt-2 font-pixel-square text-lg text-surface-950">
        Safe del agente
      </h2>
      <p className="mt-2 font-mono-data text-sm leading-6 text-surface-500">
        Owner = esta EOA. La agent key (clave privada de sesión) vive en el
        worker del operador, no en el browser. Grant allowlistea solo{" "}
        <code>submit</code> en Commerce.
      </p>
      <dl className="mt-4 grid gap-2 font-mono-data text-xs">
        <Row label="agent safe (salt 1)" value={predicted ?? "…"} />
        <Row
          label="publicado (env)"
          value={published ?? "NEXT_PUBLIC_AGENT_SAFE_ADDRESS vacío"}
          warn={!published}
        />
        <Row
          label="session pubkey"
          value={sessionAddr ?? "NEXT_PUBLIC_AGENT_SESSION_ADDRESS vacío"}
          warn={!sessionAddr}
        />
        <Row
          label="deployed"
          value={deployed ? "yes" : "no — primera UserOp lo crea"}
        />
        {permissionId && <Row label="permissionId" value={permissionId} />}
      </dl>
      {!isPimlicoConfigured() && (
        <p className="mt-3 font-mono-data text-xs text-amber-400">
          Falta NEXT_PUBLIC_PIMLICO_API_KEY para firmar UserOps.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={
            !walletClient || !sessionAddr || !isPimlicoConfigured() || acting !== null
          }
          onClick={() => void onGrant()}
          className="btn-secondary !px-3 !py-1 text-[11px]"
        >
          {acting === "grant" ? "grant…" : "Grant session submit"}
        </button>
        <button
          type="button"
          disabled={
            !walletClient || !sessionAddr || !isPimlicoConfigured() || acting !== null
          }
          onClick={() => void onRevoke()}
          className="btn-secondary !px-3 !py-1 text-[11px]"
        >
          {acting === "revoke" ? "revoke…" : "Revoke session"}
        </button>
      </div>
      {published && predicted && !matchesPublished && isAddress(published) && (
        <p className="mt-3 font-mono-data text-xs text-amber-400">
          El Safe de esta EOA ({predicted}) no es el publicado (
          {getAddress(published)}). Grant crea/usa saltNonce=1 de{" "}
          <em>esta</em> wallet.
        </p>
      )}
      {error && (
        <pre className="mt-3 whitespace-pre-wrap break-all font-mono-data text-xs text-red-400">
          {error}
        </pre>
      )}
      {tx && (
        <a
          className="mt-2 block break-all font-mono-data text-xs text-brand-500 underline"
          href={`${cfg.explorerTx}/${tx}`}
          target="_blank"
          rel="noreferrer"
        >
          tx {tx}
        </a>
      )}
    </section>
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
      <dd className={`break-all ${warn ? "text-amber-400" : "text-surface-800"}`}>
        {value}
      </dd>
    </div>
  );
}
