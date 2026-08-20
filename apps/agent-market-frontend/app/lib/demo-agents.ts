import { X402_PAY_TO } from "@/app/lib/x402-usdc";
import type { MarketplaceAgent } from "@/app/lib/agents";

export const DEMO_AGENT_IDS = [
  "demo:fx-desk",
  "demo:token-screener",
  "demo:wallet-watcher",
  "demo:payroll",
] as const;

export type DemoAgentId = (typeof DEMO_AGENT_IDS)[number];

export type DemoSeller = {
  agentId: DemoAgentId;
  name: string;
  shortDescription: string;
  description: string;
  json: Record<string, unknown>;
};

/** Frozen service bodies — same JSON every hire. Receipt (tx/payer) is separate. */
export const DEMO_SELLERS: DemoSeller[] = [
  {
    agentId: "demo:fx-desk",
    name: "Latam FX Desk",
    shortDescription: "Cotización USD → ARS / BRL / COP. JSON fijo.",
    description:
      "Devuelve un book de FX Latam. El cuerpo no cambia entre pagos; el receipt x402 va aparte.",
    json: {
      service: "fx-desk",
      version: 1,
      base: "USD",
      quotes: [
        { pair: "USDARS", rate: "1425.50", side: "sell" },
        { pair: "USDBRL", rate: "5.42", side: "sell" },
        { pair: "USDCOP", rate: "4120.00", side: "sell" },
      ],
      validForSeconds: 60,
    },
  },
  {
    agentId: "demo:token-screener",
    name: "BNB Token Screener",
    shortDescription: "Screen de liquidez/riesgo BNB. Snapshot fijo.",
    description:
      "Lista 4 pares BNB con liquidez y risk label. No llama DexScreener.",
    json: {
      service: "token-screener",
      version: 1,
      chain: "bsc",
      tokens: [
        { pair: "WBNB/USDT", liquidityUsd: 12500000, risk: "low" },
        { pair: "CAKE/WBNB", liquidityUsd: 4200000, risk: "low" },
        { pair: "FIST/WBNB", liquidityUsd: 126405, risk: "medium" },
        { pair: "OSK/WBNB", liquidityUsd: 1552, risk: "high" },
      ],
    },
  },
  {
    agentId: "demo:wallet-watcher",
    name: "Wallet Watcher",
    shortDescription: "Reporte de riesgo de wallet. JSON fijo.",
    description:
      "Clasificación de EOA sin flags. No lee RPC; el pagador va en el receipt.",
    json: {
      service: "wallet-watcher",
      version: 1,
      chain: "eip155:97",
      summary: { risk: "low", label: "eoa", flags: [] },
    },
  },
  {
    agentId: "demo:payroll",
    name: "Latam Payroll",
    shortDescription: "Quote de nómina US→AR en $U. JSON fijo.",
    description:
      "Corredor payroll con fee y ETA. Mismo JSON en cada hire.",
    json: {
      service: "payroll-corridor",
      version: 1,
      corridor: "US-AR",
      payout: {
        asset: "U",
        amount: "100.00",
        fee: "0.80",
        etaHours: 24,
      },
      rails: ["x402", "eip-3009"],
    },
  },
];

export function isDemoAgentId(value?: string | null): value is DemoAgentId {
  return Boolean(value && DEMO_AGENT_IDS.includes(value as DemoAgentId));
}

export function getDemoSeller(agentId?: string | null): DemoSeller | null {
  if (!isDemoAgentId(agentId)) return null;
  return DEMO_SELLERS.find((seller) => seller.agentId === agentId) ?? null;
}

export function demoMarketplaceAgents(): MarketplaceAgent[] {
  return DEMO_SELLERS.map((seller) => ({
    id: seller.agentId,
    agentId: seller.agentId,
    name: seller.name,
    slug: seller.agentId.replace("demo:", ""),
    description: seller.description,
    shortDescription: seller.shortDescription,
    ownerWallet: X402_PAY_TO,
    agentWallet: X402_PAY_TO,
    agentUri: `/api/agent/resource?seller=${seller.agentId}`,
    network: "BSC Testnet",
    chainId: 97,
    isTestnet: true,
    protocols: ["x402"],
    supportedAssets: ["U"],
    verified: true,
  }));
}
