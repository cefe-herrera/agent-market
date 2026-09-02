export type NetworkMode = "mainnet" | "testnet";

export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;

export function parseNetworkMode(value?: string | null): NetworkMode {
  const normalized = (value ?? "mainnet").trim().toLowerCase();
  if (normalized === "" || normalized === "mainnet") return "mainnet";
  if (normalized === "testnet") return "testnet";
  throw new Error(`Invalid NETWORK="${value}". Use mainnet or testnet.`);
}

/** Nest + Next share this flag. `NEXT_PUBLIC_NETWORK` is required in client components. */
export function frontendNetworkMode(): NetworkMode {
  return parseNetworkMode(
    process.env.NEXT_PUBLIC_NETWORK ?? process.env.NETWORK,
  );
}

export function isTestnetNetwork(mode: NetworkMode = frontendNetworkMode()): boolean {
  return mode === "testnet";
}

export function frontendBscChainId(mode: NetworkMode = frontendNetworkMode()): number {
  return mode === "testnet" ? BSC_TESTNET_CHAIN_ID : BSC_MAINNET_CHAIN_ID;
}
