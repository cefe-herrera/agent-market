export type YieldVenueQuote = {
  venue: string;
  symbol: string;
  apy: number;
  source: "venus" | "pancake-v3" | "lista";
  live: boolean;
  volumeUsd24h?: number;
  tvlUsd?: number;
};

export type YieldCardPayload = {
  agent_id: string;
  name: string;
  category: "Yield Optimisation";
  standards: ["ERC-8183", "ERC-7579"];
  metrics: {
    current_strategy: string;
    current_apy: string;
    target_strategy: string;
    target_apr: string;
    status: string;
  };
  action_trigger: "Batch Optimize via ERC-7579";
  updatedAt: string;
  sources: {
    venus: { live: boolean; quotes: YieldVenueQuote[] };
    pancake: { live: boolean; quotes: YieldVenueQuote[] };
    lista: { live: boolean; quotes: YieldVenueQuote[] };
  };
};
