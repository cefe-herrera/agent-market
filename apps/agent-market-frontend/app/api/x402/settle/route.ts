import { proxyToNest, nestX402SettleUrl } from "@/app/lib/nest-server";

export const maxDuration = 120;

export async function POST(request: Request) {
  return proxyToNest(nestX402SettleUrl(), request);
}
