import { YIELD_AGENT_ID, yieldCardPath, yieldHirePath } from "@/app/lib/gemini/ids";
import { merchantCardPath } from "@/app/lib/env-routes";
import { cardToDataUri } from "./card";

export type AgentUriMode = "live" | "snapshot";

export function stripOrigin(value?: string | null): string {
  return (value ?? "").trim().replace(/\/$/, "");
}

export function publicAppOrigin(fallback = ""): string {
  return stripOrigin(process.env.NEXT_PUBLIC_APP_ORIGIN) || stripOrigin(fallback);
}

export function joinOrigin(origin: string, path: string): string {
  const base = stripOrigin(origin);
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${suffix}` : suffix;
}

export function liveYieldCardUrl(origin: string): string {
  return joinOrigin(origin, yieldCardPath());
}

export function liveYieldHireUrl(origin: string): string {
  return joinOrigin(origin, yieldHirePath());
}

export function liveMerchantCardUrl(origin: string, agentId: string): string {
  return joinOrigin(origin, merchantCardPath(agentId));
}

export function resolveAgentUri(opts: {
  mode: AgentUriMode;
  card: Record<string, unknown>;
  liveUrl: string;
}): string {
  if (opts.mode === "live") {
    const url = opts.liveUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("URI viva: pegá una URL http(s) del Agent Card");
    }
    return url;
  }
  return cardToDataUri(opts.card);
}

export function defaultLiveCardUrl(opts: {
  origin: string;
  catalogId?: string | null;
  agentId?: string | null;
}): string {
  const origin = stripOrigin(opts.origin);
  if (opts.catalogId === YIELD_AGENT_ID || opts.agentId === YIELD_AGENT_ID) {
    return liveYieldCardUrl(origin);
  }
  if (opts.agentId) return liveMerchantCardUrl(origin, opts.agentId);
  return liveYieldCardUrl(origin);
}
