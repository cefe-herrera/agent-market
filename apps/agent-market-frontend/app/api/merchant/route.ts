import { NextResponse } from "next/server";
import {
  getPublicMerchant,
  listPublicMerchants,
  upsertPublicMerchant,
} from "@/app/lib/merchant/server-store";
import type { PublicMerchant } from "@/app/lib/merchant/types";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const hit = getPublicMerchant(id);
    if (!hit) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(hit);
  }
  return NextResponse.json({ data: listPublicMerchants() });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PublicMerchant;
    if (!body?.agentId || !body?.name || !body?.provider8183) {
      return NextResponse.json({ error: "invalid listing" }, { status: 400 });
    }
    const saved = upsertPublicMerchant(body);
    return NextResponse.json(saved);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}
