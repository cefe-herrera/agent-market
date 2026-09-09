import {
  geminiAgentCardPreview,
  gridAgentCard,
  healthAgentCard,
  rebalanceAgentCard,
  yieldAgentCard,
} from "@/app/lib/gemini/agent-card";
import { geminiAgentKind, isGeminiAgentId } from "@/app/lib/gemini/ids";
import {
  agentDiscoveryJson,
  agentDiscoveryOptions,
  marketplaceHubCard,
  requestOrigin,
} from "@/app/lib/agent-discovery";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";

export const dynamic = "force-dynamic";

function overlayFor(id: string) {
  const merchant = getPublicMerchant(id);
  return {
    tokenId: merchant?.tokenId ?? null,
    owner: merchant?.owner ?? null,
    payTo: merchant?.payTo ?? null,
    provider8183: merchant?.provider8183 ?? null,
  };
}

export function OPTIONS(request: Request) {
  return agentDiscoveryOptions(requestOrigin(request));
}

export function GET(request: Request) {
  const origin = requestOrigin(request);
  const seller = new URL(request.url).searchParams.get("seller");
  if (seller && isGeminiAgentId(seller)) {
    const overlay = overlayFor(seller);
    const kind = geminiAgentKind(seller);
    const card =
      kind === "health"
        ? healthAgentCard(origin, overlay)
        : kind === "grid"
          ? gridAgentCard(origin, overlay)
          : kind === "rebalance"
            ? rebalanceAgentCard(origin, overlay)
            : kind === "yield"
              ? yieldAgentCard(origin, overlay)
              : geminiAgentCardPreview(seller, origin, overlay)?.card;
    return agentDiscoveryJson(card ?? marketplaceHubCard(origin), { origin });
  }
  return agentDiscoveryJson(marketplaceHubCard(origin), { origin });
}
