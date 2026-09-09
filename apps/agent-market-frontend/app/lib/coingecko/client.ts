import "server-only";

const DEMO_BASE = "https://api.coingecko.com/api/v3";
const PRO_BASE = "https://pro-api.coingecko.com/api/v3";

export function coinGeckoApiKey(): string {
  return process.env.COINGECKO_API_KEY?.trim() || "";
}

export function isCoinGeckoConfigured(): boolean {
  return coinGeckoApiKey().length > 0;
}

function geckoPlan(): "demo" | "pro" {
  const forced = process.env.COINGECKO_API_PLAN?.trim().toLowerCase();
  if (forced === "pro" || forced === "demo") return forced;
  const key = coinGeckoApiKey();
  return key.startsWith("CG-") ? "demo" : "pro";
}

export function coinGeckoBase(): string {
  const explicit = process.env.COINGECKO_API_BASE?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  return geckoPlan() === "pro" ? PRO_BASE : DEMO_BASE;
}

function authHeader(): { name: string; value: string } | null {
  const key = coinGeckoApiKey();
  if (!key) return null;
  const name =
    geckoPlan() === "pro" ? "x-cg-pro-api-key" : "x-cg-demo-api-key";
  return { name, value: key };
}

export async function coinGeckoGet<T>(path: string): Promise<T> {
  const auth = authHeader();
  if (!auth) {
    throw new Error("COINGECKO_API_KEY missing — server only, never NEXT_PUBLIC_.");
  }
  const url = `${coinGeckoBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      [auth.name]: auth.value,
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
