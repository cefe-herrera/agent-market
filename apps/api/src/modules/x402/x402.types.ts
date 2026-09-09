export type FacilitatorErrorBody = {
  isValid?: boolean;
  invalidReason?: string;
  invalidReasonDetails?: string;
  errorReason?: string;
  errorMessage?: string;
  error?: string;
};

export type FacilitatorResponse = {
  ok: boolean;
  status: number;
  json: unknown;
  text: string;
};

export type DemoSeller = {
  agentId: string;
  name: string;
  shortDescription: string;
  description: string;
  json: Record<string, unknown>;
};

export type AgentWork = {
  agent: string;
  kind: string;
  source: string;
  json: unknown;
  receipt: {
    paid: string;
    asset: 'U';
    network: 'eip155:56' | 'eip155:97';
    payer: string | null;
    payTo: string | null;
    tx: string | null;
  };
};
