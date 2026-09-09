import type { Address } from "viem";

export type PublicMerchant = {
  agentId: string;
  chainId: number;
  tokenId: string | null;
  owner: Address;
  name: string;
  description: string;
  payTo: Address;
  provider8183: Address;
  sessionAddress: Address;
  a2a: string | null;
  cardUrl: string | null;
  createdAt: number;
};

export type LocalMerchant = PublicMerchant & {
  grantTx?: string | null;
};
