# 05 — Modelo de datos

PostgreSQL es el único almacén. Flyway aplica `V1`–`V6` al arrancar. Hibernate después valida las entidades (`ddl-auto: validate`): si una columna Java no coincide con SQL, la app no arranca.

Las UUIDs las genera PostgreSQL (`gen_random_uuid()`) en las migraciones; las entidades JPA las generan en Java (`UUID.randomUUID()`) al insertar. Ambos conviven.

---

## Niveles

Ver [01](01-ARQUITECTURA.md#clasificación-de-los-datos-raw--state--activity--derived). Resumen: RAW y STATE no se regeneran sin RPC; DERIVED sí.

---

## Tablas

### RAW — `indexing`

#### `indexer_checkpoint`

Una fila por `chain_id`. `last_block` = último bloque **completamente** procesado.

Se crea en `start-block − 1`. Unique `(chain_id)`.

#### `indexed_blocks`

Hash de cada bloque visitado cuando `verify-blocks: true`. Unique `(chain_id, block_number)`. Sirve solo para detectar reorg.

En dev (`verify-blocks: false`) esta tabla queda vacía.

#### `processed_chain_logs` (V5)

Dedup de logs. Unique `(chain_id, transaction_hash, log_index)`.

No se limpia en `resetCheckpoint()`. Un reset + reindex re-salta logs ya vistos. Para re-procesar de verdad hay que borrar esta tabla (o el rango) a mano.

### STATE — `agents`

#### `agents` (V1 + `agent_wallet_address` en V5 + `search_vector` en V6)

| Columna | Tipo | Notas |
|---|---|---|
| `id` | UUID | Identidad interna. Es lo que usa la API |
| `chain_id` | BIGINT | 56 en mainnet |
| `onchain_id` | NUMERIC(78,0) | Token ID ERC-721 |
| `registry_address` | VARCHAR(42) | Identity registry |
| `owner_address` | VARCHAR(42) | Dueño actual (cambia con Transfer) |
| `agent_wallet_address` | VARCHAR(42) | Nullable. Desde MetadataSet `agentWallet` |
| `metadata_uri` | TEXT | URI off-chain actual |
| `name`, `description` | | Copiados del JSON al fetch SUCCESS |
| `created_block`, `transaction_hash` | | Del `Registered` original. No se actualizan |
| `search_vector` | tsvector STORED | Generado; no lo toca Java |

Unique `(chain_id, onchain_id)`.

#### `agent_metadata` (V1 + retry en V5)

Una fila por agente. JSON off-chain.

| `status` | Significado |
|---|---|
| `PENDING` | Nunca se intentó, o refresh en curso |
| `SUCCESS` | `raw_json` válido |
| `RETRY` | Falló; `next_retry_at` en el futuro |
| `FAILED` | Agotó `max-retries`; `next_retry_at` NULL (terminal) |

`retry_count` empieza en 0. Cada fallo lo incrementa **antes** de decidir RETRY vs FAILED.

#### `agent_onchain_metadata` (V3)

Un par clave/valor por agente. Unique `(agent_id, metadata_key)`. `metadata_value` es `BYTEA` (el contrato guarda `bytes`).

### STATE — `reputation`

#### `agent_feedback` (V3)

Unique `(chain_id, onchain_agent_id, client_address, feedback_index)`.

`value` es `NUMERIC(78,0)` + `value_decimals SMALLINT`. `revoked` no borra.

#### `agent_feedback_responses` (V3)

Hijas de un feedback. Sin unique de negocio (un mismo responder podría appender más de una vez).

#### `pending_feedback` (V5)

Misma forma que un feedback, sin `agent_id`. Unique idéntico al de `agent_feedback`. Se borra al replay o en reorg.

### STATE — `validation`

#### `agent_validation_requests` (V4)

Unique `(chain_id, request_hash)`. `request_hash` se guarda lowercase.

#### `agent_validation_responses` (V4)

Unique `(request_id, tag)`. `response SMALLINT` (0–100).

### ACTIVITY

#### `agent_activity` (V1 + unique V5)

| `activity_type` | Origen |
|---|---|
| `REGISTERED` | `AgentCreatedEvent` |
| `URI_UPDATED` | `AgentUriUpdatedEvent` |
| `TRANSFERRED` | `AgentTransferredEvent` |
| `FEEDBACK_RECEIVED` | `FeedbackRecordedEvent` |
| `VALIDATION_RESPONSE` | `ValidationRespondedEvent` |

Unique `(agent_id, activity_type, transaction_hash, block_number)` — un mismo tx puede producir tipos distintos (Registered + Transfer del mint).

### DERIVED

#### `agent_reputation`

Una fila por agente. `score` 0–100. `factors` JSONB con los ingredientes del último cálculo.

#### `agent_rankings`

Unique `(ranking_type, agent_id)`. `RankingService` **borra y reescribe** todas las filas de un tipo en cada tick. No es incremental.

### Infra Modulith

#### `event_publication` (V2)

Registro de entregas. No es dominio. No borrar en caliente: se pierde el retry de listeners fallidos.

---

## Migraciones, en orden

| Archivo | Qué agrega |
|---|---|
| `V1__baseline.sql` | checkpoint, indexed_blocks, agents, metadata, activity, reputation, rankings |
| `V2__modulith_event_publication.sql` | `event_publication` |
| `V3__erc8004_events.sql` | onchain metadata, feedback, feedback responses |
| `V4__validation_registry.sql` | validation requests/responses |
| `V5__phase_b_completion.sql` | wallet, retry columns, pending_feedback, processed_chain_logs, unique de activity |
| `V6__phase_c_search.sql` | `pg_trgm`, `search_vector`, GIN trigram |

Flyway guarda el historial en `flyway_schema_history`. No editar una migración ya aplicada. Si hay que corregir, `V7__...`.

`pg_trgm` es extensión. En Neon/managed suele estar permitida. En un Postgres local puede requerir privilegios de superuser la primera vez.

---

## Tipos que duelen si se cambian

| Java | SQL | Por qué |
|---|---|---|
| `BigInteger` | `NUMERIC(78,0)` | `uint256` |
| `short` + `columnDefinition = "SMALLINT"` | `SMALLINT` | Hibernate `validate` no acepta `int` ↔ `SMALLINT` |
| `String` 42 chars | `VARCHAR(42)` | address `0x` + 40 hex |
| `String` 66 chars | `VARCHAR(66)` | hash `0x` + 64 hex |
| `Map<String,Object>` + `@JdbcTypeCode(JSON)` | `JSONB` | `factors`, `raw_json` |

---

## Integridad referencial

Casi todo STATE cuelga de `agents(id) ON DELETE CASCADE`. Borrar un agente (reorg de un `Registered`) se lleva metadata, activity, feedback, reputation, rankings, validations.

`agent_feedback_responses` cuelga de `agent_feedback`. `agent_validation_responses` cuelga de `agent_validation_requests`.

`pending_feedback` y `processed_chain_logs` **no** referencian `agents`: sobreviven a un delete de agente.

---

## Índices que importan al leer queries

| Índice | Query |
|---|---|
| `idx_agents_search_vector` GIN | `search_vector @@ to_tsquery` |
| `idx_agents_*_trgm` GIN | `ILIKE '%q%'` y `similarity()` |
| `idx_agent_activity_agent (agent_id, timestamp DESC)` | `GET /agents/{id}/activity` |
| Unique activity | dedup al grabar |
| `idx_agent_feedback_agent` | listado de feedback |
| Unique feedback / pending | idempotencia |

No hay índice por `onchain_id` suelto: siempre se busca con `chain_id` (unique compuesto).
