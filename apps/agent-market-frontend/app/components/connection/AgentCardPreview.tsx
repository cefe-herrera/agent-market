"use client";

import { useEffect, useState } from "react";
import type { AgentCardPreview } from "@/app/lib/agent-card";

export default function AgentCardPreviewPanel({
  agentId,
}: {
  agentId: string | null;
}) {
  const [card, setCard] = useState<AgentCardPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!agentId) {
      setCard(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCard(null);
    setShowRaw(false);
    void fetch(`/api/marketplace/agents/${encodeURIComponent(agentId)}/card`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as
          | AgentCardPreview
          | { error?: string }
          | null;
        if (cancelled) return;
        if (!res.ok || !json || !("skills" in json)) {
          setError(
            json && "error" in json && json.error
              ? json.error
              : "Este agente no publicó Agent Card JSON.",
          );
          return;
        }
        setCard(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  if (!agentId) {
    return (
      <p className="mt-6 font-mono-data text-sm text-surface-500">
        Elegí un agente a la izquierda para leer su Agent Card antes de pagar.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="mt-6 font-mono-data text-sm text-surface-500">
        Leyendo Agent Card…
      </p>
    );
  }

  if (error || !card) {
    return (
      <p className="mt-6 font-mono-data text-sm text-amber-400">
        {error ?? "Sin metadata de servicio."}
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="label-terminal">Agent Card · antes de pagar</p>
      <div className="border border-surface-300 p-3">
        <p className="font-mono-data text-sm font-semibold text-surface-950">
          {card.name ?? agentId}
        </p>
        {card.description && (
          <p className="mt-1 font-mono-data text-xs leading-5 text-surface-500">
            {card.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.x402 && <Chip>x402</Chip>}
          {card.preferredTransport && <Chip>{card.preferredTransport}</Chip>}
          {card.protocolVersion && <Chip>v{card.protocolVersion}</Chip>}
          {card.provider && <Chip>{card.provider}</Chip>}
        </div>
        {card.endpoint && (
          <p className="mt-2 break-all font-mono-data text-[11px] text-brand-500">
            A2A: {card.endpoint}
          </p>
        )}
        <p className="mt-1 break-all font-mono-data text-[10px] text-surface-500">
          card: {card.sourceUrl}
        </p>
      </div>

      {card.skills.length > 0 && (
        <ul className="grid gap-2">
          {card.skills.map((skill) => (
            <li
              key={skill.id ?? skill.name}
              className="border border-surface-300 px-3 py-2"
            >
              <p className="font-mono-data text-xs font-semibold text-surface-950">
                {skill.name}
              </p>
              {skill.description && (
                <p className="mt-1 text-[11px] leading-4 text-surface-500">
                  {skill.description}
                </p>
              )}
              {skill.tags.length > 0 && (
                <p className="mt-1 text-[10px] uppercase tracking-wider text-surface-500">
                  {skill.tags.join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {card.interfaces.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-surface-500">
            Interfaces
          </p>
          <ul className="mt-1 space-y-1">
            {card.interfaces.map((item) => (
              <li
                key={`${item.transport}:${item.url}`}
                className="break-all font-mono-data text-[11px] text-surface-500"
              >
                {item.transport ? `${item.transport} · ` : ""}
                {item.url}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowRaw((value) => !value)}
        className="font-mono-data text-[11px] text-brand-500 underline"
      >
        {showRaw ? "ocultar JSON" : "ver Agent Card JSON"}
      </button>
      {showRaw && (
        <pre className="max-h-64 overflow-auto bg-surface-50 p-3 font-mono-data text-[10px] text-surface-800">
          {JSON.stringify(card.card, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="badge-gray">
      {children}
    </span>
  );
}
