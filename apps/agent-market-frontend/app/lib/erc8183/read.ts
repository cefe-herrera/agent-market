import {
  createPublicClient,
  getAddress,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { COMMERCE_ABI, ERC20_ABI, POLICY_ABI } from "./abis";
import {
  ERC8183_TOKEN_DECIMALS,
  EXPIRY_BUFFER_SECONDS,
  getErc8183,
} from "./addresses";
import { JobStatus, type Job } from "./types";

const FALLBACK_DISPUTE_WINDOW = 86_400n;

const clients = new Map<number, PublicClient>();

export function erc8183PublicClient(chainId?: number): PublicClient {
  const cfg = getErc8183(chainId);
  const cached = clients.get(cfg.chainId);
  if (cached) return cached;
  const client = createPublicClient({
    chain: cfg.chain,
    transport: http(cfg.rpc),
  });
  clients.set(cfg.chainId, client);
  return client;
}

export async function readJobCounter(chainId?: number): Promise<bigint> {
  const cfg = getErc8183(chainId);
  return erc8183PublicClient(cfg.chainId).readContract({
    address: cfg.commerce,
    abi: COMMERCE_ABI,
    functionName: "jobCounter",
  });
}

/** Next jobId if createJob does `++counter` (ids are 1..counter). */
export async function readNextJobId(chainId?: number): Promise<bigint> {
  const counter = await readJobCounter(chainId);
  return counter + BigInt(1);
}

export async function readPaymentToken(chainId?: number): Promise<Address> {
  const cfg = getErc8183(chainId);
  const token = await erc8183PublicClient(cfg.chainId).readContract({
    address: cfg.commerce,
    abi: COMMERCE_ABI,
    functionName: "paymentToken",
  });
  return getAddress(token);
}

/** Commerce is source of truth. Fail if it is not the $U used by x402. */
export async function assertPaymentTokenMatchesX402(
  chainId?: number,
): Promise<Address> {
  const cfg = getErc8183(chainId);
  const token = await readPaymentToken(cfg.chainId);
  if (token.toLowerCase() !== cfg.expectedPaymentToken.toLowerCase()) {
    throw new Error(
      `commerce.paymentToken() ${token} != $U ${cfg.expectedPaymentToken} on chain ${cfg.chainId}`,
    );
  }
  return token;
}

export async function readDisputeWindow(chainId?: number): Promise<bigint> {
  const cfg = getErc8183(chainId);
  try {
    const window = await erc8183PublicClient(cfg.chainId).readContract({
      address: cfg.policy,
      abi: POLICY_ABI,
      functionName: "disputeWindow",
    });
    return BigInt(window);
  } catch {
    return FALLBACK_DISPUTE_WINDOW;
  }
}

export async function defaultExpiredAt(chainId?: number): Promise<bigint> {
  const window = await readDisputeWindow(chainId);
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now + window + EXPIRY_BUFFER_SECONDS;
}

export function assertExpiredAt(
  expiredAt: bigint,
  disputeWindow: bigint,
  now = BigInt(Math.floor(Date.now() / 1000)),
): void {
  if (expiredAt - now <= disputeWindow) {
    throw new Error(
      `expiredAt ${expiredAt} is too close to now (${now}). Need now + disputeWindow (${disputeWindow}s) + buffer.`,
    );
  }
}

export async function readJob(jobId: bigint, chainId?: number): Promise<Job> {
  const cfg = getErc8183(chainId);
  const raw = await erc8183PublicClient(cfg.chainId).readContract({
    address: cfg.commerce,
    abi: COMMERCE_ABI,
    functionName: "getJob",
    args: [jobId],
  });
  return {
    id: raw.id,
    client: getAddress(raw.client),
    provider: getAddress(raw.provider),
    evaluator: getAddress(raw.evaluator),
    description: raw.description,
    budget: raw.budget,
    expiredAt: raw.expiredAt,
    status: raw.status as JobStatus,
    hook: getAddress(raw.hook),
    submittedAt: raw.submittedAt,
    deliverable: raw.deliverable,
  };
}

export async function readAllowance(
  owner: Address,
  spender: Address,
  token: Address,
  chainId?: number,
): Promise<bigint> {
  return erc8183PublicClient(chainId).readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [getAddress(owner), getAddress(spender)],
  });
}

export async function readTokenBalance(
  owner: Address,
  token: Address,
  chainId?: number,
): Promise<bigint> {
  return erc8183PublicClient(chainId).readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [getAddress(owner)],
  });
}

export async function readTokenDecimals(
  token: Address,
  chainId?: number,
): Promise<number> {
  try {
    return Number(
      await erc8183PublicClient(chainId).readContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "decimals",
      }),
    );
  } catch {
    return ERC8183_TOKEN_DECIMALS;
  }
}
