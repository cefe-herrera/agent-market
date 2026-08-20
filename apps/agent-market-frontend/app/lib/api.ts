/** Nest indexer origin. Flip NEXT_PUBLIC_PRODUCTION when endpoints go live. */
export function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_PRODUCTION === "true";
}

export function apiOrigin(): string {
  if (isProduction()) {
    const url =
      process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_INDEXER_URL;
    if (!url) {
      throw new Error(
        "Set NEXT_PUBLIC_API_URL when NEXT_PUBLIC_PRODUCTION=true",
      );
    }
    return url.replace(/\/$/, "");
  }

  const host = process.env.NEXT_PUBLIC_API_HOST || "127.0.0.1";
  const port =
    process.env.NEXT_PUBLIC_API_PORT || process.env.API_PORT || "3005";
  return `http://${host}:${port}`;
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${apiOrigin()}${normalized}`;
}
