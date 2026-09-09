# Infraestructura agentica — Nest, indexer, front, rieles

Documento de contexto para el hackathon. Distingue **esta rama** (híbrido Nest + Next) de **`main-branch/apps/api`** (Nest como API única). El browser solo pega a Next `:3001` `/api/*`; Next proxea Nest HTTP (`NEST_API_URL`). Gemini/sell/8183 siguen en Next.

---

## 1. Qué problema resolvemos

Hay miles de “agentes” registrados on-chain (ERC-8004) en BNB Chain. La mayoría son ruido: NFT factory (`Agent #123`), perfiles humanos (Termix / EvoEvo), `*.example`, OAuth, o un data-URI sin endpoint llamable.

Un comprador (humano o **otro agente**) necesita:

1. **Descubrir** quién es un servicio real (Agent Card, skills, A2A/MCP).
2. **Pagar** un micropago HTTP sin custodiar fondos (x402 / EIP-3009 / `$U`).
3. **Contratar un job** con escrow cuando el trabajo dura más que un GET (ERC-8183).
4. Recibir un **JSON de trabajo**, no HTML.

Tres rieles que **no se mezclan**:

| Riel | Qué es | Quién firma |
|---|---|---|
| **ERC-8004** | Identidad / catálogo / Agent Card | Owner al mintear |
| **x402** | Micropago exacto `0.001 $U` al `payTo` | EOA del buyer; el facilitator **solo paga gas BNB** |
| **ERC-8183** | Job + escrow `$U` | Buyer Safe 7579 (UserOp); el agente hace `submit` con session key |

El facilitator x402 **no cobra fees** del micropago. El `0.001 $U` va entero al `payTo`. El operador del facilitator fondea BNB para el gas.

---

## 2. Mapa de procesos

### Esta rama (híbrido Nest + Next)

```
Browser ──► Next UI :3001  /api/*   (mismo origen; HTTPS en prod)
              ├─ /api/marketplace/*  ──► Nest :3000 /api/v1/marketplace/*
              ├─ /api/x402/settle    ──► Nest :3000 /api/v1/x402/settle
              ├─ /api/agent/resource ──► Nest settle / resource
              └─ /api/agent/{yield,grid,health,rebalance,card,8183}
                 /api/merchant*   (Next BFF)

Nest :3000  (HTTP; NEST_API_URL en el BFF)
  ├─ marketplace/*  ──► indexer Java :8085
  ├─ x402/settle    ──► facilitator Rust :8080
  └─ agent/resource ──► facilitator :8080
```

### Destino `main-branch` (`apps/api`, commit tipo *delete bff*)

```
Browser ──► Next UI only
              └─ /api/v1/*  ──► Nest (PORT default 3000)
                                  ├─ marketplace/*  ──► indexer :8085
                                  ├─ x402/settle    ──► facilitator :8080
                                  └─ agent/resource ──► facilitator :8080
```

Swagger Nest: `http://localhost:{PORT}/api/docs`.  
Checklist de corte: `main-branch/agent-market/apps/api/docs/frontend-cutover-checklist.md`.

**Aún no portado a Nest** (si se borra el BFF Next se rompe esta rama): yield/rebalance Gemini, `/sell`, worker 8183, `resolvePaidWork`.

Hiring en Nest (`HiringModule`) sigue siendo **mock en memoria**. El 8183 real vive en Next + Safe 7579.

---

## 3. Nest — `main-branch/agent-market/apps/api`

Nest 11 + Prisma + Swagger. **No usa viem** (el typecheck de Nest + `ox` explotaba). Reputación/on-chain van al indexer o a `eth_call` crudo en el legado 8004scan.

### Módulos que importan

| Módulo | Rol |
|---|---|
| `MarketplaceModule` | Catálogo v1: list / search / featured / stats / card / a2a-health / reputation |
| `X402Module` | `POST /api/v1/x402/settle`, `GET/POST /api/v1/agent/resource` → facilitator |
| `BlockchainModule` | Cliente HTTP al indexer Java (`INDEXER_BNB_URL`, default `:8085`) |
| `AgentsModule` | Detalle por UUID / CAIP `chain:registry:tokenId` / slug |
| `HiringModule` | Mock hire/revoke (no 8183) |
| `NetworkModule` | `NETWORK=mainnet\|testnet` → chain 56 / 97 y token `$U` |

