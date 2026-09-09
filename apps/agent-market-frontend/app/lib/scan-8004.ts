const SCAN_PUBLIC = "https://8004scan.io/api/v1/public";

export type ScanStudioAgent = {
  id: string;
  chainId: number;
  tokenId: string;
  ownerAddress: string;
  name: string | null;
  description: string | null;
  a2a: string | null;
  mcp: string | null;
  x402: boolean;
};

/** Studio agents Nest found via 8004scan search "bnbagent" — older than the Java indexer window. */
export async function listStudioScanAgents(
  chainId: number,
  isTestnet: boolean,
): Promise<ScanStudioAgent[]> {
  const queries = isTestnet
    ? ["bnbagent"]
    : ["bnbagent", "mandaterebalance"];
  const byToken = new Map<string, ScanListItem>();
  const lists = await Promise.all(
    queries.map((q) => scanList(q, chainId, isTestnet)),
  );
  for (const items of lists) {
    for (const item of items) {
      if (Number(item.chain_id) !== chainId) continue;
      if (Boolean(item.is_testnet) !== isTestnet) continue;
      const token = String(item.token_id ?? "");
      if (token) byToken.set(token, item);
    }
  }

  const details = await Promise.all(
    [...byToken.values()].slice(0, 12).map(async (item) => {
      const token = String(item.token_id);
      const detail = (await scanDetail(chainId, token)) ?? item;
      return toStudioAgent(detail, chainId);
    }),
  );

  return details.filter((agent): agent is ScanStudioAgent => Boolean(agent));
}

export async function resolveStudioScanAgent(
  chainId: number,
  tokenId: string,
): Promise<ScanStudioAgent | null> {
  const detail = await scanDetail(chainId, tokenId);
  if (!detail) return null;
  return toStudioAgent(detail, chainId);
}

type ScanListItem = {
  id?: string;
  agent_id?: string;
  token_id?: string | number;
  chain_id?: number;
  is_testnet?: boolean;
  name?: string | null;
  description?: string | null;
  owner_address?: string;
  a2a_endpoint?: string | null;
  mcp_server?: string | null;
  agent_url?: string | null;
  x402_supported?: boolean;
};

type ScanListResponse = {
  data?: ScanListItem[] | { agents?: ScanListItem[] };
};

type ScanDetailResponse = {
  data?: ScanListItem;
};

async function scanList(
  search: string,
  chainId: number,
  isTestnet: boolean,
): Promise<ScanListItem[]> {
  const qs = new URLSearchParams({
    search,
    chain_id: String(chainId),
    limit: "50",
    offset: "0",
    is_registered: "true",
    is_testnet: String(isTestnet),
    is_active: "true",
  });
  const json = (await scanGet(`${SCAN_PUBLIC}/agents?${qs}`)) as ScanListResponse;
  if (Array.isArray(json.data)) return json.data;
  if (json.data && Array.isArray(json.data.agents)) return json.data.agents;
  return [];
}

async function scanDetail(
  chainId: number,
  tokenId: string,
): Promise<ScanListItem | null> {
  const json = (await scanGet(
    `${SCAN_PUBLIC}/agents/${chainId}/${tokenId}`,
  )) as ScanDetailResponse;
  return json.data ?? null;
}

async function scanGet(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return {};
  return (await res.json().catch(() => ({}))) as unknown;
}

function toStudioAgent(
  item: ScanListItem,
  chainId: number,
): ScanStudioAgent | null {
  const tokenId = String(item.token_id ?? "");
  if (!tokenId) return null;
  return {
    id: item.id || item.agent_id || `${chainId}:${tokenId}`,
    chainId,
    tokenId,
    ownerAddress: item.owner_address || "0x0000000000000000000000000000000000000000",
    name: item.name ?? null,
    description: item.description ?? null,
    a2a: item.a2a_endpoint ?? item.agent_url ?? null,
    mcp: item.mcp_server ?? null,
    x402: item.x402_supported === true,
  };
}
