import { encodeFunctionData, getAddress, type Address, type Hex } from "viem";
import { COMMERCE_ABI, ERC20_ABI, ROUTER_ABI } from "@/app/lib/erc8183/abis";
import {
  DEFAULT_APPROVE_FLOOR_UNITS,
  ERC8183_TOKEN_DECIMALS,
  getErc8183,
} from "@/app/lib/erc8183/addresses";
import {
  assertExpiredAt,
  assertPaymentTokenMatchesX402,
  defaultExpiredAt,
  readDisputeWindow,
  readJob,
  readNextJobId,
  readTokenDecimals,
} from "@/app/lib/erc8183/read";
import type { CreateAndFundStep } from "@/app/lib/erc8183/types";
import { parseJobCreatedId } from "@/app/lib/erc8183/write";
import { BUYER_SAFE_SALT_NONCE } from "./addresses";
import {
  createSafe7579Client,
  waitUserOp,
  type SafeOwner,
} from "./safe7579";

const EMPTY_BYTES = "0x" as Hex;

export type BatchedHireResult = {
  jobId: bigint;
  buyerSafe: Address;
  userOpHash: Hex;
  hashes: { create: Hex; fund?: Hex };
  ops: 1 | 2;
};

type Call = { to: Address; data: Hex; value?: bigint };

function createJobCall(opts: {
  commerce: Address;
  provider: Address;
  evaluator: Address;
  expiredAt: bigint;
  description: string;
  hook: Address;
}): Call {
  return {
    to: opts.commerce,
    data: encodeFunctionData({
      abi: COMMERCE_ABI,
      functionName: "createJob",
      args: [
        opts.provider,
        opts.evaluator,
        opts.expiredAt,
        opts.description,
        opts.hook,
      ],
    }),
  };
}

function fundCalls(opts: {
  commerce: Address;
  router: Address;
  policy: Address;
  token: Address;
  jobId: bigint;
  amount: bigint;
  approveCap: bigint;
}): Call[] {
  const calls: Call[] = [
    {
      to: opts.router,
      data: encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: "registerJob",
        args: [opts.jobId, opts.policy],
      }),
    },
  ];
  if (opts.amount > BigInt(0)) {
    calls.push({
      to: opts.commerce,
      data: encodeFunctionData({
        abi: COMMERCE_ABI,
        functionName: "setBudget",
        args: [opts.jobId, opts.amount, EMPTY_BYTES],
      }),
    });
    calls.push({
      to: opts.token,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [opts.commerce, opts.approveCap],
      }),
    });
    calls.push({
      to: opts.commerce,
      data: encodeFunctionData({
        abi: COMMERCE_ABI,
        functionName: "fund",
        args: [opts.jobId, opts.amount, EMPTY_BYTES],
      }),
    });
  }
  return calls;
}

async function approveCap(
  amount: bigint,
  token: Address,
  chainId: number,
): Promise<bigint> {
  if (amount === BigInt(0)) return BigInt(0);
  const decimals = await readTokenDecimals(token, chainId);
  const floor =
    DEFAULT_APPROVE_FLOOR_UNITS *
    BigInt(10) ** BigInt(decimals || ERC8183_TOKEN_DECIMALS);
  return amount > floor ? amount : floor;
}

/**
 * Buyer Safe 7579: createJob + registerJob + setBudget + approve + fund
 * in one UserOp (predicted jobId). If the counter races, fallback is two UserOps.
 */
