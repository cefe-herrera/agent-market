import { NextResponse } from "next/server";

const FACILITATOR_URL = (
  process.env.FACILITATOR_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

type FacilitatorErrorBody = {
  isValid?: boolean;
  invalidReason?: string;
  invalidReasonDetails?: string;
  errorReason?: string;
  errorMessage?: string;
  error?: string;
};

function facilitatorErrorMessage(
  path: string,
  status: number,
  json: unknown,
  text: string,
) {
  const body = (json ?? {}) as FacilitatorErrorBody;
  return [
    `${path} ${status}`,
    body.invalidReason,
    body.invalidReasonDetails,
    body.errorReason,
    body.errorMessage,
    body.error,
    !json ? text : null,
  ]
    .filter(Boolean)
    .join(" — ");
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
  if (!res.ok) {
    console.error(`[x402] ${path} failed`, {
      status: res.status,
      text,
      json,
      request: body,
    });
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function POST(request: Request) {
  const body = await request.json();

  const verified = await postFacilitator("/verify", body);
  if (!verified.ok) {
    return NextResponse.json(
      {
        success: false,
        error: facilitatorErrorMessage(
          "/verify",
          verified.status,
          verified.json,
          verified.text,
        ),
        details: verified.json ?? verified.text,
      },
      { status: 400 },
    );
  }

  const verifyJson = verified.json as { isValid?: boolean; payer?: string };
  if (verifyJson.isValid === false) {
    return NextResponse.json(
      {
        success: false,
        error: facilitatorErrorMessage(
          "/verify",
          verified.status,
          verified.json,
          verified.text,
        ),
        details: verified.json,
      },
      { status: 400 },
    );
  }

  const settled = await postFacilitator("/settle", body);
  if (!settled.ok) {
    return NextResponse.json(
      {
        success: false,
        error: facilitatorErrorMessage(
          "/settle",
          settled.status,
          settled.json,
          settled.text,
        ),
        details: settled.json ?? settled.text,
      },
      { status: 400 },
    );
  }

  const settleJson = settled.json as {
    success?: boolean;
    transaction?: string;
    payer?: string;
    network?: string;
  };

  return NextResponse.json({
    success: settleJson.success !== false,
    transaction: settleJson.transaction,
    payer: settleJson.payer ?? verifyJson.payer,
    network: settleJson.network,
  });
}
