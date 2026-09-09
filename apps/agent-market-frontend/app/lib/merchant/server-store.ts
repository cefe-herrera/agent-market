import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAddress, isAddress, type Address } from "viem";
import { merchantMatchesId, type PublicMerchant } from "./types";

function filePath() {
  return join(process.cwd(), ".data", "merchants.json");
}

function asAddress(value: string | null | undefined): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
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
  return (
    listPublicMerchants().find((item) => merchantMatchesId(item, id)) ?? null
  );
}

export function upsertPublicMerchant(input: PublicMerchant): PublicMerchant {
  if (!isAddress(input.owner) || !isAddress(input.payTo)) {
    throw new Error("owner / payTo must be addresses");
  }
  if (input.provider8183 && !isAddress(input.provider8183)) {
    throw new Error("provider8183 must be an address");
  }
  if (input.sessionAddress && !isAddress(input.sessionAddress)) {
    throw new Error("sessionAddress must be an address");
  }
  const listing: PublicMerchant = {
    ...input,
    owner: getAddress(input.owner),
    payTo: getAddress(input.payTo),
    provider8183: asAddress(input.provider8183),
    sessionAddress: asAddress(input.sessionAddress),
    createdAt: input.createdAt || Date.now(),
  };
  const rest = listPublicMerchants().filter(
    (item) =>
      item.agentId !== listing.agentId &&
      !(listing.catalogId && item.catalogId === listing.catalogId),
  );
  const next = [listing, ...rest].slice(0, 100);
  mkdirSync(join(process.cwd(), ".data"), { recursive: true });
  writeFileSync(filePath(), JSON.stringify(next, null, 2));
  return listing;
}
