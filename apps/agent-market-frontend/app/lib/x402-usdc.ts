import { bsc, bscTestnet } from "wagmi/chains";
import { formatUnits, getAddress, parseUnits, type Address } from "viem";
import { frontendNetworkMode } from "@/app/lib/network";

export const X402_SCHEME = "exact" as const;

const FALLBACK_U_TESTNET =
  "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565" as Address;
const FALLBACK_U_MAINNET =
  "0xcE24439F2D9C6a2289F741120FE202248B666666" as Address;
const FALLBACK_CIRCLE_USDC =
  "0x9b1C95CB1B3c028c0D90D1F4673E87dd058f0149" as Address;
const FALLBACK_PAY_TO =
  "0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b" as Address;

const DEFAULT_TESTNET_RPC = "https://bsc-testnet-rpc.publicnode.com";
const DEFAULT_MAINNET_RPC = "https://bsc-dataseed.binance.org";

/** Resolve token/chain at call time so Fast Refresh cannot mix testnet $U with eip155:56. */
export function x402PaymentConfig() {
  const isMainnet = frontendNetworkMode() === "mainnet";
  const token = getAddress(
    isMainnet
      ? process.env.NEXT_PUBLIC_U_TOKEN_MAINNET || FALLBACK_U_MAINNET
      : process.env.NEXT_PUBLIC_U_TOKEN_TESTNET || FALLBACK_U_TESTNET,
  );
  const chain = isMainnet ? bsc : bscTestnet;
  return {
    isMainnet,
    chain,
    chainId: chain.id,
    network: (isMainnet ? "eip155:56" : "eip155:97") as "eip155:56" | "eip155:97",
    token,
    rpc: isMainnet
      ? process.env.NEXT_PUBLIC_BSC_MAINNET_RPC || DEFAULT_MAINNET_RPC
      : process.env.NEXT_PUBLIC_BSC_TESTNET_RPC || DEFAULT_TESTNET_RPC,
    explorerTx: isMainnet
      ? "https://bscscan.com/tx"
      : "https://testnet.bscscan.com/tx",
  };
}

const boot = x402PaymentConfig();

export const X402_IS_MAINNET = boot.isMainnet;
export const X402_CHAIN = boot.chain;
export const X402_CHAIN_ID = boot.chainId;
export const X402_NETWORK = boot.network;
export const X402_RPC = boot.rpc;
export const X402_EXPLORER_TX = boot.explorerTx;
export const U_TOKEN_ADDRESS = boot.token;

export const BSC_TESTNET = bscTestnet;
export const BSC_TESTNET_CHAIN_ID = bscTestnet.id;
export const BSC_PAYMENT_CHAIN_ID = X402_CHAIN_ID;
/** @deprecated use X402_RPC */
export const BSC_TESTNET_RPC = X402_RPC;

export const U_EIP712 = {
  name: "United Stables",
  version: "1",
} as const;

export const U_DECIMALS = 18;
export const X402_PAYMENT_AMOUNT = "0.001";
export const X402_PAYMENT_USDC = X402_PAYMENT_AMOUNT;
export const X402_MAX_TIMEOUT_SECONDS = 3600;

export const CIRCLE_USDC_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS || FALLBACK_CIRCLE_USDC,
);
export const X402_PAY_TO = getAddress(
  process.env.NEXT_PUBLIC_X402_PAY_TO || FALLBACK_PAY_TO,
);

/** @deprecated use U_TOKEN_ADDRESS */
export const USDC_ADDRESS = U_TOKEN_ADDRESS;
export const USDC_EIP712 = U_EIP712;
export const USDC_DECIMALS = U_DECIMALS;
export const USDC_IS_CONFIGURED = true;

export const X402_AMOUNT_ATOMIC = parseUnits(
  X402_PAYMENT_AMOUNT,
  U_DECIMALS,
).toString();

export function formatUsdc(atomic: bigint): string {
  return formatUnits(atomic, U_DECIMALS);
}

export function usdcExactRequirements() {
  const cfg = x402PaymentConfig();
  return {
    scheme: X402_SCHEME,
    network: cfg.network,
    amount: X402_AMOUNT_ATOMIC,
    asset: cfg.token,
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: X402_MAX_TIMEOUT_SECONDS,
    extra: {
      name: U_EIP712.name,
      version: U_EIP712.version,
    },
  };
}
