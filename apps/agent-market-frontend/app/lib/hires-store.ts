import type { Address, Hex } from "viem";

export type StoredX402Hire = {
  id: string;
  rail: "x402";
  agentId: string | null;
  agentName: string | null;
  payTo: Address;
  amount: string;
  asset: string;
  tx: string | null;
  chainId: number;
  client: Address;
  createdAt: number;
};

function storageKey(chainId: number, client: string): string {
  return `x402.hires.v1:${chainId}:${client.toLowerCase()}`;
}

export function loadStoredHires(
  chainId: number,
  client: string,
): StoredX402Hire[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(chainId, client));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredX402Hire[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberHire(hire: StoredX402Hire): void {
  if (typeof window === "undefined") return;
  const current = loadStoredHires(hire.chainId, hire.client).filter(
    (item) => item.id !== hire.id,
  );
  current.unshift(hire);
  window.localStorage.setItem(
    storageKey(hire.chainId, hire.client),
    JSON.stringify(current.slice(0, 40)),
  );
}

export function newHireId(tx?: string | Hex | null): string {
  if (tx) return `x402:${tx}`;
  return `x402:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}
