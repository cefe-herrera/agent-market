import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Address = `0x${string}`;

const REPUTATION_REGISTRY =
  '0x8004B663056A597Dffe9eCcC1965A193B7388713' as Address;
const IDENTITY_REGISTRY =
  '0x8004A818BFB912233c491871b3d84c89A494BD9e' as Address;

const SELECTOR = {
  ownerOf: '0x6352211e',
  getClients: '0x42dd519c',
  getLastIndex: '0xf2d81759',
  readFeedback: '0x232b0810',
} as const;

export type ReputationFeedback = {
  client: Address;
  index: number;
  value: string;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  isRevoked: boolean;
};

@Injectable()
export class Erc8004ReputationClient {
  private readonly rpc: string;

  constructor(config: ConfigService) {
    this.rpc =
      config.get<string>('BSC_TESTNET_RPC') ??
      'https://bsc-testnet-rpc.publicnode.com';
  }

  parseTokenId(id: string): bigint | null {
    if (/^\d+$/.test(id)) return BigInt(id);
    const parts = id.split(':');
    if (parts.length === 3 && /^\d+$/.test(parts[2])) return BigInt(parts[2]);
    const slug = id.match(/-(\d+)$/);
    if (slug) return BigInt(slug[1]);
    return null;
  }

  async getReputation(id: string): Promise<{
    agentId: string;
    tokenId: string;
    owner: Address;
    identityRegistry: Address;
    reputationRegistry: Address;
    clients: Address[];
    feedbacks: ReputationFeedback[];
  } | null> {
    const tokenId = this.parseTokenId(id);
    if (tokenId === null) return null;

    const ownerRaw = await this.call(
      IDENTITY_REGISTRY,
      SELECTOR.ownerOf,
      [encodeUint(tokenId)],
    ).catch(() => null);
    if (!ownerRaw) return null;
    const owner = decodeAddress(ownerRaw);

    const clients = decodeAddressArray(
      await this.call(REPUTATION_REGISTRY, SELECTOR.getClients, [
        encodeUint(tokenId),
      ]),
    );

    const feedbacks: ReputationFeedback[] = [];
    for (const client of clients) {
      const last = decodeUint(
        await this.call(REPUTATION_REGISTRY, SELECTOR.getLastIndex, [
          encodeUint(tokenId),
          encodeAddress(client),
        ]),
      );
      for (let i = 1n; i <= last; i++) {
        const row = decodeFeedback(
          await this.call(REPUTATION_REGISTRY, SELECTOR.readFeedback, [
            encodeUint(tokenId),
            encodeAddress(client),
            encodeUint(i),
          ]),
        );
        feedbacks.push({
          client,
          index: Number(i),
          ...row,
        });
      }
    }

    return {
      agentId: `97:${IDENTITY_REGISTRY.toLowerCase()}:${tokenId.toString()}`,
      tokenId: tokenId.toString(),
      owner,
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      clients,
      feedbacks,
    };
  }

  private async call(
    to: Address,
    selector: string,
    args: string[],
  ): Promise<string> {
    const data = selector + args.join('');
    const res = await fetch(this.rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to, data }, 'latest'],
      }),
    });
    const json = (await res.json()) as {
      result?: string;
      error?: { message?: string };
    };
    if (!json.result) {
      throw new Error(json.error?.message ?? 'eth_call failed');
    }
    return json.result;
  }
}

function encodeUint(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}

function encodeAddress(value: string): string {
  return value.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
}

function strip(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

function word(hex: string, index: number): string {
  const start = index * 64;
  return strip(hex).slice(start, start + 64);
}

function decodeUint(hex: string): bigint {
  return BigInt(`0x${word(hex, 0) || '0'}`);
}

function decodeAddress(hex: string, wordIndex = 0): Address {
  return `0x${word(hex, wordIndex).slice(24)}` as Address;
}

function decodeAddressArray(hex: string): Address[] {
  const body = strip(hex);
  const offset = Number(BigInt(`0x${body.slice(0, 64) || '0'}`));
  const length = Number(BigInt(`0x${body.slice(offset * 2, offset * 2 + 64) || '0'}`));
  const items: Address[] = [];
  const start = offset * 2 + 64;
  for (let i = 0; i < length; i++) {
    items.push(`0x${body.slice(start + i * 64 + 24, start + (i + 1) * 64)}` as Address);
  }
  return items;
}

function decodeFeedback(hex: string): Omit<ReputationFeedback, 'client' | 'index'> {
  const body = strip(hex);
  const value = BigInt(`0x${word(hex, 0)}`).toString();
  const valueDecimals = Number(BigInt(`0x${word(hex, 1)}`));
  const tag1Offset = Number(BigInt(`0x${word(hex, 2)}`));
  const tag2Offset = Number(BigInt(`0x${word(hex, 3)}`));
  const isRevoked = BigInt(`0x${word(hex, 4)}`) !== 0n;
  return {
    value,
    valueDecimals,
    tag1: decodeAbiString(body, tag1Offset),
    tag2: decodeAbiString(body, tag2Offset),
    isRevoked,
  };
}

function decodeAbiString(body: string, offsetBytes: number): string {
  const start = offsetBytes * 2;
  const length = Number(BigInt(`0x${body.slice(start, start + 64) || '0'}`));
  if (!length) return '';
  const data = body.slice(start + 64, start + 64 + length * 2);
  return Buffer.from(data, 'hex').toString('utf8');
}
