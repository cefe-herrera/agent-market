import { AgentCategory, RiskLevel } from '@bnb-marketplace/shared-types';

export function riskBadgeClass(risk: RiskLevel | string): string {
  const map: Record<string, string> = {
    LOW: 'badge-green',
    MEDIUM: 'badge-yellow',
    HIGH: 'badge-red',
    VERY_HIGH: 'badge-red',
  };
  return map[risk] ?? 'badge-gray';
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green',
    PAUSED: 'badge-yellow',
    PENDING: 'badge-gray',
    REVOKED: 'badge-red',
    COMPLETED: 'badge-gray',
    FAILED: 'badge-red',
  };
  return map[status] ?? 'badge-gray';
}

export function formatCurrency(value: number, locale = 'en-US'): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`;
  if (value >= 1_000) return `$${(value / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 })}K`;
  return `$${value.toLocaleString(locale, { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number, locale = 'en-US'): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatNumber(value: number, locale = 'en-US', decimals = 0): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function categorySlug(category: AgentCategory | string): string {
  const map: Record<string, string> = {
    REBALANCING: 'rebalancing',
    GRID_TRADING: 'grid-trading',
    YIELD_OPTIMISATION: 'yield',
    HEALTH_FACTOR_MONITORING: 'health-factor',
  };
  return map[category] ?? '';
}

export function categoryFromSlug(slug: string): AgentCategory | undefined {
  const map: Record<string, AgentCategory> = {
    rebalancing: AgentCategory.REBALANCING,
    'grid-trading': AgentCategory.GRID_TRADING,
    yield: AgentCategory.YIELD_OPTIMISATION,
    'health-factor': AgentCategory.HEALTH_FACTOR_MONITORING,
  };
  return map[slug];
}
