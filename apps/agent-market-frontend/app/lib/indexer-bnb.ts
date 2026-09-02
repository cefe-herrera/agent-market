import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
  frontendBscChainId,
  isTestnetNetwork,
} from "@/app/lib/network";

const BSC_REGISTRY =
  "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERC8004_RE = /^(\d+):(0x[a-fA-F0-9]{40}):(\d+)$/;

export type IndexerListFilters = {
  isTestnet?: boolean;
  chainId?: number;
  limit?: number;
  page?: number;
  search?: string;
};

export type IndexerAgentRow = {
  id: string;
  chainId: number;
  onchainId: string | number;
  ownerAddress: string;
  agentWalletAddress?: string | null;
  name: string | null;
  description: string | null;
  metadataUri?: string | null;
  imageUri?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | null;
};

type SpringPage<T> = {
  content?: T[];
  totalElements?: number;
  number?: number;
  size?: number;
  page?: {
    size?: number;
    number?: number;
    totalElements?: number;
    totalPages?: number;
  };
};

function springTotal(body: SpringPage<unknown>): number | undefined {
  if (typeof body.page?.totalElements === "number") return body.page.totalElements;
  if (typeof body.totalElements === "number") return body.totalElements;
  return undefined;
}

export function indexerOrigin(): string {
  const url =
    process.env.INDEXER_BNB_URL ||
    process.env.NEXT_PUBLIC_INDEXER_BNB_URL ||
    "http://127.0.0.1:8085";
  return url.replace(/\/$/, "");
}

export function indexerUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${indexerOrigin()}${normalized}`;
}

export function marketplaceListFilters(
  search: string,
): Required<Pick<IndexerListFilters, "isTestnet" | "chainId" | "limit" | "page">> &
  Pick<IndexerListFilters, "search"> {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const isTestnet = params.has("isTestnet")
    ? params.get("isTestnet") === "true"
    : isTestnetNetwork();
  const chainId = params.has("chainId")
    ? Number(params.get("chainId"))
    : frontendBscChainId();
  const limit = Math.min(Number(params.get("limit") ?? 100) || 100, 100);
  const page = Math.max(Number(params.get("page") ?? 1) || 1, 1);
  const q =
    params.get("search")?.trim() || params.get("q")?.trim() || undefined;
  return { isTestnet, chainId, limit, page, search: q };
}

export function mapIndexerAgent(row: IndexerAgentRow): MarketplaceAgent {
  const chainId = Number(row.chainId);
  const tokenId = String(row.onchainId);
  const registry = registryOf(row) ?? BSC_REGISTRY;
  const agentId = `${chainId}:${registry}:${tokenId}`;
  const name = row.name?.trim() || `Agent #${tokenId}`;
  const description = row.description?.trim() || name;
  const slug = slugify(name, tokenId);
  const endpoints = extractEndpoints(row.metadata);
  const protocols = ["ERC-8004"];
  if (endpoints.a2a) protocols.push("A2A");
  if (endpoints.mcp) protocols.push("MCP");
  const x402 = metadataHasX402(row.metadata);
  const schemaValid = Boolean(endpoints.a2a || endpoints.mcp || endpoints.agentUrl);

  return {
    id: row.id,
    agentId,
    name,
    slug,
    description,
    shortDescription: description.slice(0, 160),
    ownerWallet: row.ownerAddress,
    agentWallet: row.agentWalletAddress || row.ownerAddress,
    agentUri: row.metadataUri ?? null,
    network: chainId === BSC_TESTNET_CHAIN_ID ? "BSC Testnet" : "BSC",
    chainId,
    isTestnet: chainId === BSC_TESTNET_CHAIN_ID,
    protocols,
    supportedAssets: x402 ? ["U"] : [],
    verified: false,
    marketplaceScore: undefined,
    endpoints: {
      a2a: endpoints.a2a,
      mcp: endpoints.mcp,
      agentUrl: endpoints.agentUrl,
    },
    a2a: {
      endpoint: endpoints.a2a,
      healthy: false,
      status: endpoints.a2a ? "unknown" : "missing",
      skills: extractSkills(row.metadata),
      x402Support: x402 ? true : null,
      priceLabel: x402 ? "x402 $U" : null,
    },
    verification: {
      level: schemaValid ? "schema_valid" : "registered",
      registered: true,
      schemaValid,
      live: false,
      livePending: schemaValid,
      schemaErrors: [],
      liveError: null,
      priceLabel: x402 ? "x402 $U" : null,
      skills: extractSkills(row.metadata),
      studioSdk: false,
    },
    metrics: {
      categoryMetrics: {
        mcpEndpoint: endpoints.mcp,
        a2aEndpoint: endpoints.a2a,
        x402Supported: x402,
      },
    },
  };
}

