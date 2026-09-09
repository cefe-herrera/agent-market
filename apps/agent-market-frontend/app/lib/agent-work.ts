import { getDemoSeller } from "@/app/lib/demo-agents";
import { geminiAgentName } from "@/app/lib/gemini/catalog";
import { geminiAgentKind } from "@/app/lib/gemini/ids";
import { resolveIndexerAgent } from "@/app/lib/indexer-bnb";
import { X402_NETWORK, X402_PAYMENT_AMOUNT } from "@/app/lib/x402-usdc";

export type AgentWork = {
  agent: string;
  kind: string;
  source: string;
  json: unknown;
  receipt: {
    paid: string;
    asset: "U";
    network: typeof X402_NETWORK;
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
    network: X402_NETWORK,
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

function isMachineCallableUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (u.includes("amazoncognito.com")) return false;
  if (u.includes("/oauth2/")) return false;
  if (u.includes("/login") || u.includes("/signin")) return false;
  if (u.includes("accounts.google.com")) return false;
  if (u.includes("github.com/")) return false;
  if (u.includes("twitter.com") || u.includes("x.com/")) return false;
  if (u.includes("linkedin.com")) return false;
  return true;
}

function urlPriority(url: string): number {
  const u = url.toLowerCase();
  if (u.includes("agent-card") || u.includes("/.well-known/")) return 0;
  if (u.includes("/a2a") || u.includes("/mcp")) return 1;
  return 2;
}

function looksLikeHtml(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const rec = json as Record<string, unknown>;
  if (typeof rec.text === "string" && /<!DOCTYPE\s+html|<html[\s>]/i.test(rec.text)) {
    return true;
  }
  return false;
}

function isUsableServicePayload(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  if (looksLikeHtml(json)) return false;
  const rec = json as Record<string, unknown>;
  if ("empty" in rec) return false;
  if ("error" in rec && Object.keys(rec).length <= 1) return false;
  return true;
}

async function readUnknown(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return { status: res.status, empty: true };
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html") || /<!DOCTYPE\s+html|<html[\s>]/i.test(text)) {
    return { status: res.status, text, html: true };
  }
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
      if (isLiveHttpUrl(cleaned) && isMachineCallableUrl(cleaned)) out.add(cleaned);
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

function declaredServiceUrls(record: unknown): string[] {
  if (!record || typeof record !== "object") return [];
  const rec = record as Record<string, unknown>;
  const endpoints = rec.endpoints as Record<string, unknown> | undefined;
  const a2a = rec.a2a as Record<string, unknown> | undefined;
  const raw = [
    typeof endpoints?.a2a === "string" ? endpoints.a2a : null,
    typeof endpoints?.mcp === "string" ? endpoints.mcp : null,
    typeof endpoints?.agentUrl === "string" ? endpoints.agentUrl : null,
    typeof a2a?.endpoint === "string" ? a2a.endpoint : null,
  ];
  return raw.filter(
    (url): url is string => isLiveHttpUrl(url) && isMachineCallableUrl(url),
  );
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
    const agent = await resolveIndexerAgent(agentId);
    indexer = agent ?? { error: "Agent not found in indexer" };
  } catch (err) {
    return {
      source: "indexer",
      json: { error: err instanceof Error ? err.message : String(err) },
    };
  }

  const registration = decodeDataJsonUri(agentUriOf(indexer)) ?? indexer;
  const urls = [
    ...declaredServiceUrls(indexer),
    ...collectHttpUrls(registration),
  ]
    .filter((url, index, all) => all.indexOf(url) === index)
    .sort((a, b) => urlPriority(a) - urlPriority(b))
    .slice(0, 5);

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      const json = await readUnknown(res);
      if (isUsableServicePayload(json)) {
        return { source: url, json };
      }
    } catch {
      /* placeholder / down / human login page — fall through */
    }
  }

  return {
    source: "erc-8004 registration",
    json: {
      note: "No machine-callable A2A/MCP JSON found. Registration may describe a human/OAuth service.",
      registration,
    },
  };
}

export async function resolvePaidWork(opts: {
  agentId: string;
  agentName?: string | null;
  payer?: string | null;
  payTo?: string | null;
  settleTx?: string | null;
}): Promise<AgentWork> {
  const kind = geminiAgentKind(opts.agentId);
  if (kind === "health") {
    const { runHealthGuard } = await import("@/app/lib/gemini/health");
    const json = await runHealthGuard({
      payer: opts.payer,
      capital: "1000",
    });
    return {
      agent: opts.agentName || geminiAgentName(opts.agentId) || "VenusGuard",
      kind: opts.agentId,
      source:
        json.model === "gemini"
          ? "gemini · health factor · venus"
          : "gemini fallback · health factor",
      json,
      receipt: receipt(opts),
    };
  }

  if (kind === "grid") {
    const { runGridTrader } = await import("@/app/lib/gemini/grid");
    const json = await runGridTrader({
      payer: opts.payer,
      capital: "1000",
    });
    return {
      agent: opts.agentName || geminiAgentName(opts.agentId) || "GridPilot",
      kind: opts.agentId,
      source:
        json.model === "gemini"
          ? "gemini · grid trading · aster"
          : "gemini fallback · grid trading",
      json,
      receipt: receipt(opts),
    };
  }

  if (kind === "rebalance") {
    const { runRebalancer } = await import("@/app/lib/gemini/rebalance");
    const json = await runRebalancer({
      payer: opts.payer,
      capital: "1000",
    });
    return {
      agent: opts.agentName || geminiAgentName(opts.agentId) || "RangeKeeper",
      kind: opts.agentId,
      source:
        json.model === "gemini"
          ? "gemini · rebalancing · coingecko"
          : "gemini fallback · rebalancing",
      json,
      receipt: receipt(opts),
    };
  }

  if (kind === "yield") {
    const { runYieldOptimiser } = await import("@/app/lib/gemini/yield");
    const json = await runYieldOptimiser({
      payer: opts.payer,
      capital: "1000",
    });
    return {
      agent: opts.agentName || geminiAgentName(opts.agentId) || "Yield Router",
      kind: opts.agentId,
      source:
        json.model === "gemini"
          ? "gemini · yield optimisation"
          : "gemini fallback · yield optimisation",
      json,
      receipt: receipt(opts),
    };
  }

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
