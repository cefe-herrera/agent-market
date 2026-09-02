# BNB Agent Marketplace

A functional POC for a **DeFi Agent Marketplace on BNB Chain**, inspired by the BNB Agent Studio challenge. Discover, compare, evaluate risk, hire, and control automated DeFi agents — all through a modern fintech UX without exposing blockchain complexity.

## What is this?

This project validates the core product experience:

```
Discover → Understand → Compare → Evaluate Risk → Hire → Control
```

It is **not** a full blockchain integration yet. Mock providers stand in for ERC-8183 (agent hiring), while **ERC-8004 agent discovery** reads real on-chain registrations via the [8004scan](https://www.8004scan.io) indexer (filtered to agents built with BNB Agent SDK / BNB Agent Studio).

## Architecture

**Modular monolith** — one deployable unit with clear domain boundaries, ready to extract into microservices later.

```
bnb-agent-marketplace/
├── apps/
│   ├── api/          NestJS REST API (modular monolith)
│   └── web/          Angular 19 SPA
├── packages/
│   └── shared-types/ Shared TypeScript types & enums
├── docker-compose.yml
└── package.json      npm workspaces root
```

### Backend Modules

| Module | Responsibility | Future Service |
|--------|---------------|----------------|
| `AgentsModule` | Agent identity & metadata | agent-service |
| `AnalyticsModule` | Performance metrics | analytics-service |
| `SecurityModule` | Agent permissions | (part of agent-service) |
| `MarketplaceModule` | Discovery, filters, compare, scoring | marketplace-service |
| `HiringModule` | Agent hire/activate/pause/revoke | hiring-service |
| `BlockchainModule` | Registry & chain abstractions | blockchain-service |
| `UsersModule` | Wallet-based users (POC) | user-service |

**Cross-module rule:** modules communicate via public services and interfaces — never direct repository access to another module's tables.

### Provider Abstractions

```typescript
// BlockchainModule — swappable without touching MarketplaceModule
interface AgentRegistryProvider {
  getAgents(): Promise<ExternalAgent[]>
  getAgent(agentId: string): Promise<ExternalAgent>
  verifyOwnership(agentId: string, wallet: string): Promise<boolean>
}
// Current: Erc8004RegistryProvider (8004scan + built_with filter)
// Fallback: MockAgentRegistryProvider (AGENT_REGISTRY_MODE=mock)
// Future:  direct on-chain indexer / subgraph

// HiringModule
interface AgentHiringProvider {
  hireAgent(...): Promise<HireStatusResult>
  revokeAgent(hireId: string): Promise<HireStatusResult>
  getHireStatus(hireId: string): Promise<HireStatusResult>
}
// Current: MockAgentHiringProvider
// Future:  Erc8183HiringProvider
```

### Domain Events

Internal event bus (NestJS EventEmitter) publishes:

- `AgentDiscovered`, `AgentVerified`, `AgentHired`, `AgentActivated`
- `AgentPaused`, `AgentRevoked`, `AgentMetricsUpdated`

These can become distributed messages (Kafka, etc.) when services split.

### Marketplace Score

Transparent scoring for agent comparison:

```
score = performanceScore × 0.25
      + reliabilityScore × 0.25
      + riskScore × 0.20
      + trackRecordScore × 0.15
      + usageScore × 0.15
```

See `apps/api/src/modules/marketplace/marketplace-score.calculator.ts`.

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Setup

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
npm install

# 3. Run migrations & seed (24 agents)
npm run db:migrate
npm run db:seed

# 4. Start API + Angular (NETWORK from .env, default mainnet)
npm run dev:mainnet
npm run dev:testnet

# Next marketplace (apps/agent-market-frontend :3000)
npm run dev:front:mainnet
npm run dev:front:testnet

# 5. x402 facilitator — same GHCR image; NETWORK picks the chain (eip155:56 / 97)
cd x402-rs
NETWORK=mainnet docker compose up      # BSC mainnet; signer needs BNB for gas
# NETWORK=testnet docker compose up    # BSC testnet; signer needs tBNB
```

Open [http://localhost:4200](http://localhost:4200)

### Demo Flow

1. Home → choose **Manage Liquidity** (Rebalancing)
2. Filter by **PancakeSwap**
3. Select 3 agents → **Compare**
4. Open **Pancake LP Guardian** → review performance, risk, permissions
5. **Hire Agent** → 500 USDT → Activate
6. **My Agents** → pause or revoke

Demo user wallet: `0xDemoUser1234567890123456789012345678901234`

## Data Model

### Agent Categories (equal weight)

- `REBALANCING` — Manage Liquidity
- `GRID_TRADING` — Automate Trading
- `YIELD_OPTIMISATION` — Earn Yield
- `HEALTH_FACTOR_MONITORING` — Protect Loans

### Key Entities

- **Agent** — identity, strategy, category, protocols, assets, risk
- **AgentMetrics** — performance + `categoryMetrics` (JSONB) for category-specific KPIs
- **AgentPermission** — what the agent can/cannot do
- **AgentHire** — user wallet, capital, status lifecycle
- **User** — wallet address (no auth in POC)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/agents` | List agents |
| GET | `/agents/:id` | Agent detail |
| GET | `/agents/:id/metrics` | Performance metrics |
| GET | `/agents/:id/permissions` | Permissions |
| GET | `/agents/:id/chart` | Chart data |
| GET | `/agents/studio` | Agents published via BNB Agent Studio |
| POST | `/agents/studio/sync` | Sync from ERC-8004 registry |
| GET | `/marketplace/agents` | Filtered marketplace listing |
| GET | `/marketplace/categories` | Category info |
| GET | `/marketplace/featured` | Featured agents |
| GET | `/marketplace/compare?agents=id1,id2` | Compare agents |
| POST | `/hires` | Hire/activate agent |
| GET | `/hires/:id` | Hire detail |
| GET | `/hires/user/:wallet` | User's hires |
| POST | `/hires/:id/pause` | Pause hire |
| POST | `/hires/:id/revoke` | Revoke hire |
| GET | `/users/demo` | Demo user wallet |

Swagger docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### Example Filter Query

```
GET /marketplace/agents?category=REBALANCING&riskLevel=LOW&protocol=PancakeSwap&sort=highestReturn
```

## Frontend Routes

| Route | Page |
|-------|------|
| `/` | Home / Dashboard |
| `/agents` | Marketplace |
| `/agents/rebalancing` | Rebalancing category |
| `/agents/grid-trading` | Grid Trading category |
| `/agents/yield` | Yield Optimisation category |
| `/agents/health-factor` | Health Factor Monitoring category |
| `/agents/:slug` | Agent detail |
| `/compare` | Side-by-side comparison |
| `/my-agents` | Hired agents management |

## Internationalisation (EN / ES)

The UI ships in English and Spanish, switchable at runtime from the header toggle.

- `apps/web/src/app/core/i18n/translations.ts` — flat key/value dictionaries, one per language.
- `apps/web/src/app/core/i18n/i18n.service.ts` — signal-backed language state, `t(key, params)` lookup, and a matching `locale` used for number and date formatting.

The active language is persisted in `localStorage` and falls back to the browser language on first visit. Because `t()` reads a signal, every template that calls it re-renders when the language changes; no page reload or separate build per locale is needed.

Adding a language means adding a dictionary to `TRANSLATIONS` and an entry to `LANGUAGES`. A unit test asserts both dictionaries expose the same key set, so a missing translation fails the build.

Agent-specific content (names, strategy descriptions, permission descriptions) comes from the database seed and is currently English only. Localising it would mean adding a translations table or per-locale columns to the `Agent` model.

## Seed Data

24 agents (6 per category) with realistic DeFi metrics:

- Pancake LP Guardian, RangePilot, GridAlpha, YieldPilot, Health Guardian, etc.
- Varied risk levels, AUM, returns, protocols, and permissions

Run manually: `npm run db:seed`

## Testing

```bash
# Backend unit tests
npm run test --workspace=@bnb-marketplace/api

# Frontend unit tests
npm run test --workspace=@bnb-marketplace/web -- --watch=false --browsers=ChromeHeadless
```

## Future Architecture

When ready to split the modular monolith:

```
                        API Gateway
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
     Marketplace          Agents            Hiring
       Service            Service            Service
          │                  │                  │
     Analytics          Blockchain          Users
       Service            Service           Service
```

**Migration path per module:**

1. Extract module's controllers → standalone service
2. Replace in-process service calls with HTTP/gRPC clients
3. Swap EventEmitter events → message broker (Kafka, RabbitMQ)
4. Replace mock providers with real chain integrations:
   - `Erc8004RegistryProvider` for on-chain agent discovery
   - `Erc8183HiringProvider` for session key / hire transactions
5. Add wallet authentication to `UsersModule`

**Not included in POC (by design):**

- Kafka, RabbitMQ, service mesh, Kubernetes, API Gateway
- Real wallet connection, smart contract calls, RPC nodes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 19, Standalone Components, Signals, Reactive Forms, TailwindCSS |
| Backend | NestJS 11, Prisma ORM, PostgreSQL, Swagger |
| Infra | Docker Compose (PostgreSQL only) |
| Monorepo | npm workspaces |

## License

MIT — POC for demonstration purposes.
