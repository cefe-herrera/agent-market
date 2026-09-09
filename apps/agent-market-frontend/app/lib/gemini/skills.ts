export type PromptSkill = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  /** Same text Gemini sees. Not a tool call — skill-as-prompt. */
  prompt: string;
};

export const YIELD_SKILLS: PromptSkill[] = [
  {
    id: "venus_supply_apy",
    name: "Venus supply APY",
    description:
      "Lee Supply APY de stables core en Venus (USDT, USDC, $U) vía api.venus.io.",
    tags: ["venus", "lending", "bsc"],
    prompt:
      "Use Venus core-pool Supply APY from the live snapshot. Prefer vUSDT / vUSDC / vU. Do not invent isolated-pool APYs that are not in the snapshot.",
  },
  {
    id: "pancake_v3_volume_apr",
    name: "Pancake V3 fee APR",
    description:
      "Estima APR de LPs PancakeSwap V3 (GeckoTerminal) como volume24h × fee / TVL × 365. Solo pares blue-chip.",
    tags: ["pancakeswap", "geckoterminal", "lp"],
    prompt:
      "PancakeSwap V3 APR is a volume×fee/TVL estimate, not guaranteed LP return. Only use blue-chip pools from the snapshot (USDT/WBNB, USDC/WBNB, USDT/USDC). Label it as estimated.",
  },
  {
    id: "lista_staking_band",
    name: "Lista staking band",
    description:
      "Banda simulada 7–11% para slisBNB / colateral Lista. No es lectura on-chain.",
    tags: ["lista", "simulated"],
    prompt:
      "Lista slisBNB is a simulated 7–11% band in the snapshot. Treat it as a satellite sleeve, never as an executed stake, and say it is simulated.",
  },
  {
    id: "allocate_advisory",
    name: "Advisory allocation",
    description:
      "Arma un JSON de ruteo (pesos en bps) sin mover fondos. executed=false.",
    tags: ["gemini", "advisory", "x402"],
    prompt:
      "Return an advisory allocation only. executed must be false. Weights sum to 10000 bps. Cite which skill ids you used. Do not claim a 7579 batch ran.",
  },
];

export const REBALANCE_SKILLS: PromptSkill[] = [
  {
    id: "coingecko_spot",
    name: "CoinGecko spot",
    description:
      "Precio USD live (BNB, CAKE, USDT, USDC, BTC) vía CoinGecko. Fuente de verdad para el sleeve.",
    tags: ["coingecko", "price", "bsc"],
    prompt:
      "Use CoinGecko spot USD from the live snapshot only. Do not invent prices. Prefer BNB and USDT for the core sleeve; CAKE is satellite; BTC is a reference, not a sleeve asset.",
  },
  {
    id: "coingecko_24h_drift",
    name: "24h drift",
    description:
      "price_change_percentage_24h de CoinGecko. Si |move| empuja el peso fuera de ±300 bps del target, hay que rebalancear.",
    tags: ["coingecko", "drift", "rebalance"],
    prompt:
      "Treat 24h % as inventory drift on a 50/50 BNB/USDT sleeve. If implied BNB weight drifts more than 300 bps from 5000, propose a rebalance. Cite the snapshot percentages.",
  },
  {
    id: "lp_range_band",
    name: "LP range band",
    description:
      "high/low 24h de CoinGecko como estrés de rango para un LP BNB/USDT. Advisory, no es tick on-chain.",
    tags: ["coingecko", "lp", "range"],
    prompt:
      "Use 24h high/low as a proxy for whether a concentrated BNB/USDT LP would still be in a ±5% band around spot. If spot is near the high/low edge, say the range is stressed. Label it as a CoinGecko proxy, not a Pancake tick.",
  },
  {
    id: "rebalance_advisory",
    name: "Advisory rebalance",
    description:
      "Propone trades (sell/buy BNB vs USDT) en bps sin mover fondos. executed=false.",
    tags: ["gemini", "advisory", "x402"],
    prompt:
      "Return an advisory rebalance only. executed must be false. Target weights sum to 10000 bps. Cite used skill ids. Do not claim a 7579 batch ran or that an LP was recentered on-chain.",
  },
];

