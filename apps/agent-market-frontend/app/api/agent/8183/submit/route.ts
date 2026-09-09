import { NextResponse } from "next/server";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import {
  submitNextFundedJob,
  submitStubWithSession,
} from "@/app/lib/aa/submit-worker";

function assertWorker(req: Request) {
  const expected = process.env.AGENT_WORKER_SECRET?.trim();
  if (!expected) return;
  if (req.headers.get("x-worker-secret") !== expected) {
    throw new Error("unauthorized worker");
  }
}

export async function POST(req: Request) {
  try {
    assertWorker(req);
    const cfg = getErc8183();
    const body = (await req.json().catch(() => ({}))) as { jobId?: string };
    if (body.jobId) {
      const result = await submitStubWithSession({
        jobId: BigInt(body.jobId),
        chainId: cfg.chainId,
      });
      return NextResponse.json({
        submitted: true,
        jobId: result.jobId.toString(),
        tx: result.tx,
        userOpHash: result.userOpHash,
        deliverable: result.deliverable,
      });
    }
    const result = await submitNextFundedJob(cfg.chainId);
    return NextResponse.json({
      ...result,
      tx: "tx" in result ? result.tx : undefined,
      userOpHash: "userOpHash" in result ? result.userOpHash : undefined,
      deliverable: "deliverable" in result ? result.deliverable : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message === "unauthorized worker" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
