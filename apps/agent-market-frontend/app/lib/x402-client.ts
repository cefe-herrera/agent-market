import { getAddress, toHex, type Address, type Hex, type WalletClient } from "viem";
import {
  BSC_TESTNET_CHAIN_ID,
  USDC_ADDRESS,
  USDC_EIP712,
  X402_AMOUNT_ATOMIC,
  X402_MAX_TIMEOUT_SECONDS,
  usdcExactRequirements,
} from "@/app/lib/x402-usdc";

const eip3009Types = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export function buildPaymentRequirements() {
  return usdcExactRequirements();
}

export async function signExactUsdcPayment(
  walletClient: WalletClient,
  from: Address,
  payTo: Address,
) {
  const to = getAddress(payTo);
  const payer = getAddress(from);
  if (to.toLowerCase() === payer.toLowerCase()) {
    throw new Error(
      "to no puede ser la wallet que firma. Poné la cuenta que recibe el $U.",
    );
  }

  const requirements = {
    ...buildPaymentRequirements(),
    payTo: to,
  };
  const now = BigInt(Math.floor(Date.now() / 1000));
  const validAfter = now - 600n;
  const validBefore = now + BigInt(X402_MAX_TIMEOUT_SECONDS);
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const value = BigInt(X402_AMOUNT_ATOMIC);

  const signature = await walletClient.signTypedData({
    account: payer,
    domain: {
      name: USDC_EIP712.name,
      version: USDC_EIP712.version,
      chainId: BSC_TESTNET_CHAIN_ID,
      verifyingContract: USDC_ADDRESS,
    },
    types: eip3009Types,
    primaryType: "TransferWithAuthorization",
    message: {
      from: payer,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
    },
  });

  const paymentPayload = {
    x402Version: 2,
    accepted: requirements,
    payload: {
      signature: signature as Hex,
      authorization: {
        from: payer,
        to,
        value: X402_AMOUNT_ATOMIC,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
    resource: {
      url: typeof window !== "undefined" ? `${window.location.origin}/` : "/",
      description: "BNB Agent Market x402 $U exact payment",
      mimeType: "application/json",
    },
  };

  return {
    x402Version: 2,
    paymentPayload,
    paymentRequirements: requirements,
  };
}

export type X402SettleResult = {
  success: boolean;
  transaction?: string;
  payer?: string;
  network?: string;
  error?: string;
  details?: unknown;
};

export async function settleExactUsdcPayment(
  body: Awaited<ReturnType<typeof signExactUsdcPayment>>,
): Promise<X402SettleResult> {
  const res = await fetch("/api/x402/settle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as X402SettleResult;
  if (!res.ok) {
    return {
      success: false,
      error: json.error ?? `settle failed (${res.status})`,
      details: json.details ?? json,
    };
  }
  return json;
}
