import { isGeminiAgentId } from "@/app/lib/gemini/ids";
import {
  hireApiPath,
  hireApiPathWithSeller,
  marketplaceAgentPath,
  marketplaceAgentsPath,
  x402SettleApiPath,
} from "@/app/lib/env-routes";

const ERC8004_RE = /^\d+:0x[a-fA-F0-9]{40}:\d+$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Indexer / Nest demo sellers. Merchants and Gemini stay on the Next BFF. */
export function isNestMarketplaceId(id?: string | null): boolean {
  if (!id || isGeminiAgentId(id)) return false;
  return (
    id.startsWith("demo:") || ERC8004_RE.test(id) || UUID_RE.test(id)
  );
}

/** Browser = BFF (HTTPS). Nest HTTP URLs are NEXT_PUBLIC_MARKETPLACE_API / HIRE / X402_SETTLE. */
export function marketplaceAgentsUrl(search = ""): string {
  return marketplaceAgentsPath(search);
}

export function marketplaceAgentUrl(id: string, suffix = ""): string {
  return marketplaceAgentPath(id, suffix);
}

export function hireResourceUrl(_agentId?: string | null): string {
  return hireApiPath();
}

export function x402SettleUrl(): string {
  return x402SettleApiPath();
}

export function hireFeedbackUri(origin: string, agentId: string): string {
  const path = hireApiPathWithSeller(agentId);
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}
