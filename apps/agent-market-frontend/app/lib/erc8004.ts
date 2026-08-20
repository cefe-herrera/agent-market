import { getAddress, type Address } from "viem";

export const BSC_TESTNET_CHAIN_ID = 97;

export const IDENTITY_REGISTRY = getAddress(
  "0x8004A818BFB912233c491871b3d84c89A494BD9e",
);
export const REPUTATION_REGISTRY = getAddress(
  "0x8004B663056A597Dffe9eCcC1965A193B7388713",
);

export const reputationAbi = [
  {
    type: "function",
    name: "giveFeedback",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getClients",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "getLastIndex",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
    ],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "readFeedback",
    stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint64" },
    ],
    outputs: [
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "isRevoked", type: "bool" },
    ],
  },
] as const;

export const identityAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

export function agentCaip(tokenId: number): string {
  return `${BSC_TESTNET_CHAIN_ID}:${IDENTITY_REGISTRY.toLowerCase()}:${tokenId}`;
}

export function parseTokenId(agentId: string | null | undefined): number {
  if (!agentId) return 0;
  if (/^\d+$/.test(agentId)) return Number(agentId);
  const parts = agentId.split(":");
  if (parts.length === 3 && /^\d+$/.test(parts[2])) return Number(parts[2]);
  return 0;
}

export function isSameAddress(
  a?: Address | string | null,
  b?: Address | string | null,
) {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}
