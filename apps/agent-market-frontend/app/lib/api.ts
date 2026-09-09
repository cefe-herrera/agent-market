/** Nest API origin — frontend calls Nest only (indexer + facilitator live in Nest). */
export function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_PRODUCTION === "true";
}

export function apiOrigin(): string {
  if (isProduction()) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    if (!url) {
      throw new Error("Set NEXT_PUBLIC_API_URL when NEXT_PUBLIC_PRODUCTION=true");
    }
    return url.replace(/\/$/, "");
  }

  const host = process.env.NEXT_PUBLIC_API_HOST || "127.0.0.1";
  const port = process.env.NEXT_PUBLIC_API_PORT || "3000";
  return `http://${host}:${port}`;
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiOrigin()}${normalized}`;
}

/** Public v1 namespace on Nest. */
export function apiV1(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return apiUrl(`/api/v1${normalized}`);
}
