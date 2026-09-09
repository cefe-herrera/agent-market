import {
  decodeEventLog,
  getAddress,
  size,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type TransactionReceipt,
  type Transport,
  type WalletClient,
} from "viem";
import { COMMERCE_ABI, ERC20_ABI, POLICY_ABI, ROUTER_ABI } from "./abis";
import {
  DEFAULT_APPROVE_FLOOR_UNITS,
  ERC8183_TOKEN_DECIMALS,
  ZERO_ADDRESS,
  getErc8183,
} from "./addresses";
import {
  assertExpiredAt,
  assertPaymentTokenMatchesX402,
  defaultExpiredAt,
  erc8183PublicClient,
  readAllowance,
  readDisputeWindow,
  readTokenDecimals,
} from "./read";
import type { CreateAndFundStep, JobWriteResult } from "./types";

const EMPTY_BYTES = "0x" as Hex;

export type Erc8183Wallet = WalletClient<
  Transport,
  Chain | undefined,
  Account | undefined
>;

export function parseJobCreatedId(
  logs: TransactionReceipt["logs"],
  commerce: Address,
): bigint {
  const target = commerce.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    try {
      const decoded = decodeEventLog({
        abi: COMMERCE_ABI,
        eventName: "JobCreated",
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "JobCreated") continue;
      if (decoded.args.jobId === undefined) continue;
      return decoded.args.jobId;
    } catch {
      /* not JobCreated */
    }
  }
  throw new Error("JobCreated event not found in receipt — cannot guess jobId");
}

function signerAccount(wallet: Erc8183Wallet, account?: Address): Address {
  const from = account ?? wallet.account?.address;
  if (!from) throw new Error("wallet account is required");
  return getAddress(from);
}

async function sendAndWait(
  wallet: Erc8183Wallet,
  hash: Promise<Hash>,
  chainId?: number,
): Promise<TransactionReceipt> {
  const tx = await hash;
  const receipt = await erc8183PublicClient(chainId).waitForTransactionReceipt({
    hash: tx,
  });
  if (receipt.status !== "success") {
    throw new Error(`transaction reverted: ${tx}`);
  }
  return receipt;
}

export async function createJob(
  wallet: Erc8183Wallet,
  opts: {
    provider: Address;
    description: string;
    expiredAt?: bigint;
    hook?: Address;
    account?: Address;
    chainId?: number;
  },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts.chainId);
  const account = signerAccount(wallet, opts.account);
  const expiredAt = opts.expiredAt ?? (await defaultExpiredAt(cfg.chainId));
  const disputeWindow = await readDisputeWindow(cfg.chainId);
  assertExpiredAt(expiredAt, disputeWindow);

  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.commerce,
      abi: COMMERCE_ABI,
      functionName: "createJob",
      args: [
        getAddress(opts.provider),
        cfg.router,
        expiredAt,
        opts.description,
        getAddress(opts.hook ?? cfg.router),
      ],
    }),
    cfg.chainId,
  );

  return {
    hash: receipt.transactionHash,
    jobId: parseJobCreatedId(receipt.logs, cfg.commerce),
  };
}

