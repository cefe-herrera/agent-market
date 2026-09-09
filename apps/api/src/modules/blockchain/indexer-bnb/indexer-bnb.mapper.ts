import {
  AgentCategory,
  AgentSource,
  AgentStatus,
  MarketplaceAgentDto,
  RiskLevel,
} from '@bnb-marketplace/shared-types';
import { inferAgentCategory } from '../erc8004/erc8004-agent.mapper';
import type { IndexerAgentRow } from './indexer-bnb.types';
import {
  BSC_MAINNET_CHAIN_ID,
  BSC_TESTNET_CHAIN_ID,
} from '../../../common/network/network-mode';

const BSC_REGISTRY = '0x8004a169fb4a3325136eb29fa0ceb6d2e539a432';

export function mapIndexerRowToMarketplaceAgent(row: IndexerAgentRow): MarketplaceAgentDto {
  const hydrated = withDecodedMetadata(row);
  const chainId = Number(hydrated.chainId);
  const tokenId = String(hydrated.onchainId);
  const registry = registryOf(hydrated) ?? BSC_REGISTRY;
  const agentId = `${chainId}:${registry}:${tokenId}`;
  const name = hydrated.name?.trim() || `Agent #${tokenId}`;
  const description = hydrated.description?.trim() || name;
  const slug = slugify(name, tokenId);
  const endpoints = extractEndpoints(hydrated.metadata);
  const protocols = ['ERC-8004'];
  if (endpoints.a2a) protocols.push('A2A');
  if (endpoints.mcp) protocols.push('MCP');
  const x402 = metadataHasX402(hydrated.metadata);
  const factory = isFactoryNoise(hydrated);
  const profile = isHumanProfileAgent(hydrated, endpoints);
  const consumable = isConsumableAgent(hydrated, endpoints);
  const schemaErrors: string[] = [];
  if (factory) schemaErrors.push('factory noise');
  if (profile) schemaErrors.push('human profile, not a machine endpoint');
  if (!endpoints.a2a && !endpoints.mcp) schemaErrors.push('missing callable A2A/MCP');
  const studioSdk = isStudioAgent(hydrated);
  const skills = extractSkills(hydrated.metadata);
  const now = new Date().toISOString();
  const createdAt = hydrated.createdAt ?? now;

  return {
    id: hydrated.id,
    agentId,
    name,
    slug,
    description,
    shortDescription: description.slice(0, 160),
    imageUrl: hydrated.imageUri ?? null,
    ownerWallet: hydrated.ownerAddress,
    agentWallet: hydrated.agentWalletAddress || hydrated.ownerAddress,
    agentUri: hydrated.metadataUri ?? null,
    network: chainId === BSC_TESTNET_CHAIN_ID ? 'BSC Testnet' : 'BSC',
    chainId,
    isTestnet: chainId === BSC_TESTNET_CHAIN_ID,
    source: AgentSource.ERC8004,
    publishedAt: createdAt,
    status: AgentStatus.LISTED,
    verified: false,
    category: inferAgentCategory(name, description),
    protocols,
    supportedAssets: x402 ? ['U'] : [],
    strategyName: name,
    strategyDescription: description,
    riskLevel: RiskLevel.MEDIUM,
    minimumCapital: 0,
    recommendedCapital: 0,
    executionFrequency: 'On demand',
    createdAt,
    updatedAt: createdAt,
    marketplaceScore: undefined,
    endpoints: {
      a2a: endpoints.a2a,
      mcp: endpoints.mcp,
      agentUrl: endpoints.agentUrl,
    },
    a2a: {
      endpoint: endpoints.a2a,
      healthy: false,
      status: endpoints.a2a ? 'unknown' : 'missing',
      latencyMs: null,
      checkedAt: now,
      error: null,
      skills,
      x402Support: x402 ? true : null,
      priceLabel: x402 ? 'x402 $U' : null,
    },
    verification: {
      level: consumable ? 'schema_valid' : 'registered',
      registered: true,
      schemaValid: consumable,
      live: false,
      livePending: consumable,
      schemaErrors,
      liveError: null,
      checkedAt: now,
      liveCheckedAt: null,
      priceLabel: x402 ? 'x402 $U' : null,
      skills,
      studioSdk,
    },
    metrics: {
      agentId,
      aum: 0,
      managedVolume: 0,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      successRate: 0,
      return7d: 0,
      return30d: 0,
      return90d: 0,
      maxDrawdown30d: 0,
      averageExecutionTime: 0,
      averageGasCost: 0,
      uptime: 0,
      uniqueUsers: 0,
      totalRevenue: 0,
      categoryMetrics: {
        mcpEndpoint: endpoints.mcp,
        a2aEndpoint: endpoints.a2a,
        x402Supported: x402,
        factoryNoise: factory,
        humanProfile: profile,
      },
      updatedAt: now,
    },
  };
}

