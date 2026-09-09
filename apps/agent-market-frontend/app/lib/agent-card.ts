export type AgentCardSkill = {
  id: string | null;
  name: string;
  description: string | null;
  tags: string[];
};

export type AgentCardPreview = {
  sourceUrl: string;
  name: string | null;
  description: string | null;
  endpoint: string | null;
  provider: string | null;
  documentationUrl: string | null;
  x402: boolean;
  protocolVersion: string | null;
  preferredTransport: string | null;
  skills: AgentCardSkill[];
  interfaces: { transport: string | null; url: string }[];
  card: Record<string, unknown>;
};
