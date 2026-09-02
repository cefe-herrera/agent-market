import type { Scan8004AgentDetail, Scan8004ListItem } from './erc8004.types';

const TERMIX_PLATFORM = /on termix platform\s*$/i;
const GENERIC_TOKEN_NAME = /^agent #\d+$/i;

export function isFactoryNoise(item: Scan8004ListItem): boolean {
  const name = (item.name ?? '').trim();
  const description = (item.description ?? '').trim();

  if (GENERIC_TOKEN_NAME.test(name) && description.length < 40) return true;

  if (TERMIX_PLATFORM.test(description)) return true;

  if (name.toLowerCase().endsWith('.agent')) return true;

  return false;
}

export function isLikelyActiveScanItem(item: Scan8004ListItem): boolean {
  if (isFactoryNoise(item)) return false;

  const protocols = (item.supported_protocols ?? []).map((p) => p.toLowerCase());
  const description = (item.description ?? '').trim();
  const hasRealCopy = description.length >= 80;
  const hasEngagement =
    (item.total_feedbacks ?? 0) > 0 ||
    (item.star_count ?? 0) > 0 ||
    (item.total_score ?? 0) > 0 ||
    (item.health_score ?? 0) > 0;
  const hasService =
    item.x402_supported === true ||
    item.is_verified === true ||
    protocols.includes('mcp') ||
    protocols.includes('oasf');

  return hasEngagement || hasService || hasRealCopy;
}

/** List payloads omit endpoints/health; detail is needed when A2A or MCP is declared. */
export function scanItemNeedsDetail(item: Scan8004ListItem): boolean {
  if (item.a2a_endpoint || item.mcp_server || item.health_status) return false;
  const protocols = (item.supported_protocols ?? []).map((p) => p.toLowerCase());
  return protocols.includes('a2a') || protocols.includes('mcp');
}

export function mergeDetailIntoListItem(
  item: Scan8004ListItem,
  detail: Scan8004AgentDetail | null,
): Scan8004ListItem {
  if (!detail) return item;

  const protocols =
    item.supported_protocols?.length
      ? item.supported_protocols
      : detail.supported_protocols;

  return {
    ...item,
    supported_protocols: protocols,
    a2a_endpoint: detail.a2a_endpoint ?? item.a2a_endpoint,
    mcp_server: detail.mcp_server ?? item.mcp_server,
    agent_url: detail.agent_url ?? item.agent_url,
    services: detail.services ?? item.services,
    health_status: detail.health_status ?? item.health_status,
    health_checked_at: detail.health_checked_at ?? item.health_checked_at,
  };
}
