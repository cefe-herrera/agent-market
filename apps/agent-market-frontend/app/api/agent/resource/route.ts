import { getAddress, isAddress } from "viem";
import { X402_NETWORK, usdcExactRequirements } from "@/app/lib/x402-usdc";
import { getDemoSeller } from "@/app/lib/demo-agents";
import { geminiAgentName, isGeminiAgentId } from "@/app/lib/gemini/catalog";
import { geminiAgentKind } from "@/app/lib/gemini/ids";
import { getPublicMerchant } from "@/app/lib/merchant/server-store";
import { resolvePaidWork } from "@/app/lib/agent-work";
import {
  agentDiscoveryJson,
  agentDiscoveryOptions,
  requestOrigin,
} from "@/app/lib/agent-discovery";
import { fetchNestUrl, proxyToNest, readNestJson, unwrapNestPayload, nestAgentResourceUrl, nestX402SettleUrl } from "@/app/lib/nest-server";

export const maxDuration = 120;

function handleResourceLocally(id: string | null): boolean {
  if (!id) return true;
  if (isGeminiAgentId(id)) return true;
  if (getPublicMerchant(id)) return true;
  return false;
}

function paymentRequired(url: string, sellerId?: string | null) {
  const demo = getDemoSeller(sellerId);
  const merchant = sellerId ? getPublicMerchant(sellerId) : null;
  const gemini = isGeminiAgentId(sellerId);
  const name = demo?.name ?? merchant?.name ?? geminiAgentName(sellerId);
  const payTo =
    merchant?.payTo && isAddress(merchant.payTo) ? merchant.payTo : undefined;
  const accepts = [usdcExactRequirements(payTo)];
  return {
    x402Version: 2,
    error: `PAYMENT-SIGNATURE required — exact $U EIP-3009 on ${X402_NETWORK}`,
    resource: {
      url,
      description: name
        ? `${name} — x402 seller (${X402_NETWORK} $U)`
        : `Latam Market Pay — x402 seller (${X402_NETWORK} $U)`,
      mimeType: "application/json",
      serviceName: demo?.agentId ?? sellerId ?? "LatamMarketPay",
      tags: gemini
        ? geminiAgentKind(sellerId) === "health"
          ? ["x402", "gemini", "health", "venus", "coingecko", "bnb"]
          : geminiAgentKind(sellerId) === "grid"
            ? ["x402", "gemini", "grid", "aster", "coingecko", "bnb"]
            : geminiAgentKind(sellerId) === "rebalance"
              ? ["x402", "gemini", "rebalance", "coingecko", "bnb"]
              : ["x402", "gemini", "yield", "bnb"]
        : ["x402", "erc8004", "bnb"],
    },
    accepts,
    extensions: {
      erc8004: {
        info: {
          agentId: sellerId ?? null,
          name: name ?? null,
        },
        schema: { type: "object" },
      },
    },
  };
}

function paymentAddresses(body: unknown): { payer?: string; payTo?: string } {
  const typed = body as {
    paymentPayload?: {
      payload?: { authorization?: { from?: string; to?: string } };
    };
    paymentRequirements?: { payTo?: string };
  };
  return {
    payer: typed.paymentPayload?.payload?.authorization?.from,
    payTo:
      typed.paymentRequirements?.payTo ??
      typed.paymentPayload?.payload?.authorization?.to,
  };
}

export function OPTIONS(request: Request) {
  return agentDiscoveryOptions(requestOrigin(request));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const seller = url.searchParams.get("seller");
  if (!handleResourceLocally(seller)) {
    const proxied = await proxyToNest(nestAgentResourceUrl(), request, {
      search: url.search,
    });
    const { json } = await readNestJson(proxied);
    if (json && typeof json === "object") {
      const rec = json as { resource?: { url?: string } };
      if (rec.resource) rec.resource.url = url.toString();
      return agentDiscoveryJson(json, { status: proxied.status, origin });
    }
    return proxied;
  }
  return agentDiscoveryJson(
    paymentRequired(url.toString(), seller),
    { status: 402, origin },
  );
}

export async function POST(request: Request) {
  const agentId = request.headers.get("x-agent-id");
  const agentName = request.headers.get("x-agent-name");
  const origin = requestOrigin(request);

  if (!handleResourceLocally(agentId)) {
    return proxyToNest(nestAgentResourceUrl(), request);
  }

  if (!agentId) {
    return agentDiscoveryJson(
      {
        success: false,
        error: "Elegí un agente del catálogo (demo o indexador).",
      },
      { status: 400, origin },
    );
  }

  const body = await request.json();
  const expected = usdcExactRequirements();
  const sentAsset =
    (body as { paymentRequirements?: { asset?: string } }).paymentRequirements
      ?.asset ??
    (
      body as {
        paymentPayload?: { accepted?: { asset?: string } };
      }
    ).paymentPayload?.accepted?.asset;
  if (
    typeof sentAsset === "string" &&
    getAddress(sentAsset) !== expected.asset
  ) {
    return agentDiscoveryJson(
      {
        success: false,
        error: `x402 asset mismatch: client sent ${sentAsset} but ${expected.network} $U is ${expected.asset}. Reiniciá Next (npm run dev:mainnet) y volvé a firmar.`,
        details: { sentAsset, expected: expected.asset, network: expected.network },
      },
      { status: 402, origin },
    );
  }

  const nestRes = await fetchNestUrl(nestX402SettleUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const { json, text } = await readNestJson(nestRes);
  const settleJson = (unwrapNestPayload(json) ?? {}) as {
    success?: boolean;
    transaction?: string;
    payer?: string;
    network?: string;
    error?: string;
    details?: unknown;
  };

  if (!nestRes.ok || settleJson.success === false) {
    return agentDiscoveryJson(
      {
        success: false,
        error: settleJson.error ?? "x402 settle failed",
        details: settleJson.details ?? json ?? text,
      },
      { status: nestRes.status === 502 ? 502 : 402, origin },
    );
  }

  const { payer, payTo } = paymentAddresses(body);
  const work = await resolvePaidWork({
    agentId,
    agentName,
    payer: settleJson.payer ?? payer,
    payTo,
    settleTx: settleJson.transaction,
  });

  return agentDiscoveryJson(
    {
      success: true,
      transaction: settleJson.transaction,
      payer: settleJson.payer ?? payer,
      network: settleJson.network,
      agentId,
      work,
    },
    { origin },
  );
}
