/** Same-origin Next BFF paths (NEXT_PUBLIC_BFF_*). Nest URLs live in NEXT_PUBLIC_MARKETPLACE_API / HIRE / X402_SETTLE. */

/** Next inlines only literal process.env.NEXT_PUBLIC_* — not process.env[name]. */
function requirePublicPath(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing ${name} in env`);
  }
  return trimmed.replace(/\/$/, "") || trimmed;
}

function join(base: string, ...parts: string[]): string {
  const root = base.replace(/\/$/, "");
  const rest = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return rest ? `${root}/${rest}` : root;
}

export function marketplaceApiBase(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_BFF_MARKETPLACE,
    "NEXT_PUBLIC_BFF_MARKETPLACE",
  );
}

export function hireApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_BFF_HIRE,
    "NEXT_PUBLIC_BFF_HIRE",
  );
}

export function x402SettleApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_BFF_X402_SETTLE,
    "NEXT_PUBLIC_BFF_X402_SETTLE",
  );
}

export function agentCardApiBase(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_AGENT_CARD_API,
    "NEXT_PUBLIC_AGENT_CARD_API",
  );
}

export function agentYieldApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_AGENT_YIELD_API,
    "NEXT_PUBLIC_AGENT_YIELD_API",
  );
}

export function agentRebalanceApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_AGENT_REBALANCE_API,
    "NEXT_PUBLIC_AGENT_REBALANCE_API",
  );
}

export function agentGridApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_AGENT_GRID_API,
    "NEXT_PUBLIC_AGENT_GRID_API",
  );
}

export function agentHealthApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_AGENT_HEALTH_API,
    "NEXT_PUBLIC_AGENT_HEALTH_API",
  );
}

export function agent8183SubmitApiPath(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_AGENT_8183_SUBMIT_API,
    "NEXT_PUBLIC_AGENT_8183_SUBMIT_API",
  );
}

export function merchantCardApiBase(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_MERCHANT_CARD_API,
    "NEXT_PUBLIC_MERCHANT_CARD_API",
  );
}

export function merchantCardPath(agentId: string): string {
  return join(merchantCardApiBase(), encodeURIComponent(agentId));
}

export function merchantApiBase(): string {
  return requirePublicPath(
    process.env.NEXT_PUBLIC_MERCHANT_API,
    "NEXT_PUBLIC_MERCHANT_API",
  );
}

export function merchantApiPath(search = ""): string {
  const url = merchantApiBase();
  if (!search) return url;
  return `${url}${search.startsWith("?") ? search : `?${search}`}`;
}

export function marketplaceAgentsPath(search = ""): string {
  const url = join(marketplaceApiBase(), "agents");
  if (!search) return url;
  return `${url}${search.startsWith("?") ? search : `?${search}`}`;
}

export function marketplaceAgentPath(id: string, suffix = ""): string {
  return `${join(marketplaceApiBase(), "agents", encodeURIComponent(id))}${suffix}`;
}

export function hireApiPathWithSeller(agentId: string): string {
  return `${hireApiPath()}?seller=${encodeURIComponent(agentId)}`;
}

export function agentCardPath(agentId: string): string {
  return join(agentCardApiBase(), encodeURIComponent(agentId));
}
