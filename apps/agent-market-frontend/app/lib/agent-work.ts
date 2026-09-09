import { X402_NETWORK } from "@/app/lib/x402-usdc";

export type AgentWork = {
  agent: string;
  kind: string;
  source: string;
  json: unknown;
  receipt: {
    paid: string;
    asset: "U";
    network: typeof X402_NETWORK;
    payer: string | null;
    payTo: string | null;
    tx: string | null;
  };
};
