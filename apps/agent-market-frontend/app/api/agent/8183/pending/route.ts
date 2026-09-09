import { NextResponse } from "next/server";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import { listFundedJobsForAgent } from "@/app/lib/aa/submit-worker";

export async function GET() {
  try {
    const cfg = getErc8183();
    const pending = await listFundedJobsForAgent({ chainId: cfg.chainId });
    return NextResponse.json({
      chainId: cfg.chainId,
      pending: pending.map((id) => id.toString()),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
