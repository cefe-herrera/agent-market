# Server — Nest indexer (`apps/api`)

Cambios del indexador ERC-8004 / 8004scan para la demo BNB testnet (chain 97).  
x402 settle **no** vive acá: eso es Next (`apps/agent-market-frontend`) + facilitator Rust (`x402-rs`).

## Cómo correrlo

```bash
# en agent-market/
# .env de la raíz: PORT=3005, CORS, 8004scan key, AGENT_REGISTRY_MODE=erc8004

npm run dev:api:mainnet   # 8004scan mainnet
npm run dev:api:testnet   # 8004scan testnet
npm run dev:front:mainnet # Next :3000, mismo NETWORK
npm run dev:front:testnet
```

- API: `http://localhost:3005`
- Swagger: `http://localhost:3005/api/docs`

El front en `:3000` pega contra Nest vía BFF `/api/marketplace/*`.

## Env relevante (raíz `agent-market/.env`)

| Variable | Qué hace |
|---|---|
| `PORT=3005` | Nest. No usar 3000 (Next). |
| `NETWORK` | `mainnet` (default) o `testnet`. También `npm run dev:api:mainnet` / `dev:api:testnet`. |
| `CORS_ORIGIN` | Incluye `http://localhost:3000` **y** `http://localhost:4200`. Sin `:3000` el catálogo del front falla CORS. |
| `AGENT_REGISTRY_MODE=erc8004` | Lee 8004scan, no el mock. |
| `AGENT_STUDIO_ONLY=false` | Lista todos los testnet, no solo “bnbagent”. |
| `LATEST_8004SCAN_API_KEY` | Auth a `https://8004scan.io/api/v1`. |
| `LATEST_8004SCAN_MIN_INTERVAL_MS` | Throttle (~2.1s). |
| `ERC8004_AUTO_SYNC` | Sync a Prisma en background. |
| `A2A_HEALTH_ON_SYNC` | Default `true`: en el sync se probea A2A. |
| `A2A_HEALTH_TIMEOUT_MS` | Default `4000`. |
| `BSC_TESTNET_RPC` | Default `https://bsc-testnet-rpc.publicnode.com`. Solo reputación on-chain. |

No hay `AGENT_ID` / `NEXT_PUBLIC_AGENT_ID` en el indexador. El token ERC-8004 va en la URL (`1868` o CAIP `97:0x8004…:1868`).

## Contratos BSC testnet (97)

- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

## Qué se cambió

### 1. `GET /agents/studio` ya no 404

`GET /agents/:id` se comía `studio` → 404.

Fix: `AgentsStudioController` (`@Controller('agents/studio')`) se registra **antes** de `AgentsController` en `agents.module.ts`.

El front **no** debe pegarle a `/agents/studio` para el catálogo usable. Usar `GET /agents`.

### 2. Lista desde 8004scan testnet

`GET /agents` → `scan.listRegisteredAgents({ isTestnet: true })`.

Mapper de **list item**:

- `x402_supported` → `supportedAssets: ['U']` (no USDC).
- `agentUri` de lista = `erc8004://{chain}/{token}` (no el data URI).
- Protocols vienen de `supported_protocols` (muchos son solo `Web`, sin A2A).

Detalle (`GET /agents/:id`): resuelve Prisma o 8004scan. El `agentUri` real suele ser `data:application/json;base64,...` con `services[]` (a menudo `web` + host `*.example`).

### 3. A2A health live

Archivos nuevos:

- `erc8004/a2a-health.ts` — parse de agent-card, `emptyA2aHealth`, métricas.
- `erc8004/a2a-health.client.ts` — HTTP GET al endpoint A2A.

Healthy = HTTP 200 + JSON que parece agent-card (`name` / `skills` / `url` / `protocolVersion` / `capabilities`).

`GET /agents/:id/a2a-health` — probe en vivo (no cache del list).

Endpoint A2A = `detail.a2a_endpoint` **o** `detail.services.a2a.endpoint`.  
`services.web` **no** cuenta como A2A. Por eso #1867 / #1868 (solo Web + `*.example`) responden:

```json
{ "endpoint": null, "status": "missing", "error": "No A2A endpoint in ERC-8004 registration" }
```

Eso es correcto: no hay seller A2A. El JSON de servicio post-pago lo arma el front decodificando el data URI, no este endpoint.

En sync (`erc8004-registry.provider.ts`) el probe se corre si `A2A_HEALTH_ON_SYNC=true`.

### 4. Reputación on-chain sin viem

`erc8004-reputation.client.ts` hace `eth_call` crudo (ABI encode/decode a mano).

**Por qué:** `viem` / `ox` metían los `.ts` de `node_modules` al typecheck de Nest y explotaban (instanciación infinita). `viem` se sacó de `apps/api/package.json`.

`GET /agents/:id/reputation`

`id` acepta: `1868`, CAIP `97:0x8004a818…:1868`, o slug `token-screener-1868`.

Lee `ownerOf`, `getClients`, `getLastIndex`, `readFeedback`.

### 5. tsconfig — un solo archivo

Problema: `incremental` + Nest `deleteOutDir` borraba `dist/` y no re-emitía → `Cannot find module dist/main`.

Ahora `apps/api/tsconfig.json` único:

- `rootDir: ./src`
- sin `incremental`
- sin `baseUrl` / `paths` (TS6 + `@bnb-marketplace/shared-types` se resuelve del workspace `dist`)
- `nest-cli.json` → `tsConfigPath: tsconfig.json`

Se borraron `tsconfig.build.json` y los `.tsbuildinfo`.

Build: `nest build` tiene que dejar `apps/api/dist/main.js`. Shared-types **antes** que api.

## Endpoints que usa la demo

| Método | Path | Uso |
|---|---|---|
| `GET` | `/agents` | Catálogo indexador (testnet, mix de chains; el front filtra 97 + A2A o x402 `$U`). |
| `GET` | `/agents/:id` | Detalle 8004scan (data URI, services, wallet). |
| `GET` | `/agents/:id/a2a-health` | Probe A2A. “chequear A2A” en el front. |
| `GET` | `/agents/:id/reputation` | Feedback ERC-8004 on-chain. |

`:id` con `:` hay que URL-encodear (`97%3A0x8004…%3A1868`).

## Gotchas

- Listado ≠ detalle. Lista no trae services HTTP; detalle sí (a veces solo `*.example`).
- `x402_supported` en 8004scan es un flag, no un quote ni un endpoint 402.
- `GET /agents/:id` está **después** de `reputation` y `a2a-health`. No invertir el orden.
- CORS: si el front corre en otro origin, sumarlo a `CORS_ORIGIN`.
- Rate limit 8004scan: no spamear list+detail+health en paralelo sin throttle.

## Fuera de este server

Pago x402 / EIP-3009 `$U` / JSON de demo sellers: Next + facilitator.  
No re-agregar `viem` al package del API sin aislar types (`skipLibCheck` no alcanzó cuando el checker entraba a `ox`).
