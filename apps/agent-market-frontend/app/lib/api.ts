export function isProduction(): boolean {
  return process.env.NEXT_PUBLIC_PRODUCTION === "true";
}
