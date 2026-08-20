import { useAccount, useWalletClient } from "wagmi";

export function useWalletReady() {
  const { address: account, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  return {
    walletClient: walletClient ?? null,
    account: account ?? null,
    chainId: chainId ?? null,
    isConnected,
  };
}
