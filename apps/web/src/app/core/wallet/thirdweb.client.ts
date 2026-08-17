import { createThirdwebClient } from 'thirdweb';
import { bsc, bscTestnet } from 'thirdweb/chains';
import { environment } from '../../../environments/environment';

export const thirdwebClient = createThirdwebClient({
  clientId: environment.thirdwebClientId,
});

/** BNB Smart Chain mainnet — default for AgentMarket */
export const defaultChain = bsc;

/** Available chains in the connect flow */
export const supportedChains = [bsc, bscTestnet];

export const appMetadata = {
  name: 'AgentMarket',
  url: 'http://localhost:4200',
  description: 'BNB Chain DeFi Agent Marketplace',
  logoUrl: 'http://localhost:4200/favicon.ico',
};
