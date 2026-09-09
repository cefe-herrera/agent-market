import { getAddress, isAddress, type Address } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { frontendBscChainId } from "@/app/lib/network";

/** Canonical Safe7579 + Rhinestone addresses (see ../safe7579/script/DeployAccount.s.sol). */
export const ENTRY_POINT_V07 = entryPoint07Address;
export const SAFE_7579_ADAPTER =
  "0x7579EE8307284F293B1927136486880611F20002" as Address;
export const ERC7579_LAUNCHPAD =
  "0x7579011aB74c46090561ea277Ba79D510c6C00ff" as Address;
export const RHINESTONE_ATTESTER =
  "0x000000333034E9f539ce08819E12c1b8Cb29084d" as Address;

/** One Safe per owner EOA. Changing this mints a different counterfactual address. */
export const BUYER_SAFE_SALT_NONCE = BigInt(0);
export const AGENT_SAFE_SALT_NONCE = BigInt(1);

export type PimlicoNetwork = "binance" | "binance-testnet";

export function pimlicoNetwork(chainId?: number): PimlicoNetwork {
  const id = chainId ?? frontendBscChainId();
  if (id === 56) return "binance";
  if (id === 97) return "binance-testnet";
  throw new Error(`Pimlico slug only for BSC 56/97, got ${id}`);
}

export function pimlicoApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ||
    process.env.PIMLICO_API_KEY?.trim() ||
    ""
  );
}

export function pimlicoSponsor(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_PIMLICO_SPONSOR ??
    process.env.PIMLICO_SPONSOR ??
    "false";
  return raw === "true" || raw === "1";
}

export function pimlicoBundlerUrl(chainId?: number): string {
  const key = pimlicoApiKey();
  if (!key) {
    throw new Error(
      "Falta PIMLICO_API_KEY o NEXT_PUBLIC_PIMLICO_API_KEY para el bundler.",
    );
  }
  return `https://api.pimlico.io/v2/${pimlicoNetwork(chainId)}/rpc?apikey=${key}`;
}

export function isPimlicoConfigured(): boolean {
  return pimlicoApiKey().length > 0;
}

/**
 * Worker / demo only. Hire 8183 reads `erc8183.provider` from the listing
 * (Agent Card or /sell merchant), not this env.
 */
export function agentSafeProvider(): Address | null {
  const raw =
    process.env.NEXT_PUBLIC_AGENT_SAFE_ADDRESS?.trim() ||
    process.env.AGENT_SAFE_ADDRESS?.trim() ||
    "";
  if (!raw || !isAddress(raw)) return null;
  return getAddress(raw);
}

export function agentSessionAddress(): Address | null {
  const raw = process.env.NEXT_PUBLIC_AGENT_SESSION_ADDRESS?.trim() || "";
  if (!raw || !isAddress(raw)) return null;
  return getAddress(raw);
}
