import { bscChainId, parseNetworkMode } from '../src/common/network/network-mode';

describe('parseNetworkMode', () => {
  it('defaults to mainnet', () => {
    expect(parseNetworkMode(undefined)).toBe('mainnet');
    expect(parseNetworkMode('')).toBe('mainnet');
    expect(parseNetworkMode('MAINNET')).toBe('mainnet');
  });

  it('accepts testnet', () => {
    expect(parseNetworkMode('testnet')).toBe('testnet');
    expect(parseNetworkMode(' Testnet ')).toBe('testnet');
  });

  it('rejects unknown values', () => {
    expect(() => parseNetworkMode('devnet')).toThrow(/Invalid NETWORK/);
  });
});

describe('bscChainId', () => {
  it('maps mainnet to 56 and testnet to 97', () => {
    expect(bscChainId('mainnet')).toBe(56);
    expect(bscChainId('testnet')).toBe(97);
  });
});