export async function listIndexerAgents(filters: IndexerListFilters): Promise<{
  data: MarketplaceAgent[];
  total: number;
  page: number;
  limit: number;
}> {
  const chainId = filters.chainId ?? frontendBscChainId();
  const isTestnet = filters.isTestnet ?? isTestnetNetwork();
  const limit = Math.min(filters.limit ?? 100, 100);
  const page = Math.max(filters.page ?? 1, 1);
  const expectedChain = isTestnet ? BSC_TESTNET_CHAIN_ID : chainId || BSC_MAINNET_CHAIN_ID;

  const qs = new URLSearchParams({
    page: String(page - 1),
    size: String(limit),
    sort: "createdAt,desc",
  });
  if (filters.search) qs.set("q", filters.search);

  const path = filters.search
    ? `/api/v1/search?${qs}`
    : `/api/v1/agents?${qs}`;
  const { status, json } = await indexerGet(path);
  if (status >= 400) {
    throw new IndexerHttpError(status, json);
  }

  const pageBody = json as SpringPage<IndexerAgentRow>;
  const rows = Array.isArray(pageBody.content) ? pageBody.content : [];
  const data = rows
    .map(mapIndexerAgent)
    .filter((agent) => agent.chainId === expectedChain)
    .filter((agent) => (isTestnet ? agent.isTestnet : !agent.isTestnet));
  const indexedTotal = springTotal(pageBody);

  return {
    data,
    total:
      data.length === rows.length && typeof indexedTotal === "number"
        ? indexedTotal
        : data.length,
    page,
    limit,
  };
}

export async function resolveIndexerAgent(
  id: string,
): Promise<MarketplaceAgent | null> {
  const decoded = decodeURIComponent(id);
  if (UUID_RE.test(decoded)) {
    return fetchIndexerDetail(decoded);
  }

  const erc = decoded.match(ERC8004_RE);
  const query = erc ? erc[3] : decoded;
  const { status, json } = await indexerGet(
    `/api/v1/search?q=${encodeURIComponent(query)}&page=0&size=20`,
  );
  if (status >= 400) throw new IndexerHttpError(status, json);

  const rows = Array.isArray((json as SpringPage<IndexerAgentRow>).content)
    ? (json as SpringPage<IndexerAgentRow>).content!
    : [];
  const match = rows.find((row) => {
    if (erc) {
      return (
        Number(row.chainId) === Number(erc[1]) &&
        String(row.onchainId) === erc[3]
      );
    }
    return String(row.id) === decoded || String(row.onchainId) === decoded;
  });
  if (!match) return null;
  return fetchIndexerDetail(match.id);
}

export async function indexerAgentHealth(id: string): Promise<{
  healthy: boolean;
  status: string;
  endpoint: string | null;
  error: string | null;
  skills: string[];
  priceLabel: string | null;
}> {
  const agent = await resolveIndexerAgent(id);
  const endpoint = agent?.endpoints?.a2a ?? agent?.a2a?.endpoint ?? null;
  if (!endpoint) {
    return {
      healthy: false,
      status: "missing",
      endpoint: null,
      error: "No A2A URL in indexer metadata",
      skills: agent?.verification?.skills ?? [],
      priceLabel: agent?.verification?.priceLabel ?? null,
    };
  }

  try {
    const res = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    const ok = res.ok || res.status === 401 || res.status === 402 || res.status === 403;
    return {
      healthy: ok,
      status: ok ? "healthy" : "unhealthy",
      endpoint,
      error: ok ? null : `HTTP ${res.status}`,
      skills: agent.verification?.skills ?? [],
      priceLabel: agent.verification?.priceLabel ?? null,
    };
  } catch (err) {
    return {
      healthy: false,
      status: "unhealthy",
      endpoint,
      error: err instanceof Error ? err.message : String(err),
      skills: agent.verification?.skills ?? [],
      priceLabel: agent.verification?.priceLabel ?? null,
    };
  }
}

