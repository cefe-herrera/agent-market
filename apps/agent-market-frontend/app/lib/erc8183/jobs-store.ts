import type { Address, Hex } from "viem";

export type StoredErc8183Job = {
  jobId: string;
  chainId: number;
  /** On-chain `client` — Buyer Safe after the 7579 batch. */
  client: Address;
  /** Connected EOA that owns the Buyer Safe. Used as localStorage key. */
  ownerEoa?: Address;
  provider: Address;
  createdAt: number;
  agentId?: string | null;
  agentName?: string | null;
  hashes: {
    create?: Hex;
    register?: Hex;
    fund?: Hex;
  };
};

function storageKey(chainId: number, client: string): string {
  return `erc8183.jobs.v1:${chainId}:${client.toLowerCase()}`;
}

export function loadStoredJobs(
  chainId: number,
  client: string,
): StoredErc8183Job[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(chainId, client));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredErc8183Job[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberJob(job: StoredErc8183Job): void {
  if (typeof window === "undefined") return;
  const viewers = new Set(
    [job.ownerEoa, job.client].filter(Boolean).map((addr) => addr!.toLowerCase()),
  );
  for (const viewer of viewers) {
    const current = loadStoredJobs(job.chainId, viewer).filter(
      (item) => item.jobId !== job.jobId,
    );
    current.unshift(job);
    window.localStorage.setItem(
      storageKey(job.chainId, viewer),
      JSON.stringify(current.slice(0, 20)),
    );
  }
}
