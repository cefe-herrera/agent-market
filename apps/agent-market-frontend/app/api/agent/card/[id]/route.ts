import { NextRequest } from "next/server";
import {
  geminiAgentCardPreview,
  gridAgentCard,
  healthAgentCard,
  rebalanceAgentCard,
  yieldAgentCard,
} from "@/app/lib/gemini/agent-card";
import {
  geminiAgentKind,
  isGeminiAgentId,
  isYieldAgentId,
} from "@/app/lib/gemini/ids";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";
import {
  agentDiscoveryJson,
  agentDiscoveryOptions,
  requestOrigin,
} from "@/app/lib/agent-discovery";

export const dynamic = "force-dynamic";

function overlayFor(id: string) {
  const merchant = getPublicMerchant(id);
  const tokenId = isYieldAgentId(id)
    ? process.env.NEXT_PUBLIC_YIELD_8004_TOKEN_ID?.trim() || merchant?.tokenId || null
    : merchant?.tokenId || null;
  return {
    tokenId,
    owner: merchant?.owner ?? null,
    payTo: merchant?.payTo ?? null,
    provider8183: merchant?.provider8183 ?? null,
  };
}

export function OPTIONS(request: NextRequest) {
  return agentDiscoveryOptions(requestOrigin(request));
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const origin = requestOrigin(request);
  if (!isGeminiAgentId(id)) {
    return agentDiscoveryJson(
      { error: "Unknown Gemini agent — no mintable Agent Card yet." },
      { status: 404, origin },
    );
  }
  const overlay = overlayFor(id);
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  if (preview) {
    return agentDiscoveryJson(geminiAgentCardPreview(id, origin, overlay), {
      origin,
    });
  }
  const kind = geminiAgentKind(id);
  if (kind === "health") {
    return agentDiscoveryJson(healthAgentCard(origin, overlay), { origin });
  }
  if (kind === "grid") {
    return agentDiscoveryJson(gridAgentCard(origin, overlay), { origin });
  }
  if (kind === "rebalance") {
    return agentDiscoveryJson(rebalanceAgentCard(origin, overlay), { origin });
  }
  return agentDiscoveryJson(yieldAgentCard(origin, overlay), { origin });
}
