import { getDemoSeller } from "@/app/lib/demo-agents";
import { apiUrl } from "@/app/lib/api";
import { X402_PAYMENT_AMOUNT } from "@/app/lib/x402-usdc";

export type AgentWork = {
  agent: string;
  kind: string;
  source: string;
  json: unknown;
  receipt: {
    paid: string;
    asset: "U";
    network: "eip155:97";
    payer: string | null;
    payTo: string | null;
    tx: string | null;
  };
};

function receipt(opts: {
  payer?: string | null;
  payTo?: string | null;
  settleTx?: string | null;
}): AgentWork["receipt"] {
  return {
    paid: X402_PAYMENT_AMOUNT,
    asset: "U",
    network: "eip155:97",
    payer: opts.payer ?? null,
    payTo: opts.payTo ?? null,
    tx: opts.settleTx ?? null,
  };
}

function isLiveHttpUrl(value?: string | null): value is string {
  if (!value) return false;
  const url = value.toLowerCase();
  if (url.includes(".example") || url.includes("example.com")) return false;
  if (url.startsWith("erc8004://") || url.startsWith("ipfs://")) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

async function readUnknown(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return { status: res.status, empty: true };
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { status: res.status, text };
  }
}

function collectHttpUrls(value: unknown, out = new Set<string>()): string[] {
  if (typeof value === "string") {
    const matches = value.match(/https?:\/\/[^\s"'<>\\]+/gi) ?? [];
    for (const raw of matches) {
      const cleaned = raw.replace(/[),.;]+$/, "");
      if (isLiveHttpUrl(cleaned)) out.add(cleaned);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectHttpUrls(item, out);
    }
  }
  return [...out];
}

function decodeDataJsonUri(value?: string | null): unknown | null {
  if (!value) return null;
  const match = value.match(
    /^data:application\/json(?:;charset=[^;,]+)?;base64,(.+)$/i,
  );
  if (!match) return null;
  try {
    return JSON.parse(Buffer.from(match[1], "base64").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function agentUriOf(record: unknown): string | null {
  if (!record || typeof record !== "object") return null;
  const uri = (record as { agentUri?: unknown }).agentUri;
  return typeof uri === "string" ? uri : null;
}

async function fetchIndexedJson(agentId: string): Promise<{
  source: string;
  json: unknown;
}> {
  let indexer: unknown = null;
  try {
    const res = await fetch(
      apiUrl(`/agents/${encodeURIComponent(agentId)}`),
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    indexer = await readUnknown(res);
  } catch (err) {
    return {
      source: "indexer",
      json: { error: err instanceof Error ? err.message : String(err) },
    };
  }

  const registration = decodeDataJsonUri(agentUriOf(indexer)) ?? indexer;
  const urls = collectHttpUrls(registration).slice(0, 3);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      const json = await readUnknown(res);
      if (json && typeof json === "object" && !("empty" in json)) {
        if (!("error" in json) || Object.keys(json).length > 1) {
          return { source: url, json };
        }
      }
    } catch {
      /* placeholder / down — fall through to registration JSON */
    }
  }

  return {
    source: "erc-8004 registration",
    json: registration,
  };
}

export async function resolvePaidWork(opts: {
  agentId: string;
  agentName?: string | null;
  payer?: string | null;
  payTo?: string | null;
  settleTx?: string | null;
}): Promise<AgentWork> {
  const demo = getDemoSeller(opts.agentId);
  if (demo) {
    return {
      agent: demo.name,
      kind: demo.agentId,
      source: "demo seller · frozen JSON",
      json: demo.json,
      receipt: receipt(opts),
    };
  }

  const indexed = await fetchIndexedJson(opts.agentId);
  return {
    agent: opts.agentName || opts.agentId,
    kind: opts.agentId,
    source: indexed.source,
    json: indexed.json,
    receipt: receipt(opts),
  };
}
