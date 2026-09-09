import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress, isAddress } from "viem";
import type { PublicMerchant } from "./types";

function filePath() {
  return join(process.cwd(), ".data", "merchants.json");
}

export function listPublicMerchants(): PublicMerchant[] {
  try {
    const raw = readFileSync(filePath(), "utf8");
    const parsed = JSON.parse(raw) as PublicMerchant[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getPublicMerchant(id: string): PublicMerchant | null {
  const needle = decodeURIComponent(id).toLowerCase();
  return (
    listPublicMerchants().find(
      (item) =>
        item.agentId.toLowerCase() === needle ||
        item.tokenId === id ||
        item.owner.toLowerCase() === needle,
    ) ?? null
  );
}

export function upsertPublicMerchant(input: PublicMerchant): PublicMerchant {
  if (!isAddress(input.owner) || !isAddress(input.payTo) || !isAddress(input.provider8183)) {
    throw new Error("owner / payTo / provider8183 must be addresses");
  }
  const listing: PublicMerchant = {
    ...input,
    owner: getAddress(input.owner),
    payTo: getAddress(input.payTo),
    provider8183: getAddress(input.provider8183),
    sessionAddress: getAddress(input.sessionAddress),
    createdAt: input.createdAt || Date.now(),
  };
  const rest = listPublicMerchants().filter(
    (item) => item.agentId !== listing.agentId,
  );
  const next = [listing, ...rest].slice(0, 100);
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  writeFileSync(filePath(), JSON.stringify(next, null, 2));
  return listing;
}
