import type { A2aHealthDto } from '@bnb-marketplace/shared-types';

export type A2aHealthStatus = A2aHealthDto['status'];

export function emptyA2aHealth(
  endpoint: string | null,
  status: A2aHealthStatus,
  extra?: Partial<A2aHealthDto>,
): A2aHealthDto {
  return {
    endpoint,
    healthy: status === 'healthy',
    status,
    latencyMs: extra?.latencyMs ?? null,
    checkedAt: extra?.checkedAt ?? new Date().toISOString(),
    error: extra?.error ?? null,
    skills: extra?.skills ?? [],
    x402Support: extra?.x402Support ?? null,
    name: extra?.name ?? null,
    description: extra?.description ?? null,
  };
}

export function parseAgentCard(json: unknown): Pick<
  A2aHealthDto,
  'skills' | 'x402Support' | 'name' | 'description'
> {
  if (!json || typeof json !== 'object') {
    return { skills: [], x402Support: null, name: null, description: null };
  }

  const card = json as Record<string, unknown>;
  const skillsRaw = Array.isArray(card.skills) ? card.skills : [];
  const skills = skillsRaw
    .map((skill) => {
      if (typeof skill === 'string') return skill;
      if (skill && typeof skill === 'object' && 'name' in skill) {
        const name = (skill as { name?: unknown }).name;
        return typeof name === 'string' ? name : null;
      }
      if (skill && typeof skill === 'object' && 'id' in skill) {
        const id = (skill as { id?: unknown }).id;
        return typeof id === 'string' ? id : null;
      }
      return null;
    })
    .filter((name): name is string => Boolean(name));

  const x402 =
    typeof card.x402Support === 'boolean'
      ? card.x402Support
      : typeof card.x402_supported === 'boolean'
        ? card.x402_supported
        : null;

  return {
    skills,
    x402Support: x402,
    name: typeof card.name === 'string' ? card.name : null,
    description: typeof card.description === 'string' ? card.description : null,
  };
}

export function isAgentCardPayload(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const card = json as Record<string, unknown>;
  return (
    typeof card.name === 'string' ||
    Array.isArray(card.skills) ||
    typeof card.url === 'string' ||
    typeof card.protocolVersion === 'string' ||
    Array.isArray(card.capabilities)
  );
}

export function a2aMetrics(health: A2aHealthDto): Record<string, unknown> {
  return {
    a2aEndpoint: health.endpoint,
    a2aHealthy: health.healthy,
    a2aStatus: health.status,
    a2aLatencyMs: health.latencyMs,
    a2aCheckedAt: health.checkedAt,
    a2aError: health.error,
    a2aSkills: health.skills,
    a2aX402Support: health.x402Support,
    a2aName: health.name,
  };
}
