export type VenusMarketQuote = {
  symbol: string;
  underlying: string;
  collateralFactor: number | null;
  liquidationThreshold: number | null;
  borrowApy: number | null;
  supplyApy: number | null;
  live: boolean;
};

export type HealthCardPayload = {
  agent_id: string;
  name: string;
  category: "Health Factor";
  standards: ["ERC-8183", "ERC-7579"];
  metrics: {
    healthFactor: string;
    distance: string;
    collateral: string;
    status: string;
  };
  action_trigger: "Batch Delever via ERC-7579";
  updatedAt: string;
  position: {
    collateralAsset: string;
    collateralAmount: number;
    collateralUsd: number;
    debtAsset: string;
    debtUsd: number;
    collateralFactor: number;
    healthFactor: number;
    liqPriceUsd: number;
    distancePct: number;
    simulated: true;
  };
  sources: {
    venus: { live: boolean; markets: VenusMarketQuote[] };
    coingecko: { live: boolean; bnbUsd: number | null };
  };
};
