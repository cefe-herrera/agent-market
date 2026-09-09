/**
 * Server Nest URLs from env (HTTP OK). Browser never fetches these — Next BFF does.
 */

function serverEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in env`);
  }
  return value.replace(/\/$/, "") || value;
}

export function joinUrl(base: string, ...parts: string[]): string {
  const root = base.replace(/\/$/, "");
  const rest = parts
    .map((part) => part.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
  return rest ? `${root}/${rest}` : root;
}

export function nestOrigin(): string {
  return serverEnv("NEST_API_URL");
}

/** Full Nest catalog URL, e.g. http://127.0.0.1:3000/api/v1/marketplace */
export function nestMarketplaceUrl(): string {
  return serverEnv("NEXT_PUBLIC_MARKETPLACE_API");
}

/** Full Nest settle URL, e.g. http://127.0.0.1:3000/api/v1/x402/settle */
export function nestX402SettleUrl(): string {
  return serverEnv("NEXT_PUBLIC_X402_SETTLE_API");
}

/** Full Nest hire URL, e.g. http://127.0.0.1:3000/api/v1/agent/resource */
export function nestAgentResourceUrl(): string {
  return serverEnv("NEXT_PUBLIC_HIRE_API");
}

export function nestUrl(base: string, extraPath = "", search = ""): string {
  const url = extraPath ? joinUrl(base, extraPath) : base.replace(/\/$/, "");
  const qs = !search
    ? ""
    : search.startsWith("?")
      ? search
      : `?${search}`;
  return `${url}${qs}`;
}

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  headers.set("accept", accept || "application/json");
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const agentId = request.headers.get("x-agent-id");
  if (agentId) headers.set("x-agent-id", agentId);
  const agentName = request.headers.get("x-agent-name");
  if (agentName) headers.set("x-agent-name", agentName);
  return headers;
}

function nestDown(err: unknown): Response {
  return Response.json(
    {
      success: false,
      error: `Cannot reach Nest at ${process.env.NEST_API_URL ?? process.env.NEXT_PUBLIC_MARKETPLACE_API ?? "(unset)"}`,
      details: err instanceof Error ? err.message : String(err),
    },
    { status: 502 },
  );
}

export async function fetchNestUrl(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, {
      cache: "no-store",
      ...init,
    });
  } catch (err) {
    return nestDown(err);
  }
}

export function unwrapNestPayload(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const rec = json as {
    statusCode?: unknown;
    message?: unknown;
  };
  if (typeof rec.statusCode !== "number" || !("message" in rec)) return json;
  if (rec.message && typeof rec.message === "object") return rec.message;
  if (typeof rec.message === "string") {
    return { success: false, error: rec.message };
  }
  return json;
}

export async function proxyToNest(
  targetUrl: string,
  request: Request,
  opts?: { search?: string },
): Promise<Response> {
  const search = opts?.search ?? new URL(request.url).search;
  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const url = nestUrl(targetUrl, "", search);

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers: forwardHeaders(request),
      body: hasBody && body && body.byteLength > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch (err) {
    return nestDown(err);
  }

  const { json, text } = await readNestJson(upstream);
  if (json !== null) {
    return Response.json(unwrapNestPayload(json), { status: upstream.status });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return new Response(text, {
    status: upstream.status,
    headers,
  });
}

export async function readNestJson(
  res: Response,
): Promise<{ json: unknown; text: string }> {
  const text = await res.text();
  if (!text) return { json: null, text: "" };
  try {
    return { json: JSON.parse(text) as unknown, text };
  } catch {
    return { json: null, text };
  }
}
