import { NextResponse } from "next/server";
import { usdcExactRequirements } from "@/app/lib/x402-usdc";
import { AGENT_ID, agentCaip } from "@/app/lib/erc8004";

const FACILITATOR_URL = (
  process.env.FACILITATOR_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

function paymentRequired(url: string) {
  const accepts = [usdcExactRequirements()];
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE required — exact $U EIP-3009 on eip155:97",
    resource: {
      url,
      description: "Latam Market Pay — x402 seller (BSC testnet $U)",
      mimeType: "application/json",
      serviceName: "LatamMarketPay",
      tags: ["x402", "erc8004", "bnb"],
    },
    accepts,
    extensions: {
      erc8004: {
        info: {
          agentId: AGENT_ID || null,
          caip: AGENT_ID ? agentCaip(AGENT_ID) : null,
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json(paymentRequired(url.toString()), { status: 402 });
}

export async function POST(request: Request) {
  const body = await request.json();
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

  return NextResponse.json({
    success: true,
    transaction: settleJson.transaction,
    payer: settleJson.payer ?? verifyJson.payer,
    network: settleJson.network,
    agentId: AGENT_ID || null,
    work: {
      message: "Latam Market Pay executed",
      quote: "BNB testnet x402 exact · $U · EIP-3009",
      at: new Date().toISOString(),
    },
  });
}
