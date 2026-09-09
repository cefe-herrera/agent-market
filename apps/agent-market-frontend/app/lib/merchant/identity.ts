import {
  decodeEventLog,
  getAddress,
  toBytes,
  toHex,
  type Address,
  type Hash,
  type Hex,
  type TransactionReceipt,
  type WalletClient,
} from "viem";
import {
  agentCaip,
  identityAbi,
  identityRegistry,
  isSameAddress,
} from "@/app/lib/erc8004";
import { erc8183PublicClient } from "@/app/lib/erc8183/read";
import { getErc8183 } from "@/app/lib/erc8183/addresses";

export type IdentityWallet = WalletClient;

function metaBytes(value: string): Hex {
  return toHex(toBytes(value));
}

export function parseRegisteredAgentId(
  logs: TransactionReceipt["logs"],
  registry: Address,
): bigint {
  const target = registry.toLowerCase();
  for (const log of logs) {
    if (log.address.toLowerCase() !== target) continue;
    try {
      const decoded = decodeEventLog({
        abi: identityAbi,
        eventName: "Registered",
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName !== "Registered") continue;
      if (decoded.args.agentId === undefined) continue;
      return decoded.args.agentId;
    } catch {
      /* not Registered */
    }
  }
  throw new Error("Registered event not found — cannot guess agentId");
}

export async function readAgentOwner(
  tokenId: bigint,
  chainId?: number,
): Promise<Address> {
  const registry = identityRegistry(chainId);
  const owner = await erc8183PublicClient(chainId).readContract({
    address: registry,
    abi: identityAbi,
    functionName: "ownerOf",
    args: [tokenId],
  });
  return getAddress(owner);
}

export async function registerIdentity(
  wallet: IdentityWallet,
  opts: {
    agentURI: string;
    account: Address;
    chainId?: number;
  },
): Promise<{ tokenId: bigint; agentId: string; hash: Hash }> {
  const cfg = getErc8183(opts.chainId);
  const registry = identityRegistry(cfg.chainId);
  const hash = await wallet.writeContract({
    account: opts.account,
    chain: wallet.chain ?? cfg.chain,
    address: registry,
    abi: identityAbi,
    functionName: "register",
    args: [
      opts.agentURI,
      [
        { metadataKey: "built_with", metadataValue: metaBytes("agent-market") },
        { metadataKey: "x402", metadataValue: metaBytes("true") },
        { metadataKey: "erc8183", metadataValue: metaBytes("true") },
      ],
    ],
  });
  const receipt = await erc8183PublicClient(cfg.chainId).waitForTransactionReceipt({
    hash,
  });
  if (receipt.status !== "success") {
    throw new Error(`register reverted: ${hash}`);
  }
  const tokenId = parseRegisteredAgentId(receipt.logs, registry);
  return {
    tokenId,
    agentId: agentCaip(Number(tokenId), cfg.chainId),
    hash,
  };
}

export async function setIdentityUri(
  wallet: IdentityWallet,
  opts: {
    tokenId: bigint;
    agentURI: string;
    account: Address;
    chainId?: number;
  },
): Promise<Hash> {
  const cfg = getErc8183(opts.chainId);
  const registry = identityRegistry(cfg.chainId);
  const owner = await readAgentOwner(opts.tokenId, cfg.chainId);
  if (!isSameAddress(owner, opts.account)) {
    throw new Error(`token #${opts.tokenId} owner is ${owner}, not ${opts.account}`);
  }
  const hash = await wallet.writeContract({
    account: opts.account,
    chain: wallet.chain ?? cfg.chain,
    address: registry,
    abi: identityAbi,
    functionName: "setAgentURI",
    args: [opts.tokenId, opts.agentURI],
  });
  const receipt = await erc8183PublicClient(cfg.chainId).waitForTransactionReceipt({
    hash,
  });
  if (receipt.status !== "success") {
    throw new Error(`setAgentURI reverted: ${hash}`);
  }
  return hash;
}
