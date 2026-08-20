import { bscTestnet } from "wagmi/chains";
import { formatUnits, getAddress, parseUnits, type Address } from "viem";

export const X402_NETWORK = "eip155:97" as const;
export const X402_SCHEME = "exact" as const;

export const BSC_TESTNET = bscTestnet;
export const BSC_TESTNET_CHAIN_ID = bscTestnet.id;

export const BSC_TESTNET_RPC =
  process.env.NEXT_PUBLIC_BSC_RPC ??
  "https://bsc-testnet-rpc.publicnode.com";

/** Live $U (United Stables) on BSC testnet — Agent Studio x402 rail. */
export const U_EIP712 = {
  name: "United Stables",
  version: "1",
} as const;

export const U_DECIMALS = 18;
export const X402_PAYMENT_AMOUNT = "0.001";
export const X402_PAYMENT_USDC = X402_PAYMENT_AMOUNT;
export const X402_MAX_TIMEOUT_SECONDS = 3600;

const FALLBACK_U =
  "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565" as Address;
const FALLBACK_CIRCLE_USDC =
  "0x9b1C95CB1B3c028c0D90D1F4673E87dd058f0149" as Address;
const FALLBACK_PAY_TO =
  "0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b" as Address;

export const U_TOKEN_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_U_TOKEN_ADDRESS || FALLBACK_U,
);
/** Foundry Circle mock. Not the x402 `asset`. */
export const CIRCLE_USDC_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS || FALLBACK_CIRCLE_USDC,
);
export const X402_PAY_TO = getAddress(
  process.env.NEXT_PUBLIC_X402_PAY_TO || FALLBACK_PAY_TO,
);

/** @deprecated use U_TOKEN_ADDRESS — kept so existing UI imports compile */
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
  return {
    scheme: X402_SCHEME,
    network: X402_NETWORK,
    amount: X402_AMOUNT_ATOMIC,
    asset: U_TOKEN_ADDRESS,
    payTo: X402_PAY_TO,
    maxTimeoutSeconds: X402_MAX_TIMEOUT_SECONDS,
    extra: {
      name: U_EIP712.name,
      version: U_EIP712.version,
    },
  };
}
