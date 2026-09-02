export type AgentCardSnapshot = {
  name: string | null;
  description: string | null;
  endpoint: string | null;
  skills: string[];
  priceLabel: string | null;
  x402: boolean;
  authRequired: boolean;
};

export type AgentCardSchemaResult = {
  valid: boolean;
  errors: string[];
  card: AgentCardSnapshot;
};

const HTTP = /^https?:\/\//i;

export function isHttpUrl(value: string | null | undefined): boolean {
  return Boolean(value && HTTP.test(value.trim()));
}

export function validateAgentCard(
  json: unknown,
  fetchedFrom?: string | null,
  options?: { requirePricing?: boolean },
): AgentCardSchemaResult {
  const card = emptySnapshot(fetchedFrom ?? null);
  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['Agent Card is not JSON'], card };
  }

  const raw = json as Record<string, unknown>;
  const errors: string[] = [];

  card.name = stringField(raw.name);
  card.description = stringField(raw.description);
  card.endpoint = stringField(raw.url) ?? fetchedFrom ?? null;
  card.skills = extractSkills(raw);
  card.priceLabel = extractPriceLabel(raw);
  card.x402 = hasX402Flag(raw);
  card.authRequired = hasAuthScheme(raw);

  if (!card.name) errors.push('missing name');
  if (!isHttpUrl(card.endpoint)) errors.push('missing endpoint url');
  if (!hasCapabilities(raw, card.skills)) errors.push('missing capabilities/skills');
  if (options?.requirePricing !== false && !hasDeclaredPricing(raw, card)) {
    errors.push('missing declared pricing');
  }

  return { valid: errors.length === 0, errors, card };
}

export function isCoherentLiveResponse(
  json: unknown,
  declared: AgentCardSnapshot,
): { ok: boolean; error: string | null } {
  if (!json || typeof json !== 'object') {
    return { ok: false, error: 'live response is not JSON' };
  }

  const live = validateAgentCard(json, declared.endpoint, { requirePricing: false });
  if (live.valid) {
    if (namesAlign(declared.name, live.card.name)) return { ok: true, error: null };
    if (skillsOverlap(declared.skills, live.card.skills)) return { ok: true, error: null };
    if (declared.priceLabel && live.card.priceLabel === declared.priceLabel) {
      return { ok: true, error: null };
    }
    return { ok: false, error: 'live Agent Card does not match declared card' };
  }

  const raw = json as Record<string, unknown>;
  if (raw.jsonrpc === '2.0') {
    if (raw.error && typeof raw.error === 'object') {
      return { ok: true, error: null };
    }
    if (raw.result !== undefined) {
      if (raw.result && typeof raw.result === 'object' && !Array.isArray(raw.result)) {
        const nested = isCoherentLiveResponse(raw.result, declared);
        if (nested.ok) return nested;
      }
      return { ok: true, error: null };
    }
  }

  if (Array.isArray(raw.skills) || Array.isArray(raw.services)) {
    const skills = extractSkills(raw);
    if (skillsOverlap(declared.skills, skills)) return { ok: true, error: null };
    if (extractPriceLabel(raw) && hasDeclaredPricing(raw, declared)) {
      return { ok: true, error: null };
    }
  }

  return { ok: false, error: live.errors[0] ?? 'live response is not coherent with Agent Card' };
}

export function a2aJsonRpcPing(): Record<string, unknown> {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'agent/getAuthenticatedExtendedCard',
    params: {},
  };
}

export function agentCardCandidateUrls(endpoint: string): string[] {
  const trimmed = endpoint.trim();
  const urls = [trimmed];
  try {
    const wellKnown = new URL('/.well-known/agent-card.json', new URL(trimmed).origin).href;
    if (!urls.includes(wellKnown)) urls.push(wellKnown);
  } catch {
    /* ignore invalid URL */
  }
  return urls;
}

