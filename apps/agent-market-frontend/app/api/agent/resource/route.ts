import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { X402_NETWORK, usdcExactRequirements } from "@/app/lib/x402-usdc";
import { getDemoSeller } from "@/app/lib/demo-agents";
import { resolvePaidWork } from "@/app/lib/agent-work";

const FACILITATOR_URL = (
  process.env.FACILITATOR_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

function paymentRequired(url: string, sellerId?: string | null) {
  const demo = getDemoSeller(sellerId);
  const accepts = [usdcExactRequirements()];
  return {
    x402Version: 2,
    error: `PAYMENT-SIGNATURE required — exact $U EIP-3009 on ${X402_NETWORK}`,
    resource: {
      url,
      description: demo
        ? `${demo.name} — x402 seller (${X402_NETWORK} $U)`
        : `Latam Market Pay — x402 seller (${X402_NETWORK} $U)`,
      mimeType: "application/json",
      serviceName: demo?.agentId ?? sellerId ?? "LatamMarketPay",
      tags: ["x402", "erc8004", "bnb"],
    },
    accepts,
    extensions: {
      erc8004: {
        info: {
          agentId: sellerId ?? null,
          name: demo?.name ?? null,
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json(
    paymentRequired(url.toString(), url.searchParams.get("seller")),
    { status: 402 },
  );
}

export async function POST(request: Request) {
  const agentId = request.headers.get("x-agent-id");
  const agentName = request.headers.get("x-agent-name");
  if (!agentId) {
    return NextResponse.json(
      {
        success: false,
        error: "Elegí un agente del catálogo (demo o indexador).",
      },
      { status: 400 },
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
    return NextResponse.json(
      {
        success: false,
        error: `x402 asset mismatch: client sent ${sentAsset} but ${expected.network} $U is ${expected.asset}. Reiniciá Next (npm run dev:mainnet) y volvé a firmar.`,
        details: { sentAsset, expected: expected.asset, network: expected.network },
      },
      { status: 402 },
    );
  }

  const verified = await postFacilitator("/verify", body);
  const verifyJson = verified.json as { isValid?: boolean; payer?: string };

  if (!verified.ok || verifyJson?.isValid === false) {
    return NextResponse.json(
      {
        success: false,
        error: "x402 verify failed",
        details: verified.json ?? verified.text,
      },
      { status: 402 },
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
    return NextResponse.json(
      {
        success: false,
        error: "x402 settle failed",
        details: settled.json ?? settled.text,
      },
      { status: 402 },
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

  return NextResponse.json({
    success: true,
    transaction: settleJson.transaction,
    payer: settleJson.payer ?? verifyJson.payer ?? payer,
    network: settleJson.network,
    agentId,
    work,
  });
}