export async function createAndFundJobBatched(
  owner: SafeOwner,
  opts: {
    provider: Address;
    description: string;
    amount: bigint;
    expiredAt?: bigint;
    chainId?: number;
    onStep?: (
      step: CreateAndFundStep,
      extra?: { jobId?: bigint; hash?: Hex },
    ) => void;
  },
): Promise<BatchedHireResult> {
  const cfg = getErc8183(opts.chainId);
  opts.onStep?.("checking");
  const token = await assertPaymentTokenMatchesX402(cfg.chainId);
  const expiredAt = opts.expiredAt ?? (await defaultExpiredAt(cfg.chainId));
  const disputeWindow = await readDisputeWindow(cfg.chainId);
  assertExpiredAt(expiredAt, disputeWindow);

  const { client, address: buyerSafe } = await createSafe7579Client({
    owner,
    chainId: cfg.chainId,
    saltNonce: BUYER_SAFE_SALT_NONCE,
  });

  const cap = await approveCap(opts.amount, token, cfg.chainId);
  const create = createJobCall({
    commerce: cfg.commerce,
    provider: getAddress(opts.provider),
    evaluator: cfg.router,
    expiredAt,
    description: opts.description,
    hook: cfg.router,
  });

  const predictedId = await readNextJobId(cfg.chainId);
  opts.onStep?.("bundling", { jobId: predictedId });

  try {
    const userOpHash = await client.sendUserOperation({
      calls: [
        create,
        ...fundCalls({
          commerce: cfg.commerce,
          router: cfg.router,
          policy: cfg.policy,
          token,
          jobId: predictedId,
          amount: opts.amount,
          approveCap: cap,
        }),
      ],
    });
    const { tx, logs } = await waitUserOp(userOpHash, cfg.chainId);
    const jobId = parseJobCreatedId(logs, cfg.commerce);
    if (jobId !== predictedId) {
      throw new Error(
        `jobCounter race: predicted ${predictedId}, JobCreated ${jobId}`,
      );
    }
    const job = await readJob(jobId, cfg.chainId);
    if (job.client.toLowerCase() !== buyerSafe.toLowerCase()) {
      throw new Error(
        `job.client ${job.client} != Buyer Safe ${buyerSafe}`,
      );
    }
    opts.onStep?.("done", { jobId, hash: tx });
    return {
      jobId,
      buyerSafe,
      userOpHash,
      hashes: { create: tx, fund: tx },
      ops: 1,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      /jobCounter race|user rejected|denied|Falta PIMLICO|rejected/i.test(
        message,
      )
    ) {
      throw err;
    }
    opts.onStep?.("creating");
    return createThenFund(
      { client, buyerSafe, chainId: cfg.chainId },
      {
        create,
        token,
        amount: opts.amount,
        cap,
        onStep: opts.onStep,
      },
    );
  }
}

async function createThenFund(
  ctx: {
    client: Awaited<ReturnType<typeof createSafe7579Client>>["client"];
    buyerSafe: Address;
    chainId: number;
  },
  opts: {
    create: Call;
    token: Address;
    amount: bigint;
    cap: bigint;
    onStep?: (
      step: CreateAndFundStep,
      extra?: { jobId?: bigint; hash?: Hex },
    ) => void;
  },
): Promise<BatchedHireResult> {
  const cfg = getErc8183(ctx.chainId);
  const createHash = await ctx.client.sendUserOperation({
    calls: [opts.create],
  });
  const created = await waitUserOp(createHash, cfg.chainId);
  const jobId = parseJobCreatedId(created.logs, cfg.commerce);
  opts.onStep?.("funding", { jobId, hash: created.tx });

  const fundHash = await ctx.client.sendUserOperation({
    calls: fundCalls({
      commerce: cfg.commerce,
      router: cfg.router,
      policy: cfg.policy,
      token: opts.token,
      jobId,
      amount: opts.amount,
      approveCap: opts.cap,
    }),
  });
  const funded = await waitUserOp(fundHash, cfg.chainId);
  const fundTx = funded.tx;
  const createTx = created.tx;
  opts.onStep?.("done", { jobId, hash: fundTx });
  return {
    jobId,
    buyerSafe: ctx.buyerSafe,
    userOpHash: fundHash,
    hashes: { create: createTx, fund: fundTx },
    ops: 2,
  };
}
