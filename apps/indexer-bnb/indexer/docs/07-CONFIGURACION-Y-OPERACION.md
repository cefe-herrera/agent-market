# 07 — Configuración y operación

## Layout del repo

```
indexer/                          ← raíz git
└── indexer/                      ← módulo Maven (aquí se corre)
    ├── pom.xml
    ├── local.properties          ← git-ignored, secretos
    ├── local.properties.example
    ├── src/main/java/agora3/indexer/…
    ├── src/main/resources/
    │   ├── application.yml
    │   ├── application-dev.yml
    │   └── db/migration/V1…V6
    └── docs/
```

El perfil activo por defecto es `dev` (`application.yml` → `spring.profiles.active: dev`).

---

## Secretos

`application.yml` importa, en este orden (env gana sobre archivo):

```
optional:file:./local.properties
optional:file:./indexer/local.properties
```

El cwd al correr desde el IDE suele ser `indexer/indexer/`, así que el primer path alcanza. Desde la raíz del repo, el segundo.

`local.properties.example`:

```properties
DB_URL=jdbc:postgresql://<host>/neondb?sslmode=require&channel_binding=require
DB_USERNAME=<user>
DB_PASSWORD=<password>
BLOCKCHAIN_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/<api-key>
```

Nunca commitear `local.properties`. Está en `.gitignore`.

La app arranca sin el archivo si las variables existen en el entorno (CI / prod).

---

## Properties

### `blockchain.*`

| Key | Default (yml) | Dev | Rol |
|---|---|---|---|
| `rpc-url` | — | `${BLOCKCHAIN_RPC_URL}` | Endpoint JSON-RPC. Obligatorio |
| `chain-id` | — | `56` | BSC mainnet |
| `registry-address` | — | `0x8004A1…a432` | Identity. Regex `0x` + 40 hex |
| `reputation-registry-address` | — | `0x8004BA…9b63` | Vacío (`""`) desactiva reputation |
| `validation-registry-address` | — | `0x8004Cb…4272` | Vacío desactiva validation. Hoy el contrato no existe en mainnet |
| `start-block` | — | `118855138` | Deploy de Identity |
| `reputation-start-block` | `0` | `0` | `0` = usar `start-block` |
| `validation-start-block` | `0` | `0` | Idem |
| `batch-size` | `1000` | `10000` | Bloques por corrida |
| `max-log-range` | `2000` | `10000` | Bloques por `eth_getLogs` |
| `poll-interval-ms` | `3000` | `1000` | Scheduler indexer **y** rankings |
| `confirmation-blocks` | `12` | `12` | Margen de reorg (~36 s en BSC) |
| `verify-blocks` | `true` | `false` | Hash-check por bloque |

`BlockchainProperties` es un `record` `@Validated`. Una address malformada impide el arranque.

Cambiar de red es cambiar **juntos** `chain-id`, las tres addresses y `start-block`. Las direcciones de testnet están comentadas en `local.properties.example`.

### `metadata.*`

| Key | Default | Rol |
|---|---|---|
| `ipfs-gateway` | `https://ipfs.io/ipfs/` | Prefijo para `ipfs://CID` |
| `fetch-timeout-seconds` | `30` | Timeout del `WebClient` |
| `max-retries` | `5` | Intentos antes de `FAILED` |
| `retry-initial-delay-seconds` | `30` | Primer backoff |
| `retry-max-delay-seconds` | `3600` | Techo (1 h) |
| `retry-poll-interval-ms` | `60000` | Tick del `MetadataRetryScheduler` |

Backoff: `min(initial * 2^(retryCount-1), maxDelay)`. Intento 1 → 30 s, 2 → 60 s, 3 → 120 s, … hasta 3600.

### Datasource (solo `application-dev.yml`)

`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`. JPA `ddl-auto: validate`. Flyway on. `open-in-view: false`. Timezone JDBC UTC.

### Resilience4j (dev)

Instancia `blockchain`: timeout 60 s, sliding window 10, failure rate 50 %, wait 30 s en open.

---

## Arranque

Requisitos: Java 21, Maven wrapper (`mvnw` / `mvnw.cmd`), PostgreSQL alcanzable, RPC con cuota.

```bash
cd indexer          # el módulo Maven
cp local.properties.example local.properties
# editar secretos
./mvnw spring-boot:run          # Unix
.\mvnw.cmd spring-boot:run      # Windows
```

El usuario de este repo suele correr desde IntelliJ. No hay Docker en el proyecto.

Al arrancar deberías ver:

```
Indexer ready — chainId=56 registry=0x8004A1… startBlock=118855138 checkpoint=… chainHead=…
```

