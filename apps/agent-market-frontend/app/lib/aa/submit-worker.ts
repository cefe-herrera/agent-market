import "server-only";

import {
  encodeFunctionData,
  getAddress,
  isAddress,
  keccak256,
  parseAbiItem,
  toBytes,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { entryPoint07Address, getUserOperationHash } from "viem/account-abstraction";
import { getAccountNonce } from "permissionless/actions";
import { COMMERCE_ABI } from "@/app/lib/erc8183/abis";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import {
  erc8183PublicClient,
  readDisputeWindow,
  readJob,
} from "@/app/lib/erc8183/read";
import { JobStatus } from "@/app/lib/erc8183/types";
import { isGeminiAgentId } from "@/app/lib/gemini/ids";
import { AGENT_SAFE_SALT_NONCE, agentSafeProvider } from "./addresses";
import { createSafe7579Client, waitUserOpTx } from "./safe7579";
import {
  commerceSubmitSession,
  encodeUseSessionSignature,
  sessionMockSignature,
  sessionValidatorNonce,
} from "./smart-sessions";

const JOB_FUNDED = parseAbiItem(
  "event JobFunded(uint256 indexed jobId, address indexed client, address indexed provider, uint256 amount)",
);

function sessionPrivateKey(): Hex {
  const raw = process.env.AGENT_SESSION_PRIVATE_KEY?.trim() ?? "";
  if (!raw.startsWith("0x") || raw.length !== 66) {
    throw new Error(
      "AGENT_SESSION_PRIVATE_KEY missing — worker-only, never NEXT_PUBLIC_.",
    );
  }
  return raw as Hex;
}

export function workerAgentSafe(chainId?: number): Address {
  const fromEnv = agentSafeProvider();
  if (fromEnv) return fromEnv;
  const raw = process.env.AGENT_SAFE_ADDRESS?.trim() ?? "";
  if (!raw || !isAddress(raw)) {
    throw new Error("AGENT_SAFE_ADDRESS / NEXT_PUBLIC_AGENT_SAFE_ADDRESS required");
  }
  return getAddress(raw);
  void chainId;
}

function parseJobMeta(description: string): {
  agentId?: string;
  task?: string;
} {
  try {
    const parsed = JSON.parse(description) as {
      agentId?: unknown;
      task?: unknown;
    };
    return {
      agentId: typeof parsed.agentId === "string" ? parsed.agentId : undefined,
      task: typeof parsed.task === "string" ? parsed.task : undefined,
    };
  } catch {
    return { task: description };
  }
}

function looksLikeYield(meta: { agentId?: string; task?: string }): boolean {
  if (isGeminiAgentId(meta.agentId)) return true;
  const task = meta.task?.toLowerCase() ?? "";
  return (
    task.includes("yield") ||
    task.includes("apr") ||
    task.includes("venus") ||
    task.includes("optimis")
  );
}

async function jobPayload(
  jobId: bigint,
  description: string,
): Promise<{ json: string; deliverable: Hex; optParams: Hex }> {
  const meta = parseJobMeta(description);
  if (looksLikeYield(meta)) {
    const { runYieldOptimiser } = await import("@/app/lib/gemini/yield");
    const work = await runYieldOptimiser({
      task: meta.task,
      jobId: jobId.toString(),
      capital: "1000",
    });
    const json = JSON.stringify(work);
    return {
      json,
      deliverable: keccak256(toBytes(json)),
      optParams: toHex(
        toBytes(
          JSON.stringify({
            deliverable_url: "gemini://yield",
            category: "YIELD_OPTIMISATION",
            executed: false,
          }),
        ),
      ),
    };
  }

  const json = JSON.stringify({
    version: 1,
    stub: true,
    jobId: jobId.toString(),
    at: Date.now(),
  });
  return {
    json,
    deliverable: keccak256(toBytes(json)),
    optParams: toHex(toBytes(JSON.stringify({ deliverable_url: "stub://local" }))),
  };
}

export async function listFundedJobsForAgent(opts?: {
  chainId?: number;
  lookbackBlocks?: bigint;
}): Promise<bigint[]> {
  const cfg = getErc8183(opts?.chainId);
  const provider = workerAgentSafe(cfg.chainId);
  const client = erc8183PublicClient(cfg.chainId);
  const latest = await client.getBlockNumber();
  const fromBlock =
    latest > (opts?.lookbackBlocks ?? BigInt(8000))
      ? latest - (opts?.lookbackBlocks ?? BigInt(8000))
      : BigInt(0);
  const logs = await client.getLogs({
    address: cfg.commerce,
    event: JOB_FUNDED,
    args: { provider },
    fromBlock,
    toBlock: latest,
  });
  const ids = [...new Set(logs.map((log) => log.args.jobId).filter((id): id is bigint => id !== undefined))];
  const funded: bigint[] = [];
  const now = BigInt(Math.floor(Date.now() / 1000));
  const window = await readDisputeWindow(cfg.chainId);
  for (const id of ids) {
    const job = await readJob(id, cfg.chainId);
    if (job.status !== JobStatus.FUNDED) continue;
    if (job.provider.toLowerCase() !== provider.toLowerCase()) continue;
    if (job.expiredAt - now <= window) continue;
    funded.push(id);
  }
  return funded.sort((a, b) => (a < b ? -1 : 1));
}

export async function submitStubWithSession(opts: {
  jobId: bigint;
  chainId?: number;
}): Promise<{ jobId: bigint; tx: Hex; userOpHash: Hex; deliverable: Hex }> {
  const cfg = getErc8183(opts.chainId);
  const agentSafe = workerAgentSafe(cfg.chainId);
  const job = await readJob(opts.jobId, cfg.chainId);
  if (job.status !== JobStatus.FUNDED) {
    throw new Error(`job ${opts.jobId} status ${job.status}, need FUNDED`);
  }
  if (job.provider.toLowerCase() !== agentSafe.toLowerCase()) {
    throw new Error(`job.provider ${job.provider} != Agent SA ${agentSafe}`);
  }

  const sessionOwner = privateKeyToAccount(sessionPrivateKey());
  const { client, pimlico, account } = await createSafe7579Client({
    owner: sessionOwner,
    chainId: cfg.chainId,
    saltNonce: AGENT_SAFE_SALT_NONCE,
    address: agentSafe,
  });

  const session = commerceSubmitSession({
    sessionOwner: sessionOwner.address,
    chainId: cfg.chainId,
    permitPaymaster: false,
  });
  const payload = await jobPayload(opts.jobId, job.description);
  const nonce = await getAccountNonce(erc8183PublicClient(cfg.chainId), {
    address: agentSafe,
    entryPointAddress: entryPoint07Address,
    key: sessionValidatorNonce(agentSafe),
  });

  const userOperation = await client.prepareUserOperation({
    account,
    calls: [
      {
        to: cfg.commerce,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: COMMERCE_ABI,
          functionName: "submit",
          args: [opts.jobId, payload.deliverable, payload.optParams],
        }),
      },
    ],
    nonce,
    signature: encodeUseSessionSignature({
      session,
      signature: sessionMockSignature(),
    }),
  });

  const hashToSign = getUserOperationHash({
    chainId: cfg.chainId,
    entryPointAddress: entryPoint07Address,
    entryPointVersion: "0.7",
    userOperation,
  });
  const signature = await sessionOwner.signMessage({
    message: { raw: hashToSign },
  });
  userOperation.signature = encodeUseSessionSignature({ session, signature });

  const userOpHash = await client.sendUserOperation(userOperation);
  const tx = await waitUserOpTx(userOpHash, cfg.chainId);
  void pimlico;
  return {
    jobId: opts.jobId,
    tx,
    userOpHash,
    deliverable: payload.deliverable,
  };
}

export async function submitNextFundedJob(chainId?: number) {
  const pending = await listFundedJobsForAgent({ chainId });
  if (pending.length === 0) {
    return { submitted: false as const, pending: [] as string[] };
  }
  const result = await submitStubWithSession({
    jobId: pending[0],
    chainId,
  });
  return {
    submitted: true as const,
    pending: pending.map((id) => id.toString()),
    ...result,
    jobId: result.jobId.toString(),
  };
}