export async function registerJob(
  wallet: Erc8183Wallet,
  jobId: bigint,
  opts?: { account?: Address; chainId?: number; policy?: Address },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.router,
      abi: ROUTER_ABI,
      functionName: "registerJob",
      args: [jobId, getAddress(opts?.policy ?? cfg.policy)],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export async function setBudget(
  wallet: Erc8183Wallet,
  jobId: bigint,
  amount: bigint,
  opts?: { account?: Address; chainId?: number },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.commerce,
      abi: COMMERCE_ABI,
      functionName: "setBudget",
      args: [jobId, amount, EMPTY_BYTES],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export async function fund(
  wallet: Erc8183Wallet,
  jobId: bigint,
  expectedBudget: bigint,
  opts?: {
    account?: Address;
    chainId?: number;
    approveFloor?: bigint;
    onApprove?: (hash: Hex) => void;
  },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const token = await assertPaymentTokenMatchesX402(cfg.chainId);

  if (expectedBudget > 0n) {
    const allowance = await readAllowance(
      account,
      cfg.commerce,
      token,
      cfg.chainId,
    );
    if (allowance < expectedBudget) {
      const decimals = await readTokenDecimals(token, cfg.chainId);
      const floor =
        opts?.approveFloor !== undefined
          ? opts.approveFloor
          : DEFAULT_APPROVE_FLOOR_UNITS * 10n ** BigInt(decimals || ERC8183_TOKEN_DECIMALS);
      const cap = expectedBudget > floor ? expectedBudget : floor;
      const approval = await sendAndWait(
        wallet,
        wallet.writeContract({
          account,
          chain: wallet.chain ?? cfg.chain,
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [cfg.commerce, cap],
        }),
        cfg.chainId,
      );
      opts?.onApprove?.(approval.transactionHash);
    }
  }

  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.commerce,
      abi: COMMERCE_ABI,
      functionName: "fund",
      args: [jobId, expectedBudget, EMPTY_BYTES],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export async function submit(
  wallet: Erc8183Wallet,
  jobId: bigint,
  deliverable: Hex,
  opts?: { account?: Address; chainId?: number; optParams?: Hex },
): Promise<JobWriteResult> {
  if (size(deliverable) !== 32) {
    throw new Error("deliverable must be exactly 32 bytes");
  }
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.commerce,
      abi: COMMERCE_ABI,
      functionName: "submit",
      args: [jobId, deliverable, opts?.optParams ?? EMPTY_BYTES],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export async function settle(
  wallet: Erc8183Wallet,
  jobId: bigint,
  opts?: { account?: Address; chainId?: number; evidence?: Hex },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.router,
      abi: ROUTER_ABI,
      functionName: "settle",
      args: [jobId, opts?.evidence ?? EMPTY_BYTES],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export async function dispute(
  wallet: Erc8183Wallet,
  jobId: bigint,
  opts?: { account?: Address; chainId?: number },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.policy,
      abi: POLICY_ABI,
      functionName: "dispute",
      args: [jobId],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export async function claimRefund(
  wallet: Erc8183Wallet,
  jobId: bigint,
  opts?: { account?: Address; chainId?: number },
): Promise<JobWriteResult> {
  const cfg = getErc8183(opts?.chainId);
  const account = signerAccount(wallet, opts?.account);
  const receipt = await sendAndWait(
    wallet,
    wallet.writeContract({
      account,
      chain: wallet.chain ?? cfg.chain,
      address: cfg.commerce,
      abi: COMMERCE_ABI,
      functionName: "claimRefund",
      args: [jobId],
    }),
    cfg.chainId,
  );
  return { hash: receipt.transactionHash, jobId };
}

export function buildJobDescription(input: {
  task: string;
  agentId?: string | null;
  agentName?: string | null;
  a2a?: string | null;
  cardUrl?: string | null;
}): string {
  return JSON.stringify({
    version: 1,
    task: input.task,
    ...(input.agentId ? { agentId: input.agentId } : {}),
    ...(input.agentName ? { agentName: input.agentName } : {}),
    ...(input.a2a ? { a2a: input.a2a } : {}),
    ...(input.cardUrl ? { cardUrl: input.cardUrl } : {}),
  });
}

export async function createAndFundJob(
  wallet: Erc8183Wallet,
  opts: {
    provider: Address;
    description: string;
    amount: bigint;
    expiredAt?: bigint;
    account?: Address;
    chainId?: number;
    onStep?: (step: CreateAndFundStep, extra?: { jobId?: bigint; hash?: Hex }) => void;
  },
): Promise<{ jobId: bigint; hashes: { create: Hex; register: Hex; fund?: Hex } }> {
  const cfg = getErc8183(opts.chainId);
  opts.onStep?.("checking");
  await assertPaymentTokenMatchesX402(cfg.chainId);

  opts.onStep?.("creating");
  const created = await createJob(wallet, {
    provider: opts.provider,
    description: opts.description,
    expiredAt: opts.expiredAt,
    account: opts.account,
    chainId: cfg.chainId,
  });
  if (created.jobId === undefined) {
    throw new Error("createJob did not return a jobId");
  }
  opts.onStep?.("registering", { jobId: created.jobId, hash: created.hash });

  const registered = await registerJob(wallet, created.jobId, {
    account: opts.account,
    chainId: cfg.chainId,
  });
  opts.onStep?.("budget", { jobId: created.jobId, hash: registered.hash });

  if (opts.amount > 0n) {
    await setBudget(wallet, created.jobId, opts.amount, {
      account: opts.account,
      chainId: cfg.chainId,
    });
  }

  opts.onStep?.("funding", { jobId: created.jobId });
  const funded = await fund(wallet, created.jobId, opts.amount, {
    account: opts.account,
    chainId: cfg.chainId,
    onApprove: () => opts.onStep?.("approving", { jobId: created.jobId }),
  });

  opts.onStep?.("done", { jobId: created.jobId, hash: funded.hash });
  return {
    jobId: created.jobId,
    hashes: {
      create: created.hash,
      register: registered.hash,
      fund: funded.hash,
    },
  };
}

export { ZERO_ADDRESS };
