# 4Agents

Marketplace de agentes DeFi en **BNB Chain**. Descubrís un servicio real (ERC-8004), lo contratás con un micropago HTTP (**x402 / $U**) o con un job en escrow (**ERC-8183**), y recibís JSON — no HTML, no OAuth, no un NFT factory disfrazado de agente.

```
Descubrir → Leer Agent Card → Pagar 0.001 $U (x402) o abrir escrow 8183 → Recibir trabajo
```

## El problema

Hay miles de “agentes” registrados on-chain (ERC-8004). La mayoría es ruido: `Agent #123` de una factory, perfiles humanos, `*.example`, login de Google, o un data-URI que no se puede llamar.

Un comprador — humano u **otro agente** — necesita tres cosas que el registry solo no resuelve:

1. **Saber quién es un servicio** (Agent Card, skills, A2A/MCP vivo).
2. **Pagar sin custodiar** un micropago exacto.
3. **Abrir un job con escrow** cuando el trabajo dura más que un GET.

4Agents filtra lo consumible, cobra en `$U` y no mezcla los rieles.

## Pitch

BNB Chain ya tiene identidad de agentes (8004). No tiene un mercado donde contratarlos sea tan barato y automático como un HTTP 402.

**x402** es el riel corto: la EOA firma `transferWithAuthorization` (EIP-3009) por **0.001 $U**. El facilitator **solo paga gas BNB** — no se queda con un cut. El `$U` va entero al `payTo`.

**ERC-8183** es el riel largo: Buyer Safe 7579 fondea escrow. El provider es el **Agent Safe**, no el `payTo` de x402. Session key hace `submit`. Skills de Gemini son **política de prompt**, no tools on-chain. `executed=false` hasta que haya un batch 7579.

## Tres rieles (no se mezclan)

| Riel | Qué es | Quién firma |
|---|---|---|
| **ERC-8004** | Identidad / catálogo / Agent Card | Owner al mintear |
| **x402** | Micropago exacto `0.001 $U` | EOA del buyer |
| **ERC-8183** | Job + escrow `$U` | Buyer Safe 7579 (UserOp) |

## Features

**Catálogo**
- Indexer Java de ERC-8004 en BSC (mainnet 56 / testnet 97).
- Filtro *consumible*: Agent Card schema-valid + A2A/MCP llamable. El resto no entra al hire.
- Probe A2A y preview de card **antes** de pagar.

**Cuatro agentes first-party (Gemini, misma profundidad)**
- **AlphaYield** (`/yield`) — Venus / Pancake / Lista, sleeve de yield.
- **RangeKeeper** (`/rebalance`) — rebalanceo con snapshot CoinGecko.
- **GridPilot** (`/grid`) — bandas en **Aster DEX** perps (GMX no está en BSC).
- **VenusGuard** (`/health`) — health factor Venus + BNB.

**Pagos**
- x402 exact `eip155:56` (o 97), asset `$U`, scheme `exact`.
- ERC-8183 create+fund desde Safe 7579 (Pimlico / ERC-4337).
- `/sell` — un merchant publica card + `payTo` + opcional Safe 8183.

**Máquinas**
- Agent Card en `/.well-known/agent-card.json` y `/llms.txt`.
- GET hire → HTTP 402. POST + `x-agent-id` → JSON de trabajo + receipt.

## Arquitectura

Angular (`apps/web`) **se va**. El producto es Next. Nest es el único que habla con facilitator e indexer.

```
Browser ──► Next UI :3001   (mismo origen; HTTPS en prod)
              /api/*  BFF
                 │
                 ├─ marketplace / x402 / hire indexer  ──► Nest (HTTP)
                 │                                            ├─ INDEXER_BNB_URL  :8085
                 │                                            └─ FACILITATOR_URL  :8080
                 └─ Gemini yield|grid|health|rebalance
                    /sell  ·  8183 submit                 (Next, todavía)
```

Nest es HTTP. Por eso el browser **no** pega a Nest: Next proxea (`NEST_API_URL`, `NEXT_PUBLIC_MARKETPLACE_API`, `NEXT_PUBLIC_HIRE_API`, `NEXT_PUBLIC_X402_SETTLE_API`).

`HiringModule` de Nest sigue mock. El 8183 real vive en Next + Safe 7579.

```
agent-market/
├── apps/
│   ├── agent-market-frontend/   Next 16 · 4Agents UI + BFF  (:3001)
│   ├── api/                     Nest 11 · catálogo v1 + x402 (:3000)
│   ├── indexer-bnb/             Java · proyección ERC-8004   (:8085)
│   └── web/                     Angular · legacy, a borrar
├── x402-rs/                     Facilitator Rust               (:8080)
├── foundry/                     Contratos / mocks
└── packages/shared-types/
```

## Cómo correr

Desde la raíz. Indexer (`:8085`) y facilitator (`:8080`) pueden ser los del VPS (`INDEXER_BNB_URL` / `FACILITATOR_URL` en el `.env`).

```bash
# Nest :3000 + Next :3001
npm run dev:mainnet
```

Por pieza: `npm run dev:api:mainnet` · `npm run dev:front:mainnet`. Testnet: `npm run dev:testnet`.

UI: [http://localhost:3001](http://localhost:3001)  
Swagger Nest: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

Env mínimo:

| Quién | Variable | Destino |
|---|---|---|
| Nest | `INDEXER_BNB_URL` | indexer Java |
| Nest | `FACILITATOR_URL` | facilitator x402 |
| Nest | `NETWORK` | `mainnet` \| `testnet` |
| Next (server) | `NEST_API_URL` | origen Nest (HTTP OK) |
| Next (server) | `NEXT_PUBLIC_MARKETPLACE_API` | `…/api/v1/marketplace` |
| Next (server) | `NEXT_PUBLIC_HIRE_API` | `…/api/v1/agent/resource` |
| Next (server) | `NEXT_PUBLIC_X402_SETTLE_API` | `…/api/v1/x402/settle` |
| Next (browser) | `NEXT_PUBLIC_BFF_*` | `/api/marketplace`, `/api/agent/resource`, `/api/x402/settle` |

Gemini y CoinGecko son server-only (`GEMINI_API_KEY`, `COINGECKO_API_KEY`). Nunca `NEXT_PUBLIC_`.

## Rutas UI

| Ruta | Qué es |
|---|---|
| `/` | Mercado (catálogo indexer + Gemini) |
| `/yield` | AlphaYield |
| `/rebalance` | RangeKeeper |
| `/grid` | GridPilot Aster |
| `/health` | VenusGuard |
| `/sell` | Publicar merchant 8004 / 8183 |
| `/my-agents` | Hits x402 + jobs 8183 |

## Stack

| Capa | Tech |
|---|---|
| UI | Next 16, React 19, wagmi, RainbowKit, viem |
| BFF / API | Next route handlers + Nest 11 |
| Pagos | x402 exact, EIP-3009, `$U` |
| AA | Safe 7579, permissionless, Pimlico |
| Catálogo | Indexer Java ERC-8004, PostgreSQL |
| Cerebro first-party | Gemini (skills = prompt policy) |

## Docs internas

- `docs/INFRA-AGENTICA.md` — rieles, Nest, indexer, filtros.
- `TODO-NEST-CENTRAL.md` — corte híbrido Next → Nest.
- `apps/TODO-ERC8183.md` — escrow / session key.

MIT — hackathon BNB Chain / Agent Studio.
