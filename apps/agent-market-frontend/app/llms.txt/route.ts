import {
  agentDiscoveryHeaders,
  marketplaceLlmsTxt,
  requestOrigin,
} from "@/app/lib/agent-discovery";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origin = requestOrigin(request);
  return new Response(marketplaceLlmsTxt(origin), {
    status: 200,
    headers: {
      ...agentDiscoveryHeaders(origin),
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
