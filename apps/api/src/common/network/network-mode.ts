export type NetworkMode = 'mainnet' | 'testnet';

export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;

export function parseNetworkMode(value?: string | null): NetworkMode {
  const normalized = (value ?? 'mainnet').trim().toLowerCase();
  if (normalized === '' || normalized === 'mainnet') return 'mainnet';
  if (normalized === 'testnet') return 'testnet';
  throw new Error(`Invalid NETWORK="${value}". Use mainnet or testnet.`);
}

export function bscChainId(mode: NetworkMode): number {
  return mode === 'testnet' ? BSC_TESTNET_CHAIN_ID : BSC_MAINNET_CHAIN_ID;
}