Si el RPC está caído: warning, la API igual sirve lo ya indexado.

---

## Verificación

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/api/v1/indexer/status
curl "http://localhost:8080/api/v1/search?q=317675"
```

Swagger: `http://localhost:8080/swagger-ui.html`.

Logs útiles:

| Mensaje | Significado |
|---|---|
| `Registered: agentId=…` | Log Identity decodificado |
| `MetadataSet: agentId=… key=agentWallet` | Wallet on-chain |
| `NewFeedback: …` | Feedback decodificado |
| `Indexed blocks X to Y … (N logs, M blocks behind head)` | Tick productivo |
| `Indexer caught up` | Nada que hacer (se loguea como máximo 1/min) |
| `Scheduled indexing paused` | 401 — arreglar API key y `POST /indexer/resume` |
| `Rolling back from block` | Reorg (solo con `verify-blocks: true`) |
| `Metadata fetch permanently failed` | Agotó retries |

---

## Runbooks

### El indexer no avanza

1. `GET /indexer/status` — ¿`caughtUp`? ¿`blocksRemaining`?
2. Logs: ¿`paused` por auth? ¿`RPC unavailable`?
3. Alchemy/dashboard: ¿key válida, cuota?
4. Checkpoint vs `start-block`: si alguien movió el checkpoint al head, no hay backfill.

### 401 Must be authenticated

La key de Alchemy expiró o el path de la URL está mal. Corregir `BLOCKCHAIN_RPC_URL`. `POST /api/v1/indexer/resume`.

### Flyway falla en V6 (`pg_trgm`)

La extensión no está permitida en ese Postgres. En Neon: habilitar `pg_trgm` en el dashboard o correr `CREATE EXTENSION pg_trgm;` como rol que pueda. Sin V6, `search_vector` no existe y `GET /search?q=` rompe.

### Hibernate `SMALLINT` vs `INTEGER`

Ya corregido en entidades (`short` + `columnDefinition`). Si se agrega una columna `SMALLINT` nueva, el campo Java **no** puede ser `int`.

### Quiero reindexar un tramo

```
POST /api/v1/indexer/checkpoint?block=118860000
```

El próximo tick (o `POST /run`) procesa desde `118860001`. Los logs ya en `processed_chain_logs` se saltean. Para forzar re-decode:

```sql
DELETE FROM processed_chain_logs
 WHERE chain_id = 56 AND block_number >= 118860001;
```

### Quiero empezar de cero (datos incluidos)

`resetCheckpoint` no alcanza. Truncar STATE a mano, respetando FKs, o dropear y dejar que Flyway recree (solo en bases descartables):

```sql
-- orden aproximado; CASCADE cubre la mayoría
TRUNCATE processed_chain_logs, pending_feedback, event_publication,
         indexer_checkpoint, indexed_blocks
         CASCADE;
-- agents CASCADE se lleva metadata, activity, feedback, reputation, rankings, validations
TRUNCATE agents CASCADE;
```

Después `POST /indexer/run` o esperar al scheduler.

### Metadata de un agente quedó FAILED

Hoy no hay endpoint de retry. Opciones:

- Bajar `retry_count` y setear `next_retry_at = now()` en `agent_metadata` → el scheduler la levanta.
- `URIUpdated` on-chain (o simular no se puede): un refresh real solo ocurre por evento o por código.
- Reiniciar no reintenta `FAILED` (no tiene `next_retry_at`).

### Validation no produce filas

Esperado en mainnet: el contrato no está desplegado. Dejar `validation-registry-address` o aceptar 0 logs. Cuando exista, no hace falta código nuevo; sí confirmar el bloque de deploy en `validation-start-block`.

---

## Costos RPC (orden de magnitud)

En BSC, ~28.800 bloques/día.

| Escenario | Llamadas |
|---|---|
| Catch-up, `verify-blocks: false`, batch 10k, max-log-range 10k | 1 `eth_blockNumber` + 1 `eth_getLogs` por tick |
| Backfill de 1.000.000 bloques | ~100 ticks × (1 + 1) ≈ 200 llamadas, más reintentos |
| `verify-blocks: true` | +1 `eth_getBlockByNumber` **por bloque** — no usar en backfill |

`0 logs from registry` en un rango es normal: los eventos son escasos. No significa que el filtro esté mal. Contrastar con BscScan → Events en el mismo rango.

---

## Qué no está en el repo

- Docker / docker-compose
- Testcontainers
- Tests (el `src/test` de starters existe en pom; no hay tests de dominio escritos)
- CI
- Perfil `prod` (`application-prod.yml`)
