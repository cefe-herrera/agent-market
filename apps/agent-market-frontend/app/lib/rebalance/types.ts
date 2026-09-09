export type RebalanceAssetQuote = {
  id: string;
  symbol: string;
  name: string;
  usd: number;
  change24hPct: number | null;
  high24h: number | null;
  low24h: number | null;
  live: boolean;
};

export type RebalanceCardPayload = {
  agent_id: string;
  name: string;
  category: "Rebalancing";
  standards: ["ERC-8183", "ERC-7579"];
  metrics: {
    spot: string;
    change24h: string;
    driftBps: string;
    target: string;
    status: string;
  };
  action_trigger: "Batch Rebalance via ERC-7579";
  updatedAt: string;
  sleeve: {
    asset: string;
    quote: string;
    targetBps: number;
    impliedBps: number;
    driftBps: number;
    thresholdBps: number;
  };
  sources: {
    coingecko: { live: boolean; quotes: RebalanceAssetQuote[] };
  };
};
