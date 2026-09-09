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
  erc8183Provider: string | null;
  protocolVersion: string | null;
  preferredTransport: string | null;
  skills: AgentCardSkill[];
  interfaces: { transport: string | null; url: string }[];
  card: Record<string, unknown>;
};

export async function fetchAgentCardPreview(
  id: string,
): Promise<AgentCardPreview | null> {
  const agent = await resolveIndexerAgent(id);
  if (!agent) return null;
  const urls = cardCandidateUrls(agent);
  for (const url of urls) {
    const card = await getJson(url);
    if (!card) continue;
    if (!looksLikeAgentCard(card)) continue;
    return toPreview(url, card);
  }
  return null;
}

function cardCandidateUrls(agent: MarketplaceAgent): string[] {
  const urls: string[] = [];
  const push = (value: string | null | undefined) => {
    if (!value || !/^https?:\/\//i.test(value)) return;
    if (value.includes("{")) return;
    if (!urls.includes(value)) urls.push(value);
  };

  const a2a = agent.endpoints?.a2a ?? agent.a2a?.endpoint ?? null;
  const mcp = agent.endpoints?.mcp ?? null;
  push(a2a);
  push(agent.agentUri);
  push(mcp);

  for (const base of [a2a, agent.agentUri, mcp, agent.endpoints?.agentUrl]) {
    if (!base) continue;
    try {
      push(new URL("/.well-known/agent-card.json", new URL(base).origin).href);
    } catch {
      /* ignore */
    }
  }
  return urls;
}

function looksLikeAgentCard(raw: Record<string, unknown>): boolean {
  if (typeof raw.name === "string" && typeof raw.url === "string") return true;
  if (Array.isArray(raw.skills) && raw.skills.length > 0) return true;
  if (raw.capabilities && typeof raw.capabilities === "object") return true;
  return false;
}

function toPreview(
  sourceUrl: string,
  card: Record<string, unknown>,
): AgentCardPreview {
  const capabilities =
    card.capabilities && typeof card.capabilities === "object"
      ? (card.capabilities as Record<string, unknown>)
      : null;
  const provider =
    card.provider && typeof card.provider === "object"
      ? (card.provider as Record<string, unknown>)
      : null;
  return {
    sourceUrl,
    name: stringField(card.name),
    description: stringField(card.description),
    endpoint: stringField(card.url),
    provider:
      stringField(provider?.organization) ?? stringField(provider?.name),
    documentationUrl:
      stringField(card.documentationUrl) ?? stringField(provider?.url),
    x402:
      capabilities?.x402 === true ||
      card.x402 === true ||
      card.x402Support === true,
    erc8183Provider: parseErc8183Provider(card),
    protocolVersion: stringField(card.protocolVersion) ?? stringField(card.version),
    preferredTransport: stringField(card.preferredTransport),
    skills: parseSkills(card.skills),
    interfaces: parseInterfaces(card.additionalInterfaces),
    card,
  };
}

function parseSkills(value: unknown): AgentCardSkill[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((skill) => {
      if (typeof skill === "string") {
        return { id: null, name: skill, description: null, tags: [] };
      }
      if (!skill || typeof skill !== "object") return null;
      const rec = skill as Record<string, unknown>;
      const name = stringField(rec.name) ?? stringField(rec.id);
      if (!name) return null;
      return {
        id: stringField(rec.id),
        name,
        description: stringField(rec.description),
        tags: Array.isArray(rec.tags)
          ? rec.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
      };
    })
    .filter((skill): skill is AgentCardSkill => Boolean(skill));
}

function parseInterfaces(
  value: unknown,
): { transport: string | null; url: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Record<string, unknown>;
      const url = stringField(rec.url);
      if (!url || !/^https?:\/\//i.test(url)) return null;
      return {
        transport: stringField(rec.transport) ?? stringField(rec.protocol),
        url,
      };
    })
    .filter(
      (item): item is { transport: string | null; url: string } => Boolean(item),
    );
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseErc8183Provider(card: Record<string, unknown>): string | null {
  const block =
    card.erc8183 && typeof card.erc8183 === "object"
      ? (card.erc8183 as Record<string, unknown>)
      : null;
  const raw = stringField(block?.provider) ?? stringField(card.erc8183Provider);
  return raw;
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    if (!json || typeof json !== "object" || Array.isArray(json)) return null;
    return json as Record<string, unknown>;
  } catch {
    return null;
  }
}