Env que Nest necesita: `FACILITATOR_URL`, `INDEXER_BNB_URL`, `NETWORK`, `U_TOKEN_*`, `X402_PAY_TO`, `CORS_ORIGIN` (incluye `:3000` y `:3001` / Angular `:4200`). Next solo necesita `NEST_API_URL` (server, HTTP OK). No pongas `NEXT_PUBLIC_API_*` ni `FACILITATOR_URL` / `INDEXER_BNB_URL` en el front.

Errores hacia el front: `{ success, error, details }`. Fallo de indexer → **502**, no 500 suelto.

`GET /api/v1/agent/resource` responde **402** con el contrato x402 (`scheme: exact`, red `eip155:56|97`, amount atómico `0.001 $U`). El POST verifica+settle y devuelve JSON de seller (demos fijos en Nest; en esta rama Next además corre Gemini).

---

## 4. Indexer Java — `apps/indexer-bnb`

Spring Boot 4 / Modulith en `:8085`. Lee **Identity + Reputation + Validation** ERC-8004 en BSC, proyecta a PostgreSQL, hidrata metadata (HTTP / IPFS / data-URI) y expone REST.

Docs internas: `apps/indexer-bnb/indexer/docs/` (`01`–`09`). Arranque:

```bash
cd apps/indexer-bnb/indexer
cp local.properties.example local.properties
./mvnw spring-boot:run
# health: :8085/actuator/health
# swagger: :8085/swagger-ui.html
```

Endpoints que Nest y el BFF Next consumen:

| Path | Uso |
|---|---|
| `GET /api/v1/agents` | Lista paginada (Spring `page` 0-based, `size`, `sort`) |
| `GET /api/v1/search?q=` | ILIKE + `search_vector` + trigram; ignora `sort` del cliente |
| `GET /api/v1/agents/{uuid}` | Detalle + `metadata` crudo + wallet |
| `GET /api/v1/agents/{id}/reputation` | Score materializado (no recalcula on-read) |
| `GET /api/v1/agents/{id}/activity\|feedback\|validations` | Historial |

El indexer **no filtra “consumible”**. Trae todo lo registrado. El filtro de marketplace es capa Nest / Next.

---

## 5. Filtros del catálogo

Query Nest / BFF (`MarketplaceQueryDto` / `marketplaceListFilters`):

| Param | Default | Efecto |
|---|---|---|
| `usable` | `true` | Solo agentes **consumibles** (`schemaValid`) |
| `open=true` | off | Además busca `bnbagent`, `agent-card`, `a2a`, `mcp`, `x402` (no solo dump cronológico) |
| `chainId` / `isTestnet` | `NETWORK` | 56 vs 97 |
| `search` / `q` | — | Pasa al `/search` del indexer |
| `category`, `verified`, `sort`, `page`, `limit` | — | Shape de marketplace (limit max 100) |

**Consumible** (`schemaValid`) = hay URL HTTP llamable de A2A **o** MCP. Se descarta:

- factory noise (`Agent #N` + copy corto, `*.agent`, “on termix platform”)
- perfil humano (Termix/EvoEvo sin `/a2a` `/mcp` `agent-card` `.well-known`)
- `*.example`, OAuth/Cognito/login, placeholders `{…}`

Stats del list usable: `registered`, `consumable`, `filteredOut`. El front muestra “N listados · M registrados · K filtrados”.

Cache usable ~120s (`INDEXER_USABLE_TTL_MS`). Hydrate de detalle en chunks de 8 cuando la lista no trae endpoints.

El front (Next) **mergea** encima: merchants locales (`/sell`) + agentes first-party Gemini (yield / rebalance) que el indexer todavía no tiene.

---

## 6. Front

Hay **dos UIs** en el monorepo del colega:

| App | Stack | Puerto típico |
|---|---|---|
| `main-branch/.../apps/web` | Angular 19 | `:4200` (luego `:3001` si Nest toma `:3000`) |
| **esta rama** `apps/agent-market-frontend` | Next App Router | `:3000` |

La demo que estamos mostrando es **Next**:

