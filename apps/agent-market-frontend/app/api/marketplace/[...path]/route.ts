import { NextRequest } from "next/server";
import type { MarketplaceAgent } from "@/app/lib/agents";
import { marketplaceListFilters } from "@/app/lib/indexer-bnb";
import { probeAgentA2a } from "@/app/lib/a2a-probe";
import {
  getPublicMerchant,
  listPublicMerchants,
} from "@/app/lib/merchant/server-store";
import { merchantCardFromListing } from "@/app/lib/merchant/card";
import { geminiAgentCardPreview } from "@/app/lib/gemini/agent-card";
import { isGeminiAgentId, isYieldAgentId } from "@/app/lib/gemini/ids";
import { geminiMarketplaceAgents } from "@/app/lib/gemini/catalog";
import {
  merchantToCatalogAgent,
  mergeCatalogWithMerchants,
} from "@/app/lib/merchant/to-catalog";
import { proxyToNest, readNestJson, nestMarketplaceUrl, joinUrl } from "@/app/lib/nest-server";

export const maxDuration = 120;

type RouteCtx = { params: Promise<{ path: string[] }> };

function requestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

function isLocalCatalogId(id: string): boolean {
  return isGeminiAgentId(id) || Boolean(getPublicMerchant(id));
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  const origin = requestOrigin(req);
  const search = req.nextUrl.search;

  if (path[0] === "agents" && path[1] && isLocalCatalogId(path[1])) {
    return handleLocal(path, origin);
  }

  if (path.length === 1 && path[0] === "agents") {
    return listWithMerchants(req, search);
  }

  return proxyToNest(
    joinUrl(nestMarketplaceUrl(), ...path.map(encodeURIComponent)),
    req,
    { search },
  );
}

async function listWithMerchants(req: NextRequest, search: string) {
  const proxied = await proxyToNest(joinUrl(nestMarketplaceUrl(), "agents"), req, { search });
  if (!proxied.ok) return proxied;

  const { json } = await readNestJson(proxied);
  if (!json || typeof json !== "object") {
    return Response.json(json, { status: proxied.status });
  }

  const result = json as { data?: unknown[] };
  const data: MarketplaceAgent[] = Array.isArray(json)
    ? json
    : Array.isArray(result.data)
      ? (result.data as MarketplaceAgent[])
      : [];
  const filters = marketplaceListFilters(search);
  const merged = mergeCatalogWithMerchants(
    data,
    listPublicMerchants().filter((item) => item.chainId === filters.chainId),
  );

  if (Array.isArray(json)) {
    return Response.json(merged);
  }

  return Response.json({
    ...(json as Record<string, unknown>),
    data: merged,
    total: merged.length,
  });
}

async function handleLocal(path: string[], origin: string): Promise<Response> {
  const id = path[1];

  if (path[2] === "a2a-health") {
    return Response.json(await probeAgentA2a(id, origin));
  }

  if (path[2] === "card") {
    if (isGeminiAgentId(id)) {
      const merchant = getPublicMerchant(id);
      const preview = geminiAgentCardPreview(id, origin, {
        tokenId: isYieldAgentId(id)
          ? process.env.NEXT_PUBLIC_YIELD_8004_TOKEN_ID?.trim() ||
            merchant?.tokenId
          : merchant?.tokenId,
        owner: merchant?.owner,
        payTo: merchant?.payTo,
        provider8183: merchant?.provider8183,
      });
      if (preview) return Response.json(preview);
    }
    const merchant = getPublicMerchant(id);
    if (merchant) {
      const card = merchantCardFromListing(merchant, merchant.a2a);
      return Response.json({
        sourceUrl: merchant.cardUrl ?? `merchant:${merchant.agentId}`,
        name: merchant.name,
        description: merchant.description,
        endpoint: merchant.a2a,
        provider: merchant.owner,
        documentationUrl: null,
        x402: true,
        erc8183Provider: merchant.provider8183,
        protocolVersion: "0.3.0",
        preferredTransport: null,
        skills: [
          {
            id: "hire",
            name: "Marketplace hire",
            description: merchant.description,
            tags: ["x402", "erc-8183"],
          },
        ],
        interfaces: [],
        card,
      });
    }
    return Response.json(
      { error: "No Agent Card JSON found before payment" },
      { status: 404 },
    );
  }

  if (!path[2]) {
    const merchant = getPublicMerchant(id);
    if (merchant) return Response.json(merchantToCatalogAgent(merchant));
    const gemini = geminiMarketplaceAgents().find(
      (agent) => agent.agentId === id,
    );
    if (gemini) return Response.json(gemini);
    return Response.json({ error: "Agent not found" }, { status: 404 });
  }

  return Response.json(
    { error: `No local marketplace handler for ${path.join("/")}` },
    { status: 404 },
  );
}
