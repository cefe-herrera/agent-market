import { http, type Chain } from "viem";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { getErc8183 } from "@/app/lib/erc8183/addresses";
import {
  ENTRY_POINT_V07,
  pimlicoBundlerUrl,
  pimlicoSponsor,
} from "./addresses";

const clients = new Map<number, ReturnType<typeof createPimlicoClient>>();

export function pimlicoClient(chainId?: number) {
  const cfg = getErc8183(chainId);
  const cached = clients.get(cfg.chainId);
  if (cached) return cached;
  const client = createPimlicoClient({
    transport: http(pimlicoBundlerUrl(cfg.chainId)),
    entryPoint: {
      address: ENTRY_POINT_V07,
      version: "0.7",
    },
  });
  clients.set(cfg.chainId, client);
  return client;
}

export async function pimlicoFastGas(chainId?: number) {
  return (await pimlicoClient(chainId).getUserOperationGasPrice()).fast;
}

export function paymasterForClient(chainId?: number) {
  return pimlicoSponsor() ? pimlicoClient(chainId) : undefined;
}

export function bundlerTransport(chainId?: number) {
  return http(pimlicoBundlerUrl(chainId));
}

export function aaChain(chainId?: number): Chain {
  return getErc8183(chainId).chain;
}
