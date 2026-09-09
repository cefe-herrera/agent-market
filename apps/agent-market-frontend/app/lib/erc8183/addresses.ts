import { getAddress, type Address } from "viem";
import { bsc, bscTestnet } from "wagmi/chains";
import { frontendBscChainId, frontendNetworkMode } from "@/app/lib/network";
import { x402PaymentConfig } from "@/app/lib/x402-usdc";

const COMMERCE_TESTNET =
  "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de" as Address;
const COMMERCE_MAINNET =
  "0xea4daa3100a767e86fded867729ae7446476eba6" as Address;
const ROUTER_TESTNET =
  "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25" as Address;
const ROUTER_MAINNET =
  "0x51895229e12f9876011789b04f8698af06ccd6da" as Address;
const POLICY_TESTNET =
  "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea" as Address;
const POLICY_MAINNET =
  "0x9c01845705b3078aa2e8cff7520a6376fd766de5" as Address;

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as Address;

export const EXPIRY_BUFFER_SECONDS = 10n * 60n;
export const DEFAULT_APPROVE_FLOOR_UNITS = 100n;
export const ERC8183_TOKEN_DECIMALS = 18;

export type Erc8183Config = {
  chainId: 56 | 97;
  chain: typeof bsc | typeof bscTestnet;
  isMainnet: boolean;
  commerce: Address;
  router: Address;
  policy: Address;
  /** $U expected by the x402 rail on this chain. Commerce is source of truth. */
  expectedPaymentToken: Address;
  rpc: string;
  explorerTx: string;
};

export function getErc8183(chainId?: number): Erc8183Config {
  const x402 = x402PaymentConfig();
  const id = (chainId ?? frontendBscChainId()) as 56 | 97;
  if (id !== 56 && id !== 97) {
    throw new Error(`ERC-8183 is only deployed on BSC 56/97, got ${id}`);
  }
  const isMainnet = id === 56;
  return {
    chainId: id,
    chain: isMainnet ? bsc : bscTestnet,
    isMainnet,
    commerce: getAddress(isMainnet ? COMMERCE_MAINNET : COMMERCE_TESTNET),
    router: getAddress(isMainnet ? ROUTER_MAINNET : ROUTER_TESTNET),
    policy: getAddress(isMainnet ? POLICY_MAINNET : POLICY_TESTNET),
    expectedPaymentToken: x402.token,
    rpc: x402.rpc,
    explorerTx: x402.explorerTx,
  };
}

export function erc8183NetworkLabel(): string {
  return frontendNetworkMode() === "mainnet" ? "bsc mainnet" : "bsc testnet";
}
