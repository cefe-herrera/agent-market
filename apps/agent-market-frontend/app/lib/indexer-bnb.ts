import type { MarketplaceAgent } from "@/app/lib/agents";
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
  frontendBscChainId,
  isTestnetNetwork,
} from "@/app/lib/network";
import { listStudioScanAgents, resolveStudioScanAgent } from "@/app/lib/scan-8004";

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
  usable?: boolean;
  open?: boolean;
};

export type IndexerListResult = {
  data: MarketplaceAgent[];
  total: number;
  page: number;
  limit: number;
  registered?: number;
  consumable?: number;
  filteredOut?: number;
};

type UsableCache = {
  key: string;
  at: number;
  agents: MarketplaceAgent[];
  registered: number;
};

const USABLE_TTL_MS = 120_000;
let usableCache: UsableCache | null = null;

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
): Required<
  Pick<IndexerListFilters, "isTestnet" | "chainId" | "limit" | "page" | "usable" | "open">
> &
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
  const usable = params.get("usable") !== "false";
  const open = params.get("open") === "true";
  return { isTestnet, chainId, limit, page, search: q, usable, open };
}

export function mapIndexerAgent(row: IndexerAgentRow): MarketplaceAgent {
  const hydrated = withDecodedMetadata(row);
  const chainId = Number(hydrated.chainId);
  const tokenId = String(hydrated.onchainId);
  const registry = registryOf(hydrated) ?? BSC_REGISTRY;
  const agentId = `${chainId}:${registry}:${tokenId}`;
  const name = hydrated.name?.trim() || `Agent #${tokenId}`;
  const description = hydrated.description?.trim() || name;
  const slug = slugify(name, tokenId);
  const endpoints = extractEndpoints(hydrated.metadata);
  const protocols = ["ERC-8004"];
  if (endpoints.a2a) protocols.push("A2A");
  if (endpoints.mcp) protocols.push("MCP");
  const x402 = metadataHasX402(hydrated.metadata);
  const factory = isFactoryNoise(hydrated);
  const profile = isHumanProfileAgent(hydrated, endpoints);
  const consumable = isConsumableAgent(hydrated, endpoints);
  const schemaErrors: string[] = [];
  if (factory) schemaErrors.push("factory noise");
  if (profile) schemaErrors.push("human profile, not a machine endpoint");
  if (!endpoints.a2a && !endpoints.mcp) schemaErrors.push("missing callable A2A/MCP");
  const studioSdk = isStudioAgent(hydrated);
  const skills = extractSkills(hydrated.metadata);

  return {
    id: hydrated.id,
    agentId,
    name,
    slug,
    description,
    shortDescription: description.slice(0, 160),
    ownerWallet: hydrated.ownerAddress,
    agentWallet: hydrated.agentWalletAddress || hydrated.ownerAddress,
    agentUri: hydrated.metadataUri ?? null,
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
      skills,
      x402Support: x402 ? true : null,
      priceLabel: x402 ? "x402 $U" : null,
    },
    verification: {
      level: consumable ? "schema_valid" : "registered",
      registered: true,
      schemaValid: consumable,
      live: false,
      livePending: consumable,
      schemaErrors,
      liveError: null,
      priceLabel: x402 ? "x402 $U" : null,
      skills,
      studioSdk,
    },
    metrics: {
      categoryMetrics: {
        mcpEndpoint: endpoints.mcp,
        a2aEndpoint: endpoints.a2a,
        x402Supported: x402,
        factoryNoise: factory,
        humanProfile: profile,
      },
    },
  };
}

