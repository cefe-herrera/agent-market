"use client";

import { useEffect, useState } from "react";
import type { AgentCardPreview } from "@/app/lib/agent-card";
import { marketplaceAgentUrl } from "@/app/lib/nest-routes";

export default function AgentCardPreviewPanel({
  agentId,
  compact = false,
}: {
  agentId: string | null;
  compact?: boolean;
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
    void fetch(marketplaceAgentUrl(agentId, "/card"), {
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
      <p className="font-mono-data text-xs text-surface-500">
        Sin agente — no hay Agent Card para leer.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="font-mono-data text-xs text-surface-500">
        Leyendo Agent Card…
      </p>
    );
  }

  if (error || !card) {
    return (
      <p className="font-mono-data text-xs text-amber-400">
        {error ?? "Sin metadata de servicio."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!compact && (
        <p className="label-terminal">Agent Card · antes de pagar</p>
      )}
      <div>
        <p className="font-mono-data text-xs font-semibold text-surface-950">
          {card.name ?? agentId}
        </p>
        {card.description && (
          <p className="mt-1 font-mono-data text-[11px] leading-5 text-surface-500">
            {card.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {card.x402 && <Chip>x402</Chip>}
          {card.preferredTransport && <Chip>{card.preferredTransport}</Chip>}
          {card.protocolVersion && (
            <Chip>{`v${card.protocolVersion}`}</Chip>
          )}
          {card.provider && <Chip>{card.provider}</Chip>}
        </div>
      </div>

      {card.skills.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {card.skills.map((skill) => (
            <li key={skill.id ?? skill.name} title={skill.description ?? undefined}>
              <Chip>{skill.name}</Chip>
            </li>
          ))}
        </ul>
      )}

      {card.endpoint && (
        <p className="break-all font-mono-data text-[10px] text-surface-500">
          A2A {card.endpoint}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowRaw((value) => !value)}
        className="btn-secondary w-full !px-3 !py-1.5 text-[11px]"
      >
        {showRaw ? "Ocultar JSON crudo" : "Ver JSON crudo"}
      </button>
      {showRaw && (
        <pre className="max-h-48 overflow-auto bg-surface-100 p-3 font-mono-data text-[10px] text-surface-800">
          {JSON.stringify(card.card, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="badge-gray">{children}</span>;
}