export function evaluateLiveProbe(input: {
  status: number;
  json: unknown;
  declared: AgentCardSnapshot;
}): { ok: boolean; error: string | null } {
  const { status, json, declared } = input;
  if (status === 401 || status === 403) {
    if (declared.authRequired) return { ok: true, error: null };
    return { ok: false, error: `HTTP ${status} without declared auth` };
  }
  if (status === 402) {
    if (declared.x402) return { ok: true, error: null };
    return { ok: false, error: 'HTTP 402 without declared x402' };
  }
  if (status >= 200 && status < 300) {
    if (json != null) return isCoherentLiveResponse(json, declared);
    return { ok: false, error: 'live response is not JSON' };
  }
  return { ok: false, error: status ? `HTTP ${status}` : 'live probe failed' };
}

function emptySnapshot(endpoint: string | null): AgentCardSnapshot {
  return {
    name: null,
    description: null,
    endpoint,
    skills: [],
    priceLabel: null,
    x402: false,
    authRequired: false,
  };
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function extractSkills(raw: Record<string, unknown>): string[] {
  const skillsRaw = Array.isArray(raw.skills) ? raw.skills : [];
  return skillsRaw
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
}

function extractPriceLabel(raw: Record<string, unknown>): string | null {
  const services = raw.services;
  if (!Array.isArray(services)) return null;
  const labels = [
    ...new Set(
      services
        .map((service) => {
          if (!service || typeof service !== 'object') return null;
          const row = service as { price_display?: unknown };
          return typeof row.price_display === 'string' && row.price_display.trim()
            ? row.price_display.trim()
            : null;
        })
        .filter((label): label is string => Boolean(label)),
    ),
  ];
  if (labels.length === 1) return labels[0];
  if (labels.length > 1) return labels.join(' · ');
  return null;
}

function hasX402Flag(raw: Record<string, unknown>): boolean {
  if (raw.x402Support === true || raw.x402_supported === true) return true;
  const capabilities = raw.capabilities;
  if (capabilities && typeof capabilities === 'object') {
    const caps = capabilities as { extensions?: unknown; x402?: unknown };
    if (caps.x402 === true) return true;
    if (Array.isArray(caps.extensions)) {
      return caps.extensions.some((ext) => String(ext).toLowerCase().includes('x402'));
    }
  }
  return false;
}

function hasDeclaredPricing(raw: Record<string, unknown>, card: AgentCardSnapshot): boolean {
  if (card.x402 || card.priceLabel) return true;
  const services = raw.services;
  if (Array.isArray(services)) {
    const priced = services.some((service) => {
      if (!service || typeof service !== 'object') return false;
      const row = service as { price?: unknown; price_display?: unknown };
      return row.price != null || Boolean(row.price_display);
    });
    if (priced) return true;
  }

  const commercial = /x402|paid|quote|negotiat|credit|hire|price/;
  if (card.skills.some((skill) => commercial.test(skill.toLowerCase()))) return true;

  const skillsRaw = Array.isArray(raw.skills) ? raw.skills : [];
  if (
    skillsRaw.some((skill) => {
      if (!skill || typeof skill !== 'object') return false;
      const row = skill as { tags?: unknown; id?: unknown; name?: unknown };
      const tags = Array.isArray(row.tags) ? row.tags.map((tag) => String(tag).toLowerCase()) : [];
      const blob = `${row.id ?? ''} ${row.name ?? ''} ${tags.join(' ')}`.toLowerCase();
      return commercial.test(blob);
    })
  ) {
    return true;
  }

  if (hasAuthScheme(raw)) return true;
  return false;
}

function hasAuthScheme(raw: Record<string, unknown>): boolean {
  return Boolean(raw.securitySchemes && typeof raw.securitySchemes === 'object');
}

function hasCapabilities(raw: Record<string, unknown>, skills: string[]): boolean {
  if (skills.length > 0) return true;
  if (Array.isArray(raw.services) && raw.services.length > 0) return true;
  if (raw.capabilities && typeof raw.capabilities === 'object') return true;
  return false;
}

function namesAlign(declared: string | null, live: string | null): boolean {
  if (!declared || !live) return false;
  const a = declared.toLowerCase();
  const b = live.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

function skillsOverlap(left: string[], right: string[]): boolean {
  if (!left.length || !right.length) return false;
  const b = new Set(right.map((s) => s.toLowerCase()));
  return left.some((s) => b.has(s.toLowerCase()));
}