export async function listIndexerAgents(filters: IndexerListFilters): Promise<IndexerListResult> {
  const chainId = filters.chainId ?? frontendBscChainId();
  const isTestnet = filters.isTestnet ?? isTestnetNetwork();
  const limit = Math.min(filters.limit ?? 100, 100);
  const page = Math.max(filters.page ?? 1, 1);
  const expectedChain = isTestnet ? BSC_TESTNET_CHAIN_ID : chainId || BSC_MAINNET_CHAIN_ID;
  const usable = filters.usable !== false;

  if (usable) {
    return listUsableAgents({
      ...filters,
      chainId: expectedChain,
      isTestnet,
      limit,
      page,
    });
  }

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
    .map((row) => mapIndexerAgent(withDecodedMetadata(row)))
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

async function listUsableAgents(filters: IndexerListFilters): Promise<IndexerListResult> {
  const chainId = filters.chainId ?? frontendBscChainId();
  const isTestnet = filters.isTestnet ?? isTestnetNetwork();
  const limit = Math.min(filters.limit ?? 100, 100);
  const page = Math.max(filters.page ?? 1, 1);
  const cacheKey = `v2:${chainId}:${isTestnet}:${filters.open ? "open" : "studio"}:${filters.search ?? ""}`;
  const now = Date.now();
  let classified: MarketplaceAgent[];
  let registered: number;

  if (usableCache && usableCache.key === cacheKey && now - usableCache.at < USABLE_TTL_MS) {
    classified = usableCache.agents;
    registered = usableCache.registered;
  } else {
    const rows = filters.search
      ? await fetchIndexerPage(filters.search, 0, 100)
      : await fetchAllCandidateRows(Boolean(filters.open));
    const hydrated = await hydrateCandidateRows(rows);
    classified = hydrated
      .map(mapIndexerAgent)
      .filter((agent) => agent.chainId === chainId)
      .filter((agent) => (isTestnet ? agent.isTestnet : !agent.isTestnet));
    registered = classified.length;
    const fromScan = await mergeStudioScanAgents(classified, chainId, isTestnet);
    classified = fromScan;
    usableCache = { key: cacheKey, at: now, agents: classified, registered };
  }

  const consumable = classified.filter((agent) => agent.verification?.schemaValid);
  const offset = (page - 1) * limit;
  return {
    data: consumable.slice(offset, offset + limit),
    total: consumable.length,
    page,
    limit,
    registered,
    consumable: consumable.length,
    filteredOut: Math.max(registered - consumable.length, 0),
  };
}

async function fetchIndexerPage(
  search: string | undefined,
  page: number,
  size: number,
): Promise<IndexerAgentRow[]> {
  const qs = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc",
  });
  if (search) qs.set("q", search);
  const path = search ? `/api/v1/search?${qs}` : `/api/v1/agents?${qs}`;
  const { status, json } = await indexerGet(path);
  if (status >= 400) throw new IndexerHttpError(status, json);
  const pageBody = json as SpringPage<IndexerAgentRow>;
  return Array.isArray(pageBody.content) ? pageBody.content : [];
}

async function fetchAllCandidateRows(open: boolean): Promise<IndexerAgentRow[]> {
  const pages = [fetchIndexerPage(undefined, 0, 2000)];
  if (open) {
    for (const q of ["bnbagent", "agent-card", "a2a", "mcp", "x402"]) {
      pages.push(fetchIndexerPage(q, 0, 40));
    }
  }
  const batches = await Promise.all(pages);
  const byId = new Map<string, IndexerAgentRow>();
  for (const batch of batches) {
    for (const row of batch) byId.set(row.id, row);
  }
  return [...byId.values()];
}

async function mergeStudioScanAgents(
  indexed: MarketplaceAgent[],
  chainId: number,
  isTestnet: boolean,
): Promise<MarketplaceAgent[]> {
  try {
    const scanned = await listStudioScanAgents(chainId, isTestnet);
    const byId = new Map(indexed.map((agent) => [agent.agentId, agent]));
    for (const item of scanned) {
      const mapped = mapIndexerAgent({
        id: item.id,
        chainId: item.chainId,
        onchainId: item.tokenId,
        ownerAddress: item.ownerAddress,
        name: item.name,
        description: item.description,
        metadataUri: item.a2a,
        metadata: {
          url: item.a2a,
          x402Support: item.x402,
          endpoints: { a2a: item.a2a, mcp: item.mcp },
          services: [
            ...(item.a2a ? [{ name: "A2A", endpoint: item.a2a }] : []),
            ...(item.mcp ? [{ name: "MCP", endpoint: item.mcp }] : []),
          ],
        },
      });
      if (!mapped.verification?.schemaValid) continue;
      if (!byId.has(mapped.agentId)) byId.set(mapped.agentId, mapped);
    }
    return [...byId.values()];
  } catch {
    return indexed;
  }
}

