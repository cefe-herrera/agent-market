import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  http,
  type Address,
  type PublicClient,
} from 'viem';
import { bscTestnet } from 'viem/chains';

const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as Address;
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as Address;

const reputationAbi = [
  {
    type: 'function',
    name: 'getClients',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getLastIndex',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
    ],
    outputs: [{ type: 'uint64' }],
  },
  {
    type: 'function',
    name: 'readFeedback',
    stateMutability: 'view',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'clientAddress', type: 'address' },
      { name: 'feedbackIndex', type: 'uint64' },
    ],
    outputs: [
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'isRevoked', type: 'bool' },
    ],
  },
] as const;

const identityAbi = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
] as const;

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
  private readonly client: PublicClient;

  constructor(config: ConfigService) {
    const rpc =
      config.get<string>('BSC_TESTNET_RPC') ??
      'https://bsc-testnet-rpc.publicnode.com';
    this.client = createPublicClient({
      chain: bscTestnet,
      transport: http(rpc),
    });
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

    const owner = await this.client.readContract({
      address: IDENTITY_REGISTRY,
      abi: identityAbi,
      functionName: 'ownerOf',
      args: [tokenId],
    }).catch(() => null);
    if (!owner) return null;

    const clients = await this.client.readContract({
      address: REPUTATION_REGISTRY,
      abi: reputationAbi,
      functionName: 'getClients',
      args: [tokenId],
    });

    const feedbacks: ReputationFeedback[] = [];
    for (const client of clients) {
      const last = await this.client.readContract({
        address: REPUTATION_REGISTRY,
        abi: reputationAbi,
        functionName: 'getLastIndex',
        args: [tokenId, client],
      });
      for (let i = 1n; i <= last; i++) {
        const row = await this.client.readContract({
          address: REPUTATION_REGISTRY,
          abi: reputationAbi,
          functionName: 'readFeedback',
          args: [tokenId, client, i],
        });
        feedbacks.push({
          client,
          index: Number(i),
          value: row[0].toString(),
          valueDecimals: row[1],
          tag1: row[2],
          tag2: row[3],
          isRevoked: row[4],
        });
      }
    }

    return {
      agentId: `97:${IDENTITY_REGISTRY.toLowerCase()}:${tokenId.toString()}`,
      tokenId: tokenId.toString(),
      owner,
      identityRegistry: IDENTITY_REGISTRY,
      reputationRegistry: REPUTATION_REGISTRY,
      clients: [...clients],
      feedbacks,
    };
  }
}
