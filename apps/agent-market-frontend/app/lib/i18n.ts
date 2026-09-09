export type Lang = "en" | "es";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

const en: Record<string, string> = {
  "nav.marketplace": "Market",
  "nav.rebalancing": "Rebalance",
  "nav.gridTrading": "Grid",
  "nav.yield": "Yield",
  "nav.healthFactor": "Health",
  "nav.myAgents": "My Agents",
  "nav.sell": "Sell",
  "sell.badge": "MERCHANT_01",
  "sell.title": "Register a merchant",
  "sell.subtitle":
    "Mint an ERC-8004 identity now. Agent Safe is optional. When the public URL changes, update the agentURI — do not remint.",
  "yield.register": "Register ERC-8004 identity",
  "wallet.connect": "Connect Wallet",
  "wallet.connectPrompt":
    "Connect your wallet to view and manage your hired agents.",
  "myAgents.title": "My Agents",
  "myAgents.subtitle": "Manage your x402 hits and ERC-8183 escrow jobs.",
  "myAgents.loading": "Loading your agents...",
  "myAgents.empty": "You haven't hired any agents yet.",
  "myAgents.browse": "Browse Marketplace",
  "myAgents.view": "View",
  "myAgents.capital": "Capital",
  "myAgents.activated": "Activated",
  "myAgents.status": "Status",
  "myAgents.hireId": "Hire ID",
  "myAgents.rail": "Rail",
  "status.PAID": "Paid",
  "status.OPEN": "Open",
  "status.FUNDED": "Funded",
  "status.SUBMITTED": "Submitted",
  "status.COMPLETED": "Completed",
  "status.REJECTED": "Rejected",
  "status.EXPIRED": "Expired",
  "home.badge": "4AGENTS",
  "home.heroLine1": "What do you want",
  "home.heroLine2": "your money to do?",
  "home.subtitle":
    "Discover, compare, and activate DeFi agents across multiple chains. Automated strategies for yield, trading, liquidity, and loan protection.",
  "home.statAgents": "Agents",
  "home.statCategories": "Categories",
  "home.statChains": "Chains",
  "home.statVerified": "Verified",
  "home.featured": "Featured Agents",
  "common.explore": "Explore",
  "marketplace.badge": "DIRECTORY_01",
  "marketplace.title": "4Agents Marketplace",
  "yield.badge": "YIELD_01",
  "yield.title": "Yield Optimisation",
  "yield.subtitle":
    "Live Venus / Pancake V3 / Lista snapshot. Gemini follows declared Agent Card skills. Advisory — funds do not move.",
  "rebalance.badge": "REBALANCE_01",
  "rebalance.title": "Liquidity Rebalancing",
  "rebalance.subtitle":
    "CoinGecko spot and 24h drift for a 50/50 BNB–USDT sleeve. Gemini follows declared Agent Card skills. Advisory — does not recenter LPs.",
  "grid.badge": "GRID_01",
  "grid.title": "Grid Trading",
  "grid.subtitle":
    "Aster DEX mark, funding and 24h range plus CoinGecko BNB bands. Gemini follows declared Agent Card skills. Advisory — does not place perp orders.",
  "health.badge": "HEALTH_01",
  "health.title": "Health Factor",
  "health.subtitle":
    "Venus collateral factor and CoinGecko BNB price for a simulated BNB/USDT loan. Gemini follows declared Agent Card skills. Advisory — does not repay.",
  "categoryName.REBALANCING": "Manage Liquidity",
  "categoryName.GRID_TRADING": "Automate Trading",
  "categoryName.YIELD_OPTIMISATION": "Earn Yield",
  "categoryName.HEALTH_FACTOR_MONITORING": "Protect Loans",
  "categoryTagline.REBALANCING": "Keep your liquidity positions optimally ranged",
  "categoryTagline.GRID_TRADING": "Profit from market volatility automatically",
  "categoryTagline.YIELD_OPTIMISATION": "Maximize returns across DeFi protocols",
  "categoryTagline.HEALTH_FACTOR_MONITORING": "Never get liquidated unexpectedly",
};