async function hydrateCandidateRows(
  rows: IndexerAgentRow[],
): Promise<IndexerAgentRow[]> {
  const out: IndexerAgentRow[] = [];
  const pending: IndexerAgentRow[] = [];
  for (const row of rows) {
    const decoded = withDecodedMetadata(row);
    if (shouldHydrateDetail(decoded)) pending.push(decoded);
    else out.push(decoded);
  }
  const chunk = 8;
  for (let i = 0; i < pending.length; i += chunk) {
    const slice = pending.slice(i, i + chunk);
    const details = await Promise.all(
      slice.map(async (row) => {
        try {
          return (await fetchIndexerRow(row.id)) ?? row;
        } catch {
          return row;
        }
      }),
    );
    out.push(...details.map(withDecodedMetadata));
  }
  return out;
}

function shouldHydrateDetail(row: IndexerAgentRow): boolean {
  if (row.metadata && hasServiceHint(row.metadata)) return false;
  const uri = row.metadataUri ?? "";
  if (!/^https?:\/\//i.test(uri)) return false;
  if (looksLikeCardUri(uri)) return true;
  if (isFactoryNoise(row) || isEvoEvoUri(uri)) return false;
  return true;
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
  if (!match) {
    if (erc) {
      const scanned = await resolveStudioScanAgent(Number(erc[1]), erc[3]);
      return scanned
        ? mapIndexerAgent({
            id: scanned.id,
            chainId: scanned.chainId,
            onchainId: scanned.tokenId,
            ownerAddress: scanned.ownerAddress,
            name: scanned.name,
            description: scanned.description,
            metadataUri: scanned.a2a,
            metadata: {
              url: scanned.a2a,
              x402Support: scanned.x402,
              endpoints: { a2a: scanned.a2a, mcp: scanned.mcp },
              services: [
                ...(scanned.a2a ? [{ name: "A2A", endpoint: scanned.a2a }] : []),
                ...(scanned.mcp ? [{ name: "MCP", endpoint: scanned.mcp }] : []),
              ],
            },
          })
        : null;
    }
    return null;
  }
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
      skills: agent?.verification?.skills ?? [],
      priceLabel: agent?.verification?.priceLabel ?? null,
    };
  } catch (err) {
    return {
      healthy: false,
      status: "unhealthy",
      endpoint,
      error: err instanceof Error ? err.message : String(err),
      skills: agent?.verification?.skills ?? [],
      priceLabel: agent?.verification?.priceLabel ?? null,
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
  const row = await fetchIndexerRow(uuid);
  return row ? mapIndexerAgent(row) : null;
}

async function fetchIndexerRow(uuid: string): Promise<IndexerAgentRow | null> {
  const { status, json } = await indexerGet(`/api/v1/agents/${uuid}`);
  if (status === 404) return null;
  if (status >= 400) throw new IndexerHttpError(status, json);
  return json as IndexerAgentRow;
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

function withDecodedMetadata(row: IndexerAgentRow): IndexerAgentRow {
  if (row.metadata && Object.keys(row.metadata).length > 0) return row;
  const decoded = decodeInlineMetadata(row.metadataUri);
  return decoded ? { ...row, metadata: decoded } : row;
}

function decodeInlineMetadata(uri: string | null | undefined): Record<string, unknown> | null {
  if (!uri) return null;
  const dataJson = uri.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,(.+)$/i);
  if (!dataJson) return null;
  try {
    const payload = dataJson[1]
      ? Buffer.from(dataJson[2], "base64").toString("utf8")
      : decodeURIComponent(dataJson[2]);
    const parsed = JSON.parse(payload) as unknown;
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function isFactoryNoise(row: IndexerAgentRow): boolean {
  const name = (row.name ?? "").trim();
  const description = (row.description ?? "").trim();
  const uri = (row.metadataUri ?? "").toLowerCase();
  if (name.toLowerCase().endsWith(".agent")) return true;
  if (/on termix platform\s*$/i.test(description)) return true;
  if (uri.includes("termix")) return true;
  if (!name || /^agent #\d+$/i.test(name)) return true;
  return false;
}

function isEvoEvoUri(uri: string | null | undefined): boolean {
  return (uri ?? "").toLowerCase().includes("evoevo.ai");
}

function looksLikeCardUri(uri: string | null | undefined): boolean {
  const value = (uri ?? "").toLowerCase();
  return value.includes("agent-card") || value.includes(".well-known/");
}

function hasServiceHint(metadata: Record<string, unknown>): boolean {
  return Boolean(
    extractEndpoints(metadata).a2a ||
      extractEndpoints(metadata).mcp ||
      Array.isArray(metadata.services) ||
      asRecord(metadata.services) ||
      asRecord(metadata.endpoints),
  );
}

function isStudioAgent(row: IndexerAgentRow): boolean {
  const blob = `${row.name ?? ""} ${row.description ?? ""} ${row.metadataUri ?? ""} ${JSON.stringify(row.metadata ?? {})}`.toLowerCase();
  return blob.includes("bnbagent") || blob.includes("bnb-chain/bnbagent-sdk");
}

function isHumanProfileAgent(
  row: IndexerAgentRow,
  endpoints: { a2a: string | null; mcp: string | null; agentUrl: string | null },
): boolean {
  if (isEvoEvoUri(row.metadataUri) && !endpoints.a2a && !endpoints.mcp) return true;
  const url = endpoints.agentUrl ?? "";
  return isHumanProfileUrl(url) && !endpoints.a2a && !endpoints.mcp;
}

function isConsumableAgent(
  row: IndexerAgentRow,
  endpoints: { a2a: string | null; mcp: string | null },
): boolean {
  if (isFactoryNoise(row) && !looksLikeCardUri(row.metadataUri)) return false;
  return isCallableUrl(endpoints.a2a) || isCallableUrl(endpoints.mcp);
}

function isCallableUrl(value: string | null | undefined): value is string {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  if (value.includes("{") || value.includes("%7B")) return false;
  const url = value.toLowerCase();
  if (url.includes(".example") || url.includes("example.com")) return false;
  if (url.includes("amazoncognito.com") || url.includes("/oauth2/")) return false;
  if (url.includes("/login") || url.includes("/signin")) return false;
  if (url.includes("accounts.google.com") || url.includes("github.com/")) return false;
  if (url.includes("twitter.com") || url.includes("linkedin.com")) return false;
  if (isHumanProfileUrl(value)) return false;
  return true;
}

function isHumanProfileUrl(url: string): boolean {
  const value = url.toLowerCase();
  if (value.includes("evoevo.ai/agent/")) return true;
  if (value.includes("evoevo.ai") && !isAgentServiceUrl(value)) return true;
  if (
    (value.includes("termix.live") || value.includes("termix.ai")) &&
    !isAgentServiceUrl(value)
  ) {
    return true;
  }
  return false;
}

function isAgentServiceUrl(url: string): boolean {
  return /\/a2a\b|\/mcp\b|agent-card|well-known|jsonrpc|\.json(\?|$)/i.test(url);
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
  const a2aRaw =
    stringUrl(endpoints?.a2a) ??
    fromServices.a2a ??
    stringUrl(raw.a2a_endpoint) ??
    extra.a2a ??
    (isAgentServiceUrl(String(raw.url ?? nested?.url ?? ""))
      ? stringUrl(raw.url) ?? stringUrl(nested?.url)
      : null);
  const mcpRaw =
    stringUrl(endpoints?.mcp) ??
    fromServices.mcp ??
    stringUrl(raw.mcp_server) ??
    extra.mcp;
  const a2a = isCallableUrl(a2aRaw) ? a2aRaw : null;
  const mcp = isCallableUrl(mcpRaw) ? mcpRaw : null;
  const agentUrlRaw =
    fromServices.agentUrl ?? stringUrl(raw.url) ?? stringUrl(nested?.url);
  return {
    a2a,
    mcp,
    agentUrl: agentUrlRaw,
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