export function withDecodedMetadata(row: IndexerAgentRow): IndexerAgentRow {
  if (row.metadata && Object.keys(row.metadata).length > 0) return row;
  const decoded = decodeInlineMetadata(row.metadataUri);
  return decoded ? { ...row, metadata: decoded } : row;
}

export function shouldHydrateDetail(row: IndexerAgentRow): boolean {
  if (row.metadata && hasServiceHint(row.metadata)) return false;
  const uri = row.metadataUri ?? '';
  if (!/^https?:\/\//i.test(uri)) return false;
  if (looksLikeCardUri(uri)) return true;
  if (isFactoryNoise(row) || isEvoEvoUri(uri)) return false;
  return true;
}

export function isFactoryNoise(row: IndexerAgentRow): boolean {
  const name = (row.name ?? '').trim();
  const description = (row.description ?? '').trim();
  const uri = (row.metadataUri ?? '').toLowerCase();
  if (name.toLowerCase().endsWith('.agent')) return true;
  if (/on termix platform\s*$/i.test(description)) return true;
  if (uri.includes('termix')) return true;
  if (!name || /^agent #\d+$/i.test(name)) return true;
  return false;
}

function slugify(name: string, tokenId: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'agent';
  return `${base}-${tokenId}`.slice(0, 120);
}

function decodeInlineMetadata(uri: string | null | undefined): Record<string, unknown> | null {
  if (!uri) return null;
  const dataJson = uri.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,(.+)$/i);
  if (!dataJson) return null;
  try {
    const payload = dataJson[1]
      ? Buffer.from(dataJson[2], 'base64').toString('utf8')
      : decodeURIComponent(dataJson[2]);
    const parsed = JSON.parse(payload) as unknown;
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function isEvoEvoUri(uri: string | null | undefined): boolean {
  return (uri ?? '').toLowerCase().includes('evoevo.ai');
}

function looksLikeCardUri(uri: string | null | undefined): boolean {
  const value = (uri ?? '').toLowerCase();
  return value.includes('agent-card') || value.includes('.well-known/');
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
  const blob = `${row.name ?? ''} ${row.description ?? ''} ${row.metadataUri ?? ''} ${JSON.stringify(row.metadata ?? {})}`.toLowerCase();
  return blob.includes('bnbagent') || blob.includes('bnb-chain/bnbagent-sdk');
}

function isHumanProfileAgent(
  row: IndexerAgentRow,
  endpoints: { a2a: string | null; mcp: string | null; agentUrl: string | null },
): boolean {
  if (isEvoEvoUri(row.metadataUri) && !endpoints.a2a && !endpoints.mcp) return true;
  const url = endpoints.agentUrl ?? '';
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
  if (value.includes('{') || value.includes('%7B')) return false;
  const url = value.toLowerCase();
  if (url.includes('.example') || url.includes('example.com')) return false;
  if (url.includes('amazoncognito.com') || url.includes('/oauth2/')) return false;
  if (url.includes('/login') || url.includes('/signin')) return false;
  if (url.includes('accounts.google.com') || url.includes('github.com/')) return false;
  if (url.includes('twitter.com') || url.includes('linkedin.com')) return false;
  if (isHumanProfileUrl(value)) return false;
  return true;
}

function isHumanProfileUrl(url: string): boolean {
  const value = url.toLowerCase();
  if (value.includes('evoevo.ai/agent/')) return true;
  if (value.includes('evoevo.ai') && !isAgentServiceUrl(value)) return true;
  if (
    (value.includes('termix.live') || value.includes('termix.ai')) &&
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
  return value && typeof value === 'object' && !Array.isArray(value)
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
  const nested = asRecord(raw.metadata) ?? asRecord(raw.agentCard) ?? asRecord(raw.card);
  const endpoints = asRecord(raw.endpoints) ?? asRecord(nested?.endpoints);
  const fromServices = serviceEndpoints(raw.services ?? nested?.services);
  const extra = extraInterfaceUrl(raw, nested);
  const a2aRaw =
    stringUrl(endpoints?.a2a) ??
    fromServices.a2a ??
    stringUrl(raw.a2a_endpoint) ??
    extra.a2a ??
    (isAgentServiceUrl(String(raw.url ?? nested?.url ?? ''))
      ? stringUrl(raw.url) ?? stringUrl(nested?.url)
      : null);
  const mcpRaw =
    stringUrl(endpoints?.mcp) ??
    fromServices.mcp ??
    stringUrl(raw.mcp_server) ??
    extra.mcp;
  return {
    a2a: isCallableUrl(a2aRaw) ? a2aRaw : null,
    mcp: isCallableUrl(mcpRaw) ? mcpRaw : null,
    agentUrl: fromServices.agentUrl ?? stringUrl(raw.url) ?? stringUrl(nested?.url),
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
  if (!Array.isArray(services)) return { a2a: null, mcp: null, agentUrl: null };
  let a2a: string | null = null;
  let mcp: string | null = null;
  let agentUrl: string | null = null;
  for (const item of services) {
    const rec = asRecord(item);
    const name = String(rec?.name ?? rec?.type ?? '').toLowerCase();
    const url = stringUrl(rec?.endpoint) ?? stringUrl(rec?.url);
    if (!url) continue;
    if (!a2a && (name.includes('a2a') || name.includes('agent-card'))) a2a = url;
    else if (!mcp && name.includes('mcp')) mcp = url;
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
      const type = String(rec?.type ?? rec?.protocol ?? '').toLowerCase();
      if (!url) continue;
      if (!a2a && type.includes('a2a')) a2a = url;
      if (!mcp && type.includes('mcp')) mcp = url;
    }
  }
  return { a2a, mcp };
}

function stringUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  if (value.includes('{') || value.includes('%7B')) return null;
  return value;
}

function registryOf(row: IndexerAgentRow): string | null {
  const registrations = asRecord(row.metadata)?.registrations;
  if (!Array.isArray(registrations)) return null;
  for (const item of registrations) {
    const rec = asRecord(item);
    const registry = String(rec?.agentRegistry ?? rec?.registry ?? '');
    const match = registry.match(/0x[a-fA-F0-9]{40}/);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function extractSkills(metadata: unknown): string[] {
  const raw = asRecord(metadata);
  const nested = asRecord(raw?.metadata) ?? asRecord(raw?.agentCard) ?? asRecord(raw?.card);
  const skills = raw?.skills ?? nested?.skills;
  if (!Array.isArray(skills)) return [];
  return skills
    .map((skill) => {
      if (typeof skill === 'string') return skill;
      const rec = asRecord(skill);
      if (typeof rec?.name === 'string') return rec.name;
      if (typeof rec?.id === 'string') return rec.id;
      return null;
    })
    .filter((name): name is string => Boolean(name));
}

function metadataHasX402(metadata: unknown): boolean {
  const raw = asRecord(metadata);
  if (!raw) return false;
  if (raw.x402 === true || raw.x402Support === true || raw.x402_supported === true) return true;
  const capabilities = asRecord(raw.capabilities);
  return capabilities?.x402 === true;
}

export { BSC_MAINNET_CHAIN_ID, BSC_TESTNET_CHAIN_ID };
