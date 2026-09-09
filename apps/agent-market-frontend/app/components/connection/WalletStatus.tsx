"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { shortenAddress } from "@/app/lib/agents";
import {
  USDC_DECIMALS,
  USDC_EIP712,
  X402_CHAIN_ID,
  X402_IS_MAINNET,
  X402_NETWORK,
  X402_PAYMENT_USDC,
  X402_PAY_TO,
  X402_SCHEME,
  x402PaymentConfig,
} from "@/app/lib/x402-usdc";
import PayUsdcButton, { PayToField } from "./PayUsdcButton";
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(Boolean(selectedAgentId));
  const [payToInput, setPayToInput] = useState(selectedPayTo ?? X402_PAY_TO);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedPayTo) setPayToInput(selectedPayTo);
  }, [selectedPayTo]);

  useEffect(() => {
    if (selectedAgentId) setOpen(true);
  }, [selectedAgentId]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chainShort = X402_IS_MAINNET ? "BNB Chain" : "BSC Testnet";
  const chainLabel = X402_IS_MAINNET ? "BNB Smart Chain" : "BSC Testnet";
  const token = x402PaymentConfig().token;
  const hasAgent = Boolean(selectedAgentId);
  const mark = (selectedName ?? "A").trim().charAt(0).toUpperCase() || "A";

  if (!mounted || !hasAgent) return null;

  return createPortal(
    <>
      {open ? (
        <button
          type="button"
          className="hire-dock-backdrop"
          aria-label="Minimizar contratación"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        id="hire"
        className={open ? "hire-dock hire-dock-open" : "hire-dock hire-dock-min"}
      >
        {open ? (
          <div className="card hire-panel hire-dock-panel">
            <header className="flex items-start justify-between gap-3">
              <p className="label-terminal">Servicio seleccionado</p>
              <div className="flex items-center gap-2">
                <span className="agent-card-chain">
                  {chainShort}: {X402_CHAIN_ID}
                </span>
                <button
                  type="button"
                  className="hire-dock-close"
                  onClick={() => setOpen(false)}
                >
                  Minimizar
                </button>
              </div>
            </header>

            <div className="hire-identity">
              <span className="hire-identity-mark" aria-hidden>
                {mark}
              </span>
              <div className="min-w-0">
                <h2 className="font-pixel-square text-base leading-snug text-surface-950">
                  {selectedName ?? "Agente"}
                </h2>
                <p className="mt-1 font-mono-data text-[11px] leading-4 text-surface-500">
                  Micropago gasless · EIP-3009
                </p>
              </div>
            </div>

            <div className="hire-kv">
              <div className="hire-kv-row">
                <span className="hire-kv-label">Precio por ejecución</span>
                <span className="hire-kv-value text-brand-500">
                  {X402_PAYMENT_USDC} $U
                </span>
              </div>
              <div className="hire-kv-row">
                <span className="hire-kv-label">Red</span>
                <span className="hire-kv-value">{chainLabel}</span>
              </div>
              <div className="hire-kv-row">
                <span className="hire-kv-label">Tipo de cobro</span>
                <span className="hire-kv-value">Micropago exacto</span>
              </div>
              <div className="hire-kv-row">
                <span className="hire-kv-label">Liquidación</span>
                <span className="flex min-w-0 items-center justify-end gap-2">
                  <span className="hire-kv-value" title={payToInput || undefined}>
                    {payToInput ? shortenAddress(payToInput) : "—"}
                  </span>
                  {payToInput ? <CopyValue value={payToInput} /> : null}
                </span>
              </div>
            </div>

            <PayUsdcButton
              compact
              payToInput={payToInput}
              onPayToInput={setPayToInput}
              selectedPayTo={selectedPayTo}
              selectedName={selectedName}
              selectedAgentId={selectedAgentId}
            />

            <details className="hire-fold">
              <summary>Detalles técnicos (JSON &amp; Card)</summary>
              <div className="hire-fold-body space-y-4">
                <PayToField value={payToInput} onChange={setPayToInput} />
                <AgentCardPreviewPanel agentId={selectedAgentId ?? null} compact />
                <p className="hire-section-label">Pago x402</p>
                <div className="hire-kv">
                  <div className="hire-kv-row">
                    <span className="hire-kv-label">Scheme</span>
                    <span className="hire-kv-value">{X402_SCHEME}</span>
                  </div>
                  <div className="hire-kv-row">
                    <span className="hire-kv-label">Network</span>
                    <span className="hire-kv-value">{X402_NETWORK}</span>
                  </div>
                  <div className="hire-kv-row">
                    <span className="hire-kv-label">EIP-712</span>
                    <span className="hire-kv-value">
                      {USDC_EIP712.name} v{USDC_EIP712.version}
                    </span>
                  </div>
                </div>
                <p className="hire-section-label">Token $U</p>
                <div className="hire-kv">
                  <div className="hire-kv-row">
                    <span className="hire-kv-label">Contrato</span>
                    <span className="flex min-w-0 items-center justify-end gap-2">
                      <span className="hire-kv-value" title={token}>
                        {shortenAddress(token)}
                      </span>
                      <CopyValue value={token} />
                    </span>
                  </div>
                  <div className="hire-kv-row">
                    <span className="hire-kv-label">Decimals</span>
                    <span className="hire-kv-value">{USDC_DECIMALS}</span>
                  </div>
                </div>
              </div>
            </details>

            <details className="hire-fold">
              <summary>Escrow ERC-8183</summary>
              <div className="hire-fold-body">
                <CreateJob8183
                  compact
                  selectedPayTo={selectedPayTo}
                  selectedName={selectedName}
                  selectedAgentId={selectedAgentId}
                  selected8183Provider={selected8183Provider}
                />
              </div>
            </details>

            <p className="hire-shield">
              <span aria-hidden>🛡</span>
              Transacción no-custodial · el facilitator solo paga gas
            </p>
          </div>
        ) : (
          <button
            type="button"
            className="hire-dock-chip"
            onClick={() => setOpen(true)}
          >
            <span className="hire-identity-mark" aria-hidden>
              {mark}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate font-pixel-square text-sm text-surface-950">
                {selectedName ?? "Agente"}
              </span>
              <span className="font-mono-data text-[11px] text-surface-500">
                {X402_PAYMENT_USDC} $U · contratar
              </span>
            </span>
            <span className="font-mono-data text-xs text-brand-500">abrir</span>
          </button>
        )}
      </div>
    </>,
    document.body,
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="hire-copy"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? "ok" : "copy"}
    </button>
  );
}