const es: Record<string, string> = {
  "nav.marketplace": "Mercado",
  "nav.rebalancing": "Rebalanceo",
  "nav.gridTrading": "Grid",
  "nav.yield": "Yield",
  "nav.healthFactor": "Salud",
  "nav.myAgents": "Mis Agentes",
  "nav.sell": "Vender",
  "sell.badge": "COMERCIANTE_01",
  "sell.title": "Registrar comerciante",
  "sell.subtitle":
    "Minteá la identidad ERC-8004 ahora. El Agent Safe es opcional. Si cambia el dominio, actualizá la agentURI — no re-minteés.",
  "yield.register": "Registrar identidad ERC-8004",
  "wallet.connect": "Conectar Wallet",
  "wallet.connectPrompt":
    "Conecta tu wallet para ver y gestionar tus agentes contratados.",
  "myAgents.title": "Mis Agentes",
  "myAgents.subtitle": "Gestiona tus hits x402 y jobs ERC-8183 con escrow.",
  "myAgents.loading": "Cargando tus agentes...",
  "myAgents.empty": "Todavía no has contratado ningún agente.",
  "myAgents.browse": "Explorar Mercado",
  "myAgents.view": "Ver",
  "myAgents.capital": "Capital",
  "myAgents.activated": "Activado",
  "myAgents.status": "Estado",
  "myAgents.hireId": "ID de Contrato",
  "myAgents.rail": "Riel",
  "status.PAID": "Pagado",
  "status.OPEN": "Abierto",
  "status.FUNDED": "Fondeado",
  "status.SUBMITTED": "Entregado",
  "status.COMPLETED": "Completado",
  "status.REJECTED": "Rechazado",
  "status.EXPIRED": "Expirado",
  "home.badge": "4AGENTS",
  "home.heroLine1": "¿Qué quieres que",
  "home.heroLine2": "haga tu dinero?",
  "home.subtitle":
    "Descubre, compara y activa agentes DeFi en múltiples chains. Estrategias automatizadas de rendimiento, trading, liquidez y protección de préstamos.",
  "home.statAgents": "Agentes",
  "home.statCategories": "Categorías",
  "home.statChains": "Chains",
  "home.statVerified": "Verificados",
  "home.featured": "Agentes Destacados",
  "common.explore": "Explorar",
  "marketplace.badge": "DIRECTORIO_01",
  "marketplace.title": "Mercado 4Agents",
  "yield.badge": "YIELD_01",
  "yield.title": "Yield Optimisation",
  "yield.subtitle":
    "Snapshot live Venus / Pancake V3 / Lista. Gemini sigue las skills del Agent Card. Advisory — no mueve fondos.",
  "rebalance.badge": "REBALANCE_01",
  "rebalance.title": "Rebalanceo de liquidez",
  "rebalance.subtitle":
    "Spot y drift 24h de CoinGecko para un sleeve 50/50 BNB–USDT. Gemini sigue las skills del Agent Card. Advisory — no recentra LPs.",
  "grid.badge": "GRID_01",
  "grid.title": "Grid Trading",
  "grid.subtitle":
    "Mark, funding y rango 24h de Aster DEX más bandas CoinGecko de BNB. Gemini sigue las skills del Agent Card. Advisory — no coloca órdenes de perps.",
  "health.badge": "HEALTH_01",
  "health.title": "Health Factor",
  "health.subtitle":
    "Collateral factor de Venus y precio BNB de CoinGecko para un préstamo simulado BNB/USDT. Gemini sigue las skills del Agent Card. Advisory — no hace repay.",
  "categoryName.REBALANCING": "Gestionar Liquidez",
  "categoryName.GRID_TRADING": "Automatizar Trading",
  "categoryName.YIELD_OPTIMISATION": "Generar Rendimiento",
  "categoryName.HEALTH_FACTOR_MONITORING": "Proteger Préstamos",
  "categoryTagline.REBALANCING":
    "Mantén tus posiciones de liquidez en el rango óptimo",
  "categoryTagline.GRID_TRADING":
    "Aprovecha la volatilidad del mercado automáticamente",
  "categoryTagline.YIELD_OPTIMISATION":
    "Maximiza retornos entre protocolos DeFi",
  "categoryTagline.HEALTH_FACTOR_MONITORING":
    "Evita liquidaciones inesperadas",
};

export const DICTIONARIES: Record<Lang, Record<string, string>> = { en, es };

export const CATEGORIES = [
  { id: "YIELD_OPTIMISATION", href: "/yield" },
  { id: "REBALANCING", href: "/rebalance" },
  { id: "GRID_TRADING", href: "/grid" },
  { id: "HEALTH_FACTOR_MONITORING", href: "/health" },
] as const;
