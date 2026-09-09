# 06 — API

Base: `/api/v1`. Swagger: `/swagger-ui.html`. OpenAPI JSON: `/v3/api-docs`.

No hay autenticación. Cualquiera que alcance el puerto puede listar agentes, disparar un reindex y mover el checkpoint.

Paginación: Spring Data. Query params `page` (0-based), `size` (default 20, max 2000), `sort`. El search **ignora `sort`**: ordena por similarity y `created_at`.

---

## Agents

### `GET /api/v1/agents`

Lista paginada, sin filtro. `AgentResponse`.

```json
{
  "id": "…",
  "chainId": 56,
  "onchainId": 317675,
  "ownerAddress": "0x…",
  "name": "…",
  "description": "…",
  "metadataUri": "ipfs://…",
  "createdAt": "2026-08-29T…"
}
```

No incluye `agentWalletAddress` (sí el detalle).

### `GET /api/v1/agents/{id}`

404 si no existe. `AgentDetailResponse`: lo de arriba más `agentWalletAddress`, `imageUri`, `metadata` (el JSON crudo).

`metadata` es `null` si nunca se fetcheó o falló. El `status` de metadata **no se expone**.

### `GET /api/v1/agents/{id}/activity`

404 si el agente no existe. `Page<ActivityResponse>` ordenado por `timestamp` desc.

```json
{
  "id": "…",
  "agentId": "…",
  "activityType": "REGISTERED",
  "transactionHash": "0x…",
  "blockNumber": 118860000,
  "timestamp": "2026-08-29T…"
}
```

Tipos: `REGISTERED`, `URI_UPDATED`, `TRANSFERRED`, `FEEDBACK_RECEIVED`, `VALIDATION_RESPONSE`.

### `GET /api/v1/agents/{id}/reputation`

404 si el agente no existe. Si existe pero nunca se calculó score: `score: 0`, `factors: {}`, `calculatedAt: null`. **No recalcula on-read.**

```json
{
  "agentId": "…",
  "score": 42.5,
  "factors": {
    "activityCount": 3,
    "feedbackCount": 1,
    "feedbackAverage": 4.5,
    "feedbackScore": 45.0,
    "validationCount": 0,
    "validationAverage": 0.0,
    "validationScore": 0.0,
    "activityScore": 6.0
  },
  "calculatedAt": "2026-08-30T…"
}
```

### `GET /api/v1/agents/{id}/feedback`

Lista completa, sin paginar. Incluye revocados (`revoked: true`). `normalizedValue` ya está dividido por `10^valueDecimals`.

### `GET /api/v1/agents/{id}/validations`

Lista de requests, cada uno con su array `responses`. Sin paginar.

---

## Search

### `GET /api/v1/search?q=&page=&size=`

Si `q` está vacío: igual que `GET /agents` (paginación JPA normal, respeta `sort`).

Si `q` tiene texto:

1. Se sanitiza: solo letras, números, espacios, `._@-`. El resto se vuelve espacio.
2. Si tras sanitizar queda vacío → lista completa.
3. Query nativa en PostgreSQL (ver [02](02-GLOSARIO.md#full-text-search-vs-trigram)):
   - `ILIKE '%q%'` sobre name, description, owner, wallet
   - `CAST(onchain_id AS TEXT) LIKE '%q%'`
   - `search_vector @@ to_tsquery('simple', 'token:* & token2:*')` (prefix)
4. `countQuery` paralelo → `totalElements` **global**.
5. Orden fijo: `GREATEST(similarity(...)) DESC, created_at DESC`.
6. El `Pageable.sort` del cliente se descarta (`PageRequest.of(page, size)` sin sort) para no pelear con el `ORDER BY` nativo.

Campos buscables: `name`, `description`, `owner_address`, `agent_wallet_address`, `onchain_id`. No busca dentro de `raw_json` ni en tags de feedback.

---

## Rankings

### `GET /api/v1/rankings?type=TRUSTED`

`type` default `TRUSTED`. Enum: `TRUSTED`, `TRENDING`, `ACTIVE`, `POPULAR`, `YIELD`.

Devuelve `List<RankingResponse>` (todas las filas materializadas, sin paginar). Vacío si el scheduler todavía no corrió.

```json
{
  "agentId": "…",
  "rankingType": "TRUSTED",
  "position": 1,
  "score": 42.5,
  "calculatedAt": "…"
}
```

Fórmulas: [08](08-REPUTACION-Y-RANKINGS.md).

---

## Indexer (control)

Pensado para operación local. **No exponer a internet sin auth.**

### `GET /api/v1/indexer/status`

503 si el RPC no responde (necesita `chainHead`).

```json
{
  "chainId": 56,
  "registryAddress": "0x8004A1…",
  "reputationRegistryAddress": "0x8004BA…",
  "validationRegistryAddress": "0x8004Cb…",
  "monitoredEventTopics": ["0x…"],
  "startBlock": 118855138,
  "checkpoint": 118865137,
  "chainHead": 120000000,
  "safeHead": 119999988,
  "blocksIndexed": 10000,
  "blocksRemaining": 1134714,
  "progressPercent": 0.87,
  "caughtUp": false
}
```

`progressPercent` es `indexed / (indexed + remaining)` desde `start-block`, no desde el genesis.

### `POST /api/v1/indexer/run`

Una corrida. Body: `IndexerRunResponse`.

| `status` | Significado |
|---|---|
| `PROCESSED` | Avanzó `[fromBlock, toBlock]`, `logsFound` logs |
| `CAUGHT_UP` | Nada que hacer |
| `RPC_ERROR` | 503, `message` con el error |

`?resetCheckpoint=true` borra checkpoint + `indexed_blocks` **antes** de correr. No borra agentes. Ver [03](03-PIPELINE-INDEXACION.md#operaciones-manuales).

### `POST /api/v1/indexer/checkpoint?block={n}`

Mueve `last_block` a `n`. Devuelve el status. 503 si el RPC falla al armar el status (el move ya se hizo).

### `POST /api/v1/indexer/resume`

204. Baja la pausa por 401. El próximo tick del scheduler vuelve a indexar.

---

## Actuator

Expuestos: `health`, `prometheus`, `modulith`.

| Path | Uso |
|---|---|
| `/actuator/health` | Liveness. No prueba el RPC |
| `/actuator/prometheus` | Métricas Micrometer |
| `/actuator/modulith` | Publicaciones de eventos incompletas |

`show-details: when-authorized` — sin auth, health es `UP`/`DOWN` sin detalle.

---

## Convenciones de respuesta

- 404: el `{id}` no es un agente conocido. Un agente sin reputación **no** es 404.
- 503: RPC caído en endpoints que lo necesitan (`/indexer/status`, `/indexer/run`).
- 200 + page vacía: búsqueda sin matches, o activity de un agente sin eventos (solo posible si se borró activity a mano; un agente recién creado tiene al menos `REGISTERED` cuando el listener corrió).
- Números on-chain salen como JSON number si caben en el rango de Jackson/`BigInteger`; IDs grandes pueden serializarse como number. Clientes que necesiten precisión exacta de `uint256` deberían tratarlos como string — hoy no se fuerza.

---

## Dónde está cada controller

| Clase | Base path |
|---|---|
| `AgentController` | `/api/v1/agents` |
| `SearchController` | `/api/v1/search` |
| `RankingController` | `/api/v1/rankings` |
| `IndexerController` | `/api/v1/indexer` |

DTOs en `agora3.indexer.api.dto`. Cada uno tiene `from(entidad)`. La API no expone entidades JPA.