export const GRID_SKILLS: PromptSkill[] = [
  {
    id: "aster_mark_funding",
    name: "Aster mark / funding",
    description:
      "Mark, index y funding 8h de Aster DEX (fapi.asterdex.com) para BNBUSDT / BTCUSDT. Perps nativos de BNB Chain.",
    tags: ["aster", "perps", "bsc"],
    prompt:
      "Use Aster DEX markPrice, indexPrice and lastFundingRate from the live snapshot. Do not invent funding. Aster is the BSC perpetual venue — not GMX. If sources.aster.live is false, say the perps feed is fallback.",
  },
  {
    id: "coingecko_spot_grid",
    name: "CoinGecko spot grid",
    description:
      "Spot USD y high/low 24h de CoinGecko para anclar las bandas del grid BNB.",
    tags: ["coingecko", "grid", "bsc"],
    prompt:
      "Use CoinGecko BNB spot and 24h high/low as the cash-market anchor for grid bands. If Aster mark diverges from CoinGecko spot, note basis — do not invent a third price.",
  },
  {
    id: "grid_band_levels",
    name: "Grid band levels",
    description:
      "Niveles equiespaciados entre el low y high 24h. Status in-range vs fill pending.",
    tags: ["grid", "levels", "advisory"],
    prompt:
      "Treat snapshot.grid.levels as the live grid. If mark is inside the band, action=hold. If mark is below the lowest level, next fill is a buy/long. If above the highest, next fill is a sell/short. Do not place Aster orders.",
  },
  {
    id: "grid_advisory",
    name: "Advisory grid",
    description:
      "Propone long/short o hold en el grid Aster sin ejecutar. executed=false.",
    tags: ["gemini", "advisory", "x402"],
    prompt:
      "Return an advisory grid only. executed must be false. Cite used skill ids. Do not claim an Aster order, GMX position, or 7579 batch ran.",
  },
];

export const HEALTH_SKILLS: PromptSkill[] = [
  {
    id: "venus_collateral_factor",
    name: "Venus collateral factor",
    description:
      "Lee collateral factor / liquidation threshold y borrow APY de vBNB / vUSDT en api.venus.io (core pool).",
    tags: ["venus", "lending", "bsc"],
    prompt:
      "Use Venus core-pool collateralFactor and liquidationThreshold from the snapshot. Prefer vBNB collateral and vUSDT debt. Do not invent isolated-pool CFs that are not in the snapshot.",
  },
  {
    id: "coingecko_collateral_px",
    name: "CoinGecko collateral",
    description:
      "Precio USD de BNB vía CoinGecko para valorar el colateral del sleeve simulado.",
    tags: ["coingecko", "collateral", "bsc"],
    prompt:
      "Value BNB collateral with CoinGecko spot USD from the snapshot. If sources.coingecko.live is false, say the price is fallback. Do not use Aster mark for loan health.",
  },
  {
    id: "health_factor_formula",
    name: "Health factor",
    description:
      "HF = (collateralUsd × CF) / debtUsd. Distancia a liquidación y precio de liq.",
    tags: ["health-factor", "liquidation"],
    prompt:
      "Compute health factor from snapshot.position. HF >= 2 is safe, 1.5–2 is watch, < 1.5 is danger. Cite liqPriceUsd and distancePct. This is a simulated sleeve, not a wallet read.",
  },
  {
    id: "health_advisory",
    name: "Advisory delever",
    description:
      "Propone repay / add collateral en bps sin mover fondos. executed=false.",
    tags: ["gemini", "advisory", "x402"],
    prompt:
      "Return an advisory loan action only. executed must be false. If HF is below 1.5, propose repay USDT or add BNB. Cite used skill ids. Do not claim a Venus repay or 7579 batch ran.",
  },
];

export function skillIds(skills: PromptSkill[] = YIELD_SKILLS): string[] {
  return skills.map((skill) => skill.id);
}

export function formatSkillsForPrompt(skills: PromptSkill[] = YIELD_SKILLS): string {
  const lines = [
    "Declared Agent Card skills. You do not have tools — follow each skill prompt. Cite used skill ids in usedSkills[].",
    ...skills.map(
      (skill) =>
        `- ${skill.id} (${skill.name}): ${skill.prompt}`,
    ),
  ];
  return lines.join("\n");
}

export function skillsForKind(
  kind: "yield" | "rebalance" | "grid" | "health" | null,
): PromptSkill[] {
  if (kind === "health") return HEALTH_SKILLS;
  if (kind === "grid") return GRID_SKILLS;
  if (kind === "rebalance") return REBALANCE_SKILLS;
  return YIELD_SKILLS;
}
