import type { Address } from "viem";
import type { LocalMerchant, PublicMerchant } from "./types";

const KEY = "merchant.listings.v1";

export function loadLocalMerchants(): LocalMerchant[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalMerchant[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberLocalMerchant(listing: LocalMerchant): void {
  if (typeof window === "undefined") return;
  const next = [
    listing,
    ...loadLocalMerchants().filter(
      (item) => item.agentId !== listing.agentId,
    ),
  ].slice(0, 30);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function localMerchantForAgent(
  agentId: string | null | undefined,
): LocalMerchant | null {
  if (!agentId) return null;
  const needle = agentId.toLowerCase();
  return (
    loadLocalMerchants().find(
      (item) =>
        item.agentId.toLowerCase() === needle || item.tokenId === agentId,
    ) ?? null
  );
}

export function local8183Provider(
  agentId: string | null | undefined,
): Address | null {
  const hit = localMerchantForAgent(agentId);
  return hit?.provider8183 ?? null;
}

export async function publishMerchant(
  listing: PublicMerchant,
): Promise<void> {
  await fetch("/api/merchant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(listing),
  });
}
