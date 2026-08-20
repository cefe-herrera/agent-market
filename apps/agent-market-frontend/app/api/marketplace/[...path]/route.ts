import { NextRequest } from "next/server";
import { apiUrl } from "@/app/lib/api";

type RouteCtx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, path: string[]) {
  const search = req.nextUrl.search;
  let target: string;
  try {
    target = apiUrl(`/${path.join("/")}${search}`);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "API origin misconfigured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(target, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: `Cannot reach Nest API at ${target}`,
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
