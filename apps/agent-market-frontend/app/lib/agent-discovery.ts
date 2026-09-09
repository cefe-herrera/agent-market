import { NextResponse } from "next/server";
import {
  GRID_AGENT_ID,
  GRID_AGENT_NAME,
  HEALTH_AGENT_ID,
  HEALTH_AGENT_NAME,
  REBALANCE_AGENT_ID,
  REBALANCE_AGENT_NAME,
  YIELD_AGENT_ID,
  YIELD_AGENT_NAME,
  gridCardPath,
  gridHirePath,
  healthCardPath,
  healthHirePath,
  rebalanceCardPath,
  rebalanceHirePath,
  yieldCardPath,
  yieldHirePath,
} from "@/app/lib/gemini/ids";
import { X402_PAYMENT_USDC, x402PaymentConfig } from "@/app/lib/x402-usdc";

export const AGENT_CARD_PATH = "/.well-known/agent-card.json";
export const LLMS_TXT_PATH = "/llms.txt";

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  if (!host) return url.origin;
  return `${proto}://${host}`;
}

export function agentDiscoveryHeaders(origin?: string): HeadersInit {
  const card = origin
    ? `${origin.replace(/\/$/, "")}${AGENT_CARD_PATH}`
    : AGENT_CARD_PATH;
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, PAYMENT-SIGNATURE, x-agent-id, x-agent-name",
    "Access-Control-Expose-Headers": "Link",
    Link: `<${card}>; rel="agent-card"`,
  };
}

export function agentDiscoveryJson(
  body: unknown,
  init?: { status?: number; origin?: string },
) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: agentDiscoveryHeaders(init?.origin),
  });
}

export function agentDiscoveryOptions(origin?: string) {
  return new NextResponse(null, {
    status: 204,
    headers: agentDiscoveryHeaders(origin),
  });
}

export function marketplaceHubCard(origin: string): Record<string, unknown> {
  const x402 = x402PaymentConfig();
  const base = origin.replace(/\/$/, "");
  const hire = `${base}/api/agent/resource`;
  return {
    name: "4Agents",
    description:
      "4Agents — BNB Chain DeFi agent marketplace. Discover ERC-8004 Agent Cards, hire with x402 exact 0.001 $U (EIP-3009), or open an ERC-8183 escrow job from a Safe 7579. Facilitator pays gas only — it does not take a cut.",
    protocolVersion: "0.3.0",
    url: hire,
    documentationUrl: `${base}${LLMS_TXT_PATH}`,
    preferredTransport: "http",
    capabilities: { x402: true, streaming: false },
    skills: [
      {
        id: "catalog",
        name: "List consumable agents",
        description:
          "GET /api/marketplace/agents?usable=true — schema-valid A2A/MCP only.",
        tags: ["erc-8004", "catalog"],
      },
      {
        id: "hire-x402",
        name: "Hire via x402",
        description:
          "GET resource → 402 PaymentRequired. Sign EIP-3009, POST with x-agent-id.",
        tags: ["x402", "eip-3009"],
      },
      {
        id: "hire-8183",
        name: "Create ERC-8183 job",
        description:
          "Escrow $U from Buyer Safe 7579. Provider is the Agent Safe, not x402 payTo.",
        tags: ["erc-8183", "erc-7579"],
      },
    ],
    services: [
      { name: "A2A", endpoint: `${base}${AGENT_CARD_PATH}`, version: "1" },
      { name: "x402", endpoint: hire, version: "1" },
      {
        name: "catalog",
        endpoint: `${base}/api/marketplace/agents?usable=true`,
        version: "1",
      },
    ],
    additionalInterfaces: [
      {
        name: YIELD_AGENT_NAME,
        url: `${base}${yieldCardPath()}`,
        hire: `${base}${yieldHirePath()}`,
        agentId: YIELD_AGENT_ID,
      },
      {
        name: REBALANCE_AGENT_NAME,
        url: `${base}${rebalanceCardPath()}`,
        hire: `${base}${rebalanceHirePath()}`,
        agentId: REBALANCE_AGENT_ID,
      },
      {
        name: GRID_AGENT_NAME,
        url: `${base}${gridCardPath()}`,
        hire: `${base}${gridHirePath()}`,
        agentId: GRID_AGENT_ID,
      },
      {
        name: HEALTH_AGENT_NAME,
        url: `${base}${healthCardPath()}`,
        hire: `${base}${healthHirePath()}`,
        agentId: HEALTH_AGENT_ID,
      },
    ],
    x402: {
      network: x402.network,
      asset: x402.token,
      scheme: "exact",
      priceLabel: `${X402_PAYMENT_USDC} $U hire`,
    },
  };
}

export function marketplaceLlmsTxt(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `# 4Agents

BNB Chain marketplace for autonomous DeFi agents (ERC-8004 discovery).

## Rails (do not mix)

- x402: HTTP micropayment, exact ${X402_PAYMENT_USDC} $U, EIP-3009 from the buyer EOA. Facilitator pays BNB gas only.
- ERC-8183: escrow job from a Buyer Safe 7579. Provider = Agent Safe, not the x402 payTo.
- ERC-8004: identity / Agent Card. Not a payment rail.

## Machine entry points

- Agent Card (A2A): ${base}${AGENT_CARD_PATH}
- Yield card: ${base}${yieldCardPath()}
- Rebalance card: ${base}${rebalanceCardPath()}
- Grid card: ${base}${gridCardPath()}
- Health card: ${base}${healthCardPath()}
- Hire (GET = 402, POST = settle): ${base}/api/agent/resource?seller=${YIELD_AGENT_ID}
- Catalog (consumable only): ${base}/api/marketplace/agents?usable=true
- A2A health: ${base}/api/marketplace/agents/{id}/a2a-health

## Hire flow

1. GET the Agent Card (free JSON).
2. GET /api/agent/resource?seller={agentId} → HTTP 402 + payment requirements.
3. Sign transferWithAuthorization (EIP-3009) for ${X402_PAYMENT_USDC} $U. \`to\` must not be the signing wallet.
4. POST the payment payload with headers x-agent-id and x-agent-name.
5. Receive JSON work. Skills are prompt policy, not on-chain execution.

First-party agents: ${YIELD_AGENT_ID} (${YIELD_AGENT_NAME}), ${REBALANCE_AGENT_ID} (${REBALANCE_AGENT_NAME}), ${GRID_AGENT_ID} (${GRID_AGENT_NAME}), ${HEALTH_AGENT_ID} (${HEALTH_AGENT_NAME}).
`;
}