export class IndexerHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Indexer HTTP ${status}`);
  }
}

async function fetchIndexerDetail(uuid: string): Promise<MarketplaceAgent | null> {
  const { status, json } = await indexerGet(`/api/v1/agents/${uuid}`);
  if (status === 404) return null;
  if (status >= 400) throw new IndexerHttpError(status, json);
  return mapIndexerAgent(json as IndexerAgentRow);
}

async function indexerGet(path: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(indexerUrl(path), {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!text) return { status: res.status, json: null };
  try {
    return { status: res.status, json: JSON.parse(text) as unknown };
  } catch {
    return { status: res.status, json: { text } };
  }
}

function slugify(name: string, tokenId: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "agent";
  return `${base}-${tokenId}`.slice(0, 120);
}

export async function indexerAgentReputation(id: string): Promise<{
  agentId: string;
  score: number;
  factors?: unknown;
} | null> {
  const agent = await resolveIndexerAgent(id);
  if (!agent) return null;
  const { status, json } = await indexerGet(`/api/v1/agents/${agent.id}/reputation`);
  if (status === 404) return { agentId: agent.agentId, score: 0 };
  if (status >= 400) throw new IndexerHttpError(status, json);
  const rec = asRecord(json);
  return {
    agentId: agent.agentId,
    score: typeof rec?.score === "number" ? rec.score : 0,
    factors: rec?.factors,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractEndpoints(metadata: unknown): {
  a2a: string | null;
  mcp: string | null;
  agentUrl: string | null;
} {
  const raw = asRecord(metadata);
  if (!raw) return { a2a: null, mcp: null, agentUrl: null };
  const nested =
    asRecord(raw.metadata) ?? asRecord(raw.agentCard) ?? asRecord(raw.card);
  const endpoints = asRecord(raw.endpoints) ?? asRecord(nested?.endpoints);
  const fromServices = serviceEndpoints(raw.services ?? nested?.services);
  const extra = extraInterfaceUrl(raw, nested);
  const a2a =
    stringUrl(endpoints?.a2a) ??
    fromServices.a2a ??
    stringUrl(raw.a2a_endpoint) ??
    extra.a2a ??
    stringUrl(raw.url) ??
    stringUrl(nested?.url);
  const mcp =
    stringUrl(endpoints?.mcp) ??
    fromServices.mcp ??
    stringUrl(raw.mcp_server) ??
    extra.mcp;
  return {
    a2a,
    mcp,
    agentUrl:
      fromServices.agentUrl ?? stringUrl(raw.url) ?? stringUrl(nested?.url),
  };
}

function serviceEndpoints(services: unknown): {
  a2a: string | null;
  mcp: string | null;
  agentUrl: string | null;
} {
  const asObject = asRecord(services);
  if (asObject) {
    const a2a = asRecord(asObject.a2a);
    const mcp = asRecord(asObject.mcp);
    return {
      a2a: stringUrl(a2a?.endpoint) ?? stringUrl(a2a?.url),
      mcp: stringUrl(mcp?.endpoint) ?? stringUrl(mcp?.url),
      agentUrl: null,
    };
  }
  if (!Array.isArray(services)) {
    return { a2a: null, mcp: null, agentUrl: null };
  }
  let a2a: string | null = null;
  let mcp: string | null = null;
  let agentUrl: string | null = null;
  for (const item of services) {
    const rec = asRecord(item);
    const name = String(rec?.name ?? rec?.type ?? "").toLowerCase();
    const url = stringUrl(rec?.endpoint) ?? stringUrl(rec?.url);
    if (!url) continue;
    if (!a2a && (name.includes("a2a") || name.includes("agent-card"))) a2a = url;
    else if (!mcp && name.includes("mcp")) mcp = url;
    else if (!agentUrl) agentUrl = url;
  }
  return { a2a, mcp, agentUrl };
}

function extraInterfaceUrl(
  raw: Record<string, unknown>,
  nested: Record<string, unknown> | null,
): { a2a: string | null; mcp: string | null } {
  const lists = [raw.additionalInterfaces, nested?.additionalInterfaces];
  let a2a: string | null = null;
  let mcp: string | null = null;
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const rec = asRecord(item);
      const url = stringUrl(rec?.url) ?? stringUrl(rec?.uri);
      const type = String(rec?.type ?? rec?.protocol ?? "").toLowerCase();
      if (!url) continue;
      if (!a2a && type.includes("a2a")) a2a = url;
      if (!mcp && type.includes("mcp")) mcp = url;
    }
  }
  return { a2a, mcp };
}

function stringUrl(value: unknown): string | null {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value)) return null;
  if (value.includes("{") || value.includes("%7B")) return null;
  return value;
}

function registryOf(row: IndexerAgentRow): string | null {
  const registrations = asRecord(row.metadata)?.registrations;
  if (!Array.isArray(registrations)) return null;
  for (const item of registrations) {
    const rec = asRecord(item);
    const registry = String(rec?.agentRegistry ?? rec?.registry ?? "");
    const match = registry.match(/0x[a-fA-F0-9]{40}/);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function extractSkills(metadata: unknown): string[] {
  const raw = asRecord(metadata);
  const nested =
    asRecord(raw?.metadata) ?? asRecord(raw?.agentCard) ?? asRecord(raw?.card);
  const skills = raw?.skills ?? nested?.skills;
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => {
      if (typeof skill === "string") return skill;
      const rec = asRecord(skill);
      if (typeof rec?.name === "string") return rec.name;
      if (typeof rec?.id === "string") return rec.id;
      return null;
    })
    .filter((name): name is string => Boolean(name));
}

function metadataHasX402(metadata: unknown): boolean {
  const raw = asRecord(metadata);
  if (!raw) return false;
  if (raw.x402 === true || raw.x402Support === true || raw.x402_supported === true) {
    return true;
  }
  const capabilities = asRecord(raw.capabilities);
  return capabilities?.x402 === true;
}
