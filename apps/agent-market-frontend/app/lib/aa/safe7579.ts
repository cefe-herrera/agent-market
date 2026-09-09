import {
  getAddress,
  type Account,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type Transport,
  type WalletClient,
} from "viem";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { ERC20_ABI } from "@/app/lib/erc8183/abis";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import { erc8183PublicClient } from "@/app/lib/erc8183/read";
import {
  BUYER_SAFE_SALT_NONCE,
  ENTRY_POINT_V07,
  ERC7579_LAUNCHPAD,
  RHINESTONE_ATTESTER,
  SAFE_7579_ADAPTER,
} from "./addresses";
import {
  aaChain,
  bundlerTransport,
  paymasterForClient,
  pimlicoClient,
  pimlicoFastGas,
} from "./pimlico";

export type SafeOwnerWallet = WalletClient<
  Transport,
  Chain | undefined,
  Account
>;

export type SafeOwner = Account | SafeOwnerWallet;

const SAFE_7579_OPTS = {
  version: "1.4.1" as const,
  entryPoint: {
    address: ENTRY_POINT_V07,
    version: "0.7" as const,
  },
  safe4337ModuleAddress: SAFE_7579_ADAPTER,
  erc7579LaunchpadAddress: ERC7579_LAUNCHPAD,
  attesters: [RHINESTONE_ATTESTER],
  attestersThreshold: 1,
};

function asOwner(owner: SafeOwner): SafeOwner {
  if ("account" in owner && owner.account) return owner;
  if ("address" in owner && owner.address) return owner;
  throw new Error("Safe owner needs an account (conectá MetaMask)");
}

export async function toSafe7579(opts: {
  owner: SafeOwner;
  chainId?: number;
  saltNonce?: bigint;
  address?: Address;
}) {
  const owner = asOwner(opts.owner);
  const cfg = getErc8183(opts.chainId);
  return toSafeSmartAccount({
    client: erc8183PublicClient(cfg.chainId),
    owners: [owner],
    saltNonce: opts.saltNonce ?? BUYER_SAFE_SALT_NONCE,
    address: opts.address,
    ...SAFE_7579_OPTS,
  });
}

export async function predictSafe7579Address(opts: {
  ownerAddress: Address;
  chainId?: number;
  saltNonce?: bigint;
}): Promise<{ address: Address; deployed: boolean }> {
  const account = await toSafe7579({
    owner: { address: getAddress(opts.ownerAddress), type: "json-rpc" },
    chainId: opts.chainId,
    saltNonce: opts.saltNonce ?? BUYER_SAFE_SALT_NONCE,
  });
  return {
    address: getAddress(account.address),
    deployed: await account.isDeployed(),
  };
}

export async function createSafe7579Client(opts: {
  owner: SafeOwner;
  chainId?: number;
  saltNonce?: bigint;
  address?: Address;
}) {
  const cfg = getErc8183(opts.chainId);
  const account = await toSafe7579({
    owner: opts.owner,
    chainId: cfg.chainId,
    saltNonce: opts.saltNonce,
    address: opts.address,
  });
  const pimlico = pimlicoClient(cfg.chainId);
  const client = createSmartAccountClient({
    account,
    chain: aaChain(cfg.chainId),
    bundlerTransport: bundlerTransport(cfg.chainId),
    paymaster: paymasterForClient(cfg.chainId),
    userOperation: {
      estimateFeesPerGas: async () => pimlicoFastGas(cfg.chainId),
    },
  }).extend(erc7579Actions());

  return { account, client, pimlico, address: getAddress(account.address) };
}

export async function waitUserOp(
  userOpHash: Hash,
  chainId?: number,
) {
  const receipt = await pimlicoClient(chainId).waitForUserOperationReceipt({
    hash: userOpHash,
  });
  const tx = receipt.receipt.transactionHash;
  if (receipt.success === false) {
    throw new Error(
      `UserOp reverted: ${tx}${receipt.reason ? ` (${receipt.reason})` : ""}`,
    );
  }
  return { tx, receipt, logs: receipt.receipt.logs };
}

export async function waitUserOpTx(
  userOpHash: Hash,
  chainId?: number,
): Promise<Hex> {
  return (await waitUserOp(userOpHash, chainId)).tx;
}

export async function sendNativeToSafe(
  wallet: SafeOwnerWallet,
  opts: { to: Address; value: bigint; chainId?: number },
): Promise<Hex> {
  const cfg = getErc8183(opts.chainId);
  const account = wallet.account?.address;
  if (!account) throw new Error("wallet account is required");
  return wallet.sendTransaction({
    account,
    chain: wallet.chain ?? cfg.chain,
    to: opts.to,
    value: opts.value,
  });
}

export async function sendTokenToSafe(
  wallet: SafeOwnerWallet,
  opts: { to: Address; token: Address; amount: bigint; chainId?: number },
): Promise<Hex> {
  const cfg = getErc8183(opts.chainId);
  const account = wallet.account?.address;
  if (!account) throw new Error("wallet account is required");
  return wallet.writeContract({
    account,
    chain: wallet.chain ?? cfg.chain,
    address: opts.token,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [opts.to, opts.amount],
  });
}
