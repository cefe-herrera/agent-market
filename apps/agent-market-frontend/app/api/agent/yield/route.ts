import { NextResponse } from "next/server";
import { getYieldCard } from "@/app/lib/yield/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = await getYieldCard();
  return NextResponse.json(card, {
    headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=30" },
  });
}
