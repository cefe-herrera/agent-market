"use client";

import { useEffect, useMemo, useState } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getAddress, type Address, type Hex } from "viem";
import { useWalletReady } from "@/app/context/hooks/useWalletReady";
import {
  AGENT_SAFE_SALT_NONCE,
  isPimlicoConfigured,
} from "@/app/lib/aa/addresses";
import {
  grantAgentSubmitSession,
} from "@/app/lib/aa/smart-sessions";
import {
  predictSafe7579Address,
  type SafeOwnerWallet,
} from "@/app/lib/aa/safe7579";
import { agentCaip, identityRegistry } from "@/app/lib/erc8004";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import {
  buildMerchantCard,
  cardToDataUri,
} from "@/app/lib/merchant/card";
import {
  publishMerchant,
  rememberLocalMerchant,
} from "@/app/lib/merchant/client-store";
import {
  readAgentOwner,
  registerIdentity,
  setIdentityUri,
  type IdentityWallet,
} from "@/app/lib/merchant/identity";
import type { PublicMerchant } from "@/app/lib/merchant/types";

export default function SellWizard() {
  const { account, walletClient, isConnected, chainId } = useWalletReady();
  const cfg = getErc8183();
  const registry = identityRegistry(cfg.chainId);

  const [name, setName] = useState("Mi agente");
  const [description, setDescription] = useState(
    "Seller x402 + escrow 8183 en BNB Agent Market.",
  );
  const [a2a, setA2a] = useState("");
  const [linkId, setLinkId] = useState("");
  const [safe, setSafe] = useState<Address | null>(null);
  const [deployed, setDeployed] = useState(false);
  const [sessionPk, setSessionPk] = useState<Hex | null>(null);
  const [sessionAddr, setSessionAddr] = useState<Address | null>(null);
  const [grantTx, setGrantTx] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!account) {
      setSafe(null);
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
        setSafe(next.address);
        setDeployed(next.deployed);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [account, cfg.chainId]);

  const card = useMemo(() => {
    if (!account || !safe || !sessionAddr) return null;
    return buildMerchantCard({
      name: name.trim() || "Mi agente",
      description: description.trim() || "Merchant",
      owner: account,
      payTo: account,
      provider8183: safe,
      sessionAddress: sessionAddr,
      a2a: a2a.trim() || null,
      chainId: cfg.chainId,
      tokenId,
      registry,
    });
  }, [account, a2a, cfg.chainId, description, name, registry, safe, sessionAddr, tokenId]);

  function onGenerateSession() {
    const pk = generatePrivateKey();
    const owner = privateKeyToAccount(pk);
    setSessionPk(pk);
    setSessionAddr(getAddress(owner.address));
    setRevealed(true);
    setGrantTx(null);
  }

  function downloadAgentKey() {
    if (!sessionPk || !sessionAddr || !safe) return;
    const body = [
      "BNB Agent Market — agent key",
      "Tratala como una clave privada. Quien la tenga puede hacer submit 8183 de este Safe.",
      "",
      `agentSafe: ${safe}`,
      `sessionAddress: ${sessionAddr}`,
      `agentKey: ${sessionPk}`,
      "",
    ].join("\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-key-${safe.slice(2, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setRevealed(false);
  }

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
      setSafe(result.agentSafe);
      setGrantTx(result.hashes.at(-1) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  async function persist(listing: PublicMerchant) {
    rememberLocalMerchant(listing);
    try {
      await publishMerchant(listing);
    } catch {
      /* local listing still works on this browser */
    }
  }

  async function onMint() {
    if (!walletClient?.account || !account || !card || !safe || !sessionAddr) return;
    setActing("mint");
    setError(null);
    try {
      const uri = cardToDataUri(card);
      const minted = await registerIdentity(
        walletClient as unknown as IdentityWallet,
        {
          agentURI: uri,
          account,
          chainId: cfg.chainId,
        },
      );
      setTokenId(minted.tokenId.toString());
      setAgentId(minted.agentId);
      await persist({
        agentId: minted.agentId,
        chainId: cfg.chainId,
        tokenId: minted.tokenId.toString(),
        owner: account,
        name: name.trim() || "Mi agente",
        description: description.trim() || "Merchant",
        payTo: account,
        provider8183: safe,
        sessionAddress: sessionAddr,
        a2a: a2a.trim() || null,
        cardUrl: `/api/merchant/card/${encodeURIComponent(minted.agentId)}`,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  async function onLink() {
    if (!walletClient?.account || !account || !card || !safe || !sessionAddr) return;
    const id = linkId.trim();
    if (!id) return;
    setActing("link");
    setError(null);
    try {
      const token = BigInt(id);
      const owner = await readAgentOwner(token, cfg.chainId);
      if (owner.toLowerCase() !== account.toLowerCase()) {
        throw new Error(`token #${id} es de ${owner}, no de tu EOA`);
      }
      const caip = agentCaip(Number(token), cfg.chainId);
      const uri = cardToDataUri({
        ...card,
        registrations: [
          {
            agentId: Number(token),
            agentRegistry: `eip155:${cfg.chainId}:${registry}`,
          },
        ],
      });
      await setIdentityUri(walletClient as unknown as IdentityWallet, {
        tokenId: token,
        agentURI: uri,
        account,
        chainId: cfg.chainId,
      });
      setTokenId(id);
      setAgentId(caip);
      await persist({
        agentId: caip,
        chainId: cfg.chainId,
        tokenId: id,
        owner: account,
        name: name.trim() || "Mi agente",
        description: description.trim() || "Merchant",
        payTo: account,
        provider8183: safe,
        sessionAddress: sessionAddr,
        a2a: a2a.trim() || null,
        cardUrl: `/api/merchant/card/${encodeURIComponent(caip)}`,
        createdAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActing(null);
    }
  }

  const onChain = chainId === cfg.chainId;
  const canGrant =
    isConnected &&
    Boolean(walletClient?.account) &&
    Boolean(sessionAddr) &&
    isPimlicoConfigured() &&
    onChain;
  const canPublish =
    isConnected &&
    Boolean(walletClient?.account) &&
    Boolean(card) &&
    Boolean(grantTx) &&
    onChain;

  return (
    <div className="space-y-6">
      {!isConnected || !account ? (
        <p className="font-mono-data text-sm text-amber-400">
          Conectá la EOA que va a ser owner del agente (y del Agent Safe).
        </p>
      ) : !onChain ? (
        <p className="font-mono-data text-sm text-amber-400">
          Cambiá a chain {cfg.chainId}.
        </p>
      ) : null}

      <section className="card">
        <p className="label-terminal">1 · perfil</p>
        <h2 className="mt-2 font-pixel-square text-lg text-surface-950">
          Qué vendés
        </h2>
        <label className="mt-4 flex flex-col gap-1 text-xs">
          <span className="font-mono-data uppercase tracking-wider text-surface-500">
            nombre
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field h-11 text-xs"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-xs">
          <span className="font-mono-data uppercase tracking-wider text-surface-500">
            descripción
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-field text-xs"
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-xs">
          <span className="font-mono-data uppercase tracking-wider text-surface-500">
            A2A URL (opcional)
          </span>
          <input
            value={a2a}
            onChange={(e) => setA2a(e.target.value)}
            placeholder="https://…"
            className="input-field h-11 text-xs"
          />
        </label>
        <p className="mt-3 font-mono-data text-xs text-surface-500">
          x402 <code>payTo</code> = esta EOA. 8183 <code>provider</code> = Agent
          Safe (paso 2).
        </p>
      </section>

      <section className="card">
        <p className="label-terminal">2 · Agent Safe 7579</p>
        <h2 className="mt-2 font-pixel-square text-lg text-surface-950">
          Agent key
        </h2>
        <p className="mt-2 font-mono-data text-sm leading-6 text-surface-500">
          Es una clave privada de sesión: el worker la usa para{" "}
          <code>submit</code> sin MetaMask. No es un archivo de entorno.
        </p>
        <dl className="mt-4 grid gap-2 font-mono-data text-xs">
          <Row label="agent safe (salt 1)" value={safe ?? "…"} />
          <Row
            label="deployed"
            value={deployed ? "yes" : "no — el grant lo crea"}
          />
          <Row
            label="session pubkey"
            value={sessionAddr ?? "generá una key nueva"}
            warn={!sessionAddr}
          />
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGenerateSession}
            className="btn-secondary !px-3 !py-1 text-[11px]"
          >
            Generar agent key
          </button>
          <button
            type="button"
            disabled={!canGrant || acting !== null}
            onClick={() => void onGrant()}
            className="btn-secondary !px-3 !py-1 text-[11px]"
          >
            {acting === "grant" ? "grant…" : "Grant submit"}
          </button>
          <button
            type="button"
            disabled={!sessionPk}
            onClick={downloadAgentKey}
            className="btn-primary !px-3 !py-1 text-[11px]"
          >
            Descargar agent key
          </button>
        </div>
        {!isPimlicoConfigured() && (
          <p className="mt-3 font-mono-data text-xs text-amber-400">
            Falta NEXT_PUBLIC_PIMLICO_API_KEY para el grant.
          </p>
        )}
        {revealed && sessionPk && (
          <pre className="mt-3 whitespace-pre-wrap break-all font-mono-data text-[11px] text-amber-400">
            Guardá la agent key ahora (clave privada). No queda en el server ni
            en localStorage.{"\n"}
            {sessionPk}
          </pre>
        )}
        {grantTx && (
          <a
            className="mt-2 block break-all font-mono-data text-xs text-brand-500 underline"
            href={`${cfg.explorerTx}/${grantTx}`}
            target="_blank"
            rel="noreferrer"
          >
            grant tx {grantTx}
          </a>
        )}
      </section>

      <section className="card">
        <p className="label-terminal">3 · ERC-8004</p>
        <h2 className="mt-2 font-pixel-square text-lg text-surface-950">
          Mint o link
        </h2>
        <p className="mt-2 font-mono-data text-sm leading-6 text-surface-500">
          El Agent Card (x402 + erc8183.provider) se escribe on-chain como data
          URI. El indexer puede tardar; este market lo lista al toque.
        </p>
        <p className="mt-2 break-all font-mono-data text-[11px] text-surface-500">
          registry {registry}
        </p>
        <button
          type="button"
          disabled={!canPublish || acting !== null}
          onClick={() => void onMint()}
          className="btn-primary mt-4 h-12 w-full"
        >
          {acting === "mint" ? "minteando…" : "Mint identidad 8004"}
        </button>
        <div className="mt-4 flex gap-2">
          <input
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            placeholder="tokenId existente"
            className="input-field h-11 flex-1 text-xs"
          />
          <button
            type="button"
            disabled={!canPublish || !linkId.trim() || acting !== null}
            onClick={() => void onLink()}
            className="btn-secondary !px-3 text-[11px]"
          >
            {acting === "link" ? "link…" : "Link + setAgentURI"}
          </button>
        </div>
        {agentId && (
          <p className="mt-3 break-all font-mono-data text-xs text-brand-500">
            listo {agentId}
          </p>
        )}
      </section>

      <section className="card">
        <p className="label-terminal">4 · Agent Card</p>
        <h2 className="mt-2 font-pixel-square text-lg text-surface-950">
          Preview
        </h2>
        {card ? (
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all font-mono-data text-[11px] text-surface-800">
            {JSON.stringify(card, null, 2)}
          </pre>
        ) : (
          <p className="mt-3 font-mono-data text-sm text-surface-500">
            Generá la session para armar el JSON (payTo + Safe + pubkey).
          </p>
        )}
      </section>

      {error && (
        <pre className="whitespace-pre-wrap break-all font-mono-data text-xs text-red-400">
          {error}
        </pre>
      )}
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
      <dd className={`break-all ${warn ? "text-amber-400" : "text-surface-800"}`}>
        {value}
      </dd>
    </div>
  );
}
