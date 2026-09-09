import { NextResponse } from "next/server";
import { apiV1 } from "@/app/lib/api";
import { merchantCardFromListing } from "@/app/lib/merchant/card";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const listing = getPublicMerchant(id);
  if (!listing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const resource = `${apiV1("/agent/resource")}?seller=${encodeURIComponent(listing.agentId)}`;
  return NextResponse.json(
    merchantCardFromListing(listing, listing.a2a || resource),
  );
}
