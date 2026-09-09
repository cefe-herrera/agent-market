import { geminiAgentCardPreview } from "@/app/lib/gemini/agent-card";
import {
  geminiCardPath,
  geminiHirePath,
  geminiAgentKind,
  isGeminiAgentId,
} from "@/app/lib/gemini/ids";
import { skillsForKind, skillIds } from "@/app/lib/gemini/skills";
import { resolveIndexerAgent } from "@/app/lib/indexer-bnb";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";

export type A2aProbe = {
  healthy: boolean;
  status: string;
  endpoint: string | null;
  error: string | null;
  skills: string[];
  priceLabel: string | null;
};

function abs(origin: string, url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && origin) return `${origin.replace(/\/$/, "")}${url}`;
  return url;
}

async function ping(
  url: string,
): Promise<{ ok: boolean; status: number; error: string | null }> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    const ok =
      res.ok || res.status === 401 || res.status === 402 || res.status === 403;
    return {
      ok,
      status: res.status,
      error: ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function missing(error: string, skills: string[] = []): A2aProbe {
  return {
    healthy: false,
    status: "missing",
    endpoint: null,
    error,
    skills,
    priceLabel: null,
  };
}

export async function probeAgentA2a(
  id: string,
  origin = "",
): Promise<A2aProbe> {
  if (isGeminiAgentId(id)) {
    const preview = geminiAgentCardPreview(id, origin);
    const cardUrl = abs(origin, geminiCardPath(id));
    const hireUrl = abs(origin, geminiHirePath(id));
    const card = cardUrl ? await ping(cardUrl) : { ok: false, status: 0, error: "no origin" };
    const hire = !card.ok && hireUrl ? await ping(hireUrl) : card;
    const ok = card.ok || hire.ok;
    return {
      healthy: ok,
      status: ok ? "healthy" : "unhealthy",
      endpoint: card.ok ? cardUrl : hireUrl,
      error: ok ? null : hire.error ?? card.error,
      skills:
        preview?.skills.map((skill) => skill.id ?? skill.name) ??
        skillIds(skillsForKind(geminiAgentKind(id))),
      priceLabel: "0.001 $U hire",
    };
  }

  const merchant = getPublicMerchant(id);
  if (merchant) {
    const endpoint = abs(origin, merchant.a2a ?? merchant.cardUrl);
    if (!endpoint) return missing("Merchant has no A2A URL");
    const result = await ping(endpoint);
    return {
      healthy: result.ok,
      status: result.ok ? "healthy" : "unhealthy",
      endpoint,
      error: result.error,
      skills: ["hire"],
      priceLabel: "0.001 $U hire",
    };
  }

  try {
    const agent = await resolveIndexerAgent(id);
    const raw =
      agent?.endpoints?.a2a ??
      agent?.a2a?.endpoint ??
      agent?.agentUri ??
      null;
    const endpoint = abs(origin, raw);
    if (!endpoint) {
      return missing("No A2A URL in indexer metadata", agent?.verification?.skills ?? []);
    }
    const result = await ping(endpoint);
    return {
      healthy: result.ok,
      status: result.ok ? "healthy" : "unhealthy",
      endpoint,
      error: result.error,
      skills: agent?.verification?.skills ?? [],
      priceLabel: agent?.verification?.priceLabel ?? null,
    };
  } catch (err) {
    return {
      healthy: false,
      status: "unhealthy",
      endpoint: null,
      error: err instanceof Error ? err.message : String(err),
      skills: [],
      priceLabel: null,
    };
  }
}
