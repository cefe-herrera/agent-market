import { NextResponse } from "next/server";
import { merchantCardFromListing } from "@/app/lib/merchant/card";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";
import { hireFeedbackUri } from "@/app/lib/nest-routes";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const listing = getPublicMerchant(id);
  if (!listing) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const origin = new URL(_req.url).origin;
  const resource = hireFeedbackUri(origin, listing.agentId);
  return NextResponse.json(
    merchantCardFromListing(listing, listing.a2a || resource),
  );
}
