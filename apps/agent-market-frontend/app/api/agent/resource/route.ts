import { getAddress, isAddress } from "viem";
import { X402_NETWORK, usdcExactRequirements } from "@/app/lib/x402-usdc";
import { getDemoSeller } from "@/app/lib/demo-agents";
import { geminiAgentName, isGeminiAgentId } from "@/app/lib/gemini/catalog";
import { geminiAgentKind } from "@/app/lib/gemini/ids";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";
import { resolvePaidWork } from "@/app/lib/agent-work";
import {
  agentDiscoveryJson,
  agentDiscoveryOptions,
  requestOrigin,
} from "@/app/lib/agent-discovery";

const FACILITATOR_URL = (
  process.env.FACILITATOR_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

function paymentRequired(url: string, sellerId?: string | null) {
  const demo = getDemoSeller(sellerId);
  const merchant = sellerId ? getPublicMerchant(sellerId) : null;
  const gemini = isGeminiAgentId(sellerId);
  const name = demo?.name ?? merchant?.name ?? geminiAgentName(sellerId);
  const payTo =
    merchant?.payTo && isAddress(merchant.payTo) ? merchant.payTo : undefined;
  const accepts = [usdcExactRequirements(payTo)];
  return {
    x402Version: 2,
    error: `PAYMENT-SIGNATURE required — exact $U EIP-3009 on ${X402_NETWORK}`,
    resource: {
      url,
      description: name
        ? `${name} — x402 seller (${X402_NETWORK} $U)`
        : `Latam Market Pay — x402 seller (${X402_NETWORK} $U)`,
      mimeType: "application/json",
      serviceName: demo?.agentId ?? sellerId ?? "LatamMarketPay",
      tags: gemini
        ? geminiAgentKind(sellerId) === "health"
          ? ["x402", "gemini", "health", "venus", "coingecko", "bnb"]
          : geminiAgentKind(sellerId) === "grid"
            ? ["x402", "gemini", "grid", "aster", "coingecko", "bnb"]
            : geminiAgentKind(sellerId) === "rebalance"
              ? ["x402", "gemini", "rebalance", "coingecko", "bnb"]
              : ["x402", "gemini", "yield", "bnb"]
        : ["x402", "erc8004", "bnb"],
    },
    accepts,
    extensions: {
      erc8004: {
        info: {
          agentId: sellerId ?? null,
          name: name ?? null,
        },
        schema: { type: "object" },
      },
    },
  };
}

async function postFacilitator(path: "/verify" | "/settle", body: unknown) {
  const res = await fetch(`${FACILITATOR_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.ok, status: res.status, json, text };
}

function paymentAddresses(body: unknown): { payer?: string; payTo?: string } {
  const typed = body as {
    paymentPayload?: {
      payload?: { authorization?: { from?: string; to?: string } };
    };
    paymentRequirements?: { payTo?: string };
  };
  return {
    payer: typed.paymentPayload?.payload?.authorization?.from,
    payTo:
      typed.paymentRequirements?.payTo ??
      typed.paymentPayload?.payload?.authorization?.to,
  };
}

export function OPTIONS(request: Request) {
  return agentDiscoveryOptions(requestOrigin(request));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  return agentDiscoveryJson(
    paymentRequired(url.toString(), url.searchParams.get("seller")),
    { status: 402, origin },
  );
}

export async function POST(request: Request) {
  const agentId = request.headers.get("x-agent-id");
  const agentName = request.headers.get("x-agent-name");
  const origin = requestOrigin(request);
  if (!agentId) {
    return agentDiscoveryJson(
      {
        success: false,
        error: "Elegí un agente del catálogo (demo o indexador).",
      },
      { status: 400, origin },
    );
  }

  const body = await request.json();
  const expected = usdcExactRequirements();
  const sentAsset =
    (body as { paymentRequirements?: { asset?: string } }).paymentRequirements
      ?.asset ??
    (
      body as {
        paymentPayload?: { accepted?: { asset?: string } };
      }
    ).paymentPayload?.accepted?.asset;
  if (
    typeof sentAsset === "string" &&
    getAddress(sentAsset) !== expected.asset
  ) {
    return agentDiscoveryJson(
      {
        success: false,
        error: `x402 asset mismatch: client sent ${sentAsset} but ${expected.network} $U is ${expected.asset}. Reiniciá Next (npm run dev:mainnet) y volvé a firmar.`,
        details: { sentAsset, expected: expected.asset, network: expected.network },
      },
      { status: 402, origin },
    );
  }

  const verified = await postFacilitator("/verify", body);
  const verifyJson = verified.json as { isValid?: boolean; payer?: string };

  if (!verified.ok || verifyJson?.isValid === false) {
    return agentDiscoveryJson(
      {
        success: false,
        error: "x402 verify failed",
        details: verified.json ?? verified.text,
      },
      { status: 402, origin },
    );
  }

  const settled = await postFacilitator("/settle", body);
  const settleJson = settled.json as {
    success?: boolean;
    transaction?: string;
    payer?: string;
    network?: string;
  };

  if (!settled.ok || settleJson.success === false) {
    return agentDiscoveryJson(
      {
        success: false,
        error: "x402 settle failed",
        details: settled.json ?? settled.text,
      },
      { status: 402, origin },
    );
  }

  const { payer, payTo } = paymentAddresses(body);
  const work = await resolvePaidWork({
    agentId,
    agentName,
    payer: settleJson.payer ?? verifyJson.payer ?? payer,
    payTo,
    settleTx: settleJson.transaction,
  });

  return agentDiscoveryJson(
    {
      success: true,
      transaction: settleJson.transaction,
      payer: settleJson.payer ?? verifyJson.payer ?? payer,
      network: settleJson.network,
      agentId,
      work,
    },
    { origin },
  );
}