- Catálogo `/` — indexer usable + Q402 + merchants
- `/rebalance`, `/yield` — first-party (CoinGecko / Venus+Pancake), hire x402 0.001 $U
- `/sell` — minteo 8004 (URI live o snapshot); 8183 Agent Safe opcional
- Dock de contratación (popup abajo-derecha): x402 CTA + accordion 8183
- Wallet wagmi; pagos EIP-3009 desde la EOA

BFF Next `app/api/marketplace/[...path]` queda como fallback para Gemini + merchants. El catálogo indexer y el x402 de terceros van a Nest `/api/v1`.

---

## 7. ERC-8183 **sin** `@bnbagent/sdk`

El SDK es runtime de agente (TWAK, Turnkey, Altana, MegaFuel, keystore). El market es una dapp wagmi. Copiamos **protocolo**, no el runtime.

Fuentes: `bnbagent-sdk` (ABIs + addresses) y `safe7579` (cuenta 7579 + Pimlico).

En Next:

```
app/lib/erc8183/     addresses, ABIs mínimos, read/write viem, tipos JobStatus
app/lib/aa/          Safe 7579, Pimlico bundler, batch create+register+fund, session key
app/api/agent/8183/  pending + submit worker (AGENT_SESSION_PRIVATE_KEY, server-only)
```

Flujo:

1. Buyer: UserOp batch desde **Buyer Safe** (`saltNonce` buyer) → `createJob` + `registerJob` + `approve` + `fund` en `$U`.
2. Provider on-chain = **Agent Safe** counterfactual (`saltNonce=1`), no el `payTo` x402.
3. Worker escucha `JobFunded`, arma el deliverable (mismo cerebro que x402: yield/rebalance advisory) y `submit` con smart session — **sin** volver a pedir firma humana.
4. Settle / dispute / refund = EOA o Safe del buyer sobre Commerce + OptimisticPolicy.

`paymentToken()` se lee on-chain y **debe** coincidir con el `$U` de x402. Budget `0` = job gratis (skip approve).

No instalamos: `EVMWalletProvider`, `loadEnv`, TWAK, Turnkey, Altana, MegaFuel.

---

## 8. Cómo brindamos infraestructura agentica

No es “un bot con API key”. Es un **mercado + dos rieles de pago + un cerebro declarativo**:

1. **Identidad** — ERC-8004 Agent Card (skills, `services[]`, `x402`, opcional `erc8183.provider`). First-party: `/api/agent/card/{id}`. Merchants: URI on-chain (live o data-URI).
2. **Descubrimiento** — indexer 8004 + filtro consumible + probe A2A (`200/401/402/403` = reachable).
3. **Pago HTTP** — x402 exact. GET resource = 402; POST con firma EIP-3009 = JSON. Facilitator Rust (`x402-rs`) verify+settle.
4. **Pago job** — 8183 escrow + Safe 7579 (buyer y agent). Batch UserOp; session key del agente.
5. **Cerebro** — Gemini **skills-as-prompt**, no tool-calling. El Agent Card declara skills; el server las inyecta al prompt con un snapshot (Venus/Pancake o CoinGecko). `executed=false` hasta que 7579 dispare un batch real.
6. **Publicación** — `/sell` mintea 8004; `payTo` x402 = EOA conectada; provider 8183 = Agent Safe si existe.

Un agente externo hoy puede: leer el card, pagar x402, recibir JSON. Todavía **no** hay `/.well-known/agent-card.json` ni JSON-RPC A2A de spec (el hire es REST+402). Eso es el siguiente corte corto — ver respuesta en chat.

---

## 9. Cómo correrlo (esta rama)

```bash
# indexer Java :8085  +  facilitator :8080  +  Nest :3000  +  Next :3001
NETWORK=mainnet docker compose up          # facilitator; signer con BNB
# indexer: apps/indexer-bnb (local.properties)
npm run dev:api:mainnet                    # Nest :3000
cd apps/agent-market-frontend && npm run dev:mainnet   # :3001
```

Claves **server-only** (nunca `NEXT_PUBLIC_`): `GEMINI_API_KEY`, `COINGECKO_API_KEY`, `AGENT_SESSION_PRIVATE_KEY`, Pimlico. WalletConnect sí es public.
