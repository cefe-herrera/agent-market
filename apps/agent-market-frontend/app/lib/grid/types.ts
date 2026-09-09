export type AsterMarketQuote = {
  symbol: string;
  mark: number;
  index: number;
  lastFundingRate: number;
  nextFundingTime: number | null;
  high24h: number | null;
  low24h: number | null;
  change24hPct: number | null;
  live: boolean;
};

export type GridLevel = {
  index: number;
  price: number;
  side: "buy" | "sell" | "mid";
};

export type GridCardPayload = {
  agent_id: string;
  name: string;
  category: "Grid Trading";
  standards: ["ERC-8183", "ERC-7579"];
  metrics: {
    mark: string;
    funding: string;
    range: string;
    status: string;
  };
  action_trigger: "Batch Grid via ERC-7579";
  updatedAt: string;
  grid: {
    pair: string;
    levels: GridLevel[];
    low: number;
    high: number;
    mark: number;
    inRange: boolean;
    nextFill: "buy" | "sell" | "none";
  };
  sources: {
    aster: { live: boolean; quotes: AsterMarketQuote[] };
    coingecko: {
      live: boolean;
      spotUsd: number | null;
      high24h: number | null;
      low24h: number | null;
    };
  };
};
