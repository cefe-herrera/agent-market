# 03 — Pipeline de indexación

Cómo un log de BSC termina siendo una fila en PostgreSQL. Este documento es el mapa para leer el módulo `indexing` y `blockchain`.

---

## Vista de un tick

Cada `blockchain.poll-interval-ms` (1 s en dev, 3 s por defecto) corre `IndexerScheduler.index()`, que llama `IndexerService.tryProcessNextBlocks()`.

```
IndexerScheduler.index()
        │
        ▼
IndexerService.tryProcessNextBlocks()          ← tryLock; si hay run manual, saltea
        │
        ▼
processNextBlocksInTransaction()               ← @Transactional + lock pesimista
        │
        ├─ 1. Leer checkpoint (FOR UPDATE)
        ├─ 2. Pedir chainHead al RPC
        ├─ 3. safeHead = chainHead − confirmationBlocks
        ├─ 4. Si safeHead ≤ checkpoint → CAUGHT_UP, salir
        ├─ 5. from = checkpoint + 1
        │     to   = min(from + batchSize − 1, safeHead)
        ├─ 6. Si verify-blocks: recorrer bloques, detectar reorg, guardar hashes
        ├─ 7. eth_getLogs(from, to, 3 contratos, 9 topics)
        ├─ 8. LogProcessorService.processLogs(...)
        │        por cada log:
        │          skip si removed o ya en processed_chain_logs
        │          ruteo por address → decode → publish ApplicationEvent
        │          markProcessed
        └─ 9. checkpoint = to, commit
```

Después del **commit**, Spring Modulith entrega los eventos a los listeners de cada módulo (`agents`, `metadata`, `reputation`, …). El indexer ya no participa.

---

## Paso a paso, con clases

### 1. Scheduler y pausa por auth

`IndexerScheduler` atrapa dos fallos distintos:

| Excepción | Comportamiento |
|---|---|
| `BlockchainAuthException` (401/403) | Pausa el scheduler para siempre (`authFailurePaused = true`). Las credenciales no se arreglan solas; martillar el RPC gasta cuota. Se reanuda con `POST /api/v1/indexer/resume` o reinicio. |
| `BlockchainRpcException` (timeout, 5xx, rango inválido) | Loguea warning y reintenta en el próximo tick. |

El circuit breaker de Resilience4j (`blockchain`) envuelve **todas** las llamadas de `BlockchainService`. Si el RPC falla de forma sostenida, abre el circuito y las siguientes llamadas fallan rápido.

### 2. Lock en memoria + lock en base

Dos protecciones, dos problemas:

- `ReentrantLock` en `IndexerService` — una sola corrida por **proceso**. El scheduler usa `tryLock()` (si está ocupado, saltea). `POST /indexer/run` usa `lock()` (espera).
- `@Lock(PESSIMISTIC_WRITE)` en `IndexerCheckpointRepository.findByChainIdForUpdate` — una sola corrida por **base**. Evita `StaleObjectStateException` si hubiera dos instancias.

`processNextBlocks()` no es `@Transactional`. Llama a `self.processNextBlocksInTransaction()` a través del proxy (`@Lazy IndexerService self`) para que la anotación se aplique. Una llamada `this.processNextBlocksInTransaction()` ignoraría el proxy.

### 3. Rango de bloques

```
checkpoint = 118865137
startBlock = 118855138
batchSize  = 10000
chainHead  = 120000000
confirmationBlocks = 12

safeHead = 119999988
from     = 118865138
to       = 118875137
```

El indexer **nunca** escribe más allá de `safeHead`. Eso es la defensa principal contra reorgs.

`batch-size` es cuántos bloques cubre **una corrida**. `max-log-range` es cuántos bloques pide **una llamada RPC**. Si `batch-size > max-log-range`, `BlockchainService.getLogs()` parte el pedido en chunks y concatena.

### 4. Verificación de bloques (reorg)

Solo corre si `blockchain.verify-blocks: true`. En **dev está en `false`** (cada bloque extra es un `eth_getBlockByNumber`; en backfill de 10.000 bloques es prohibitivo).

Con `true`:

1. Pide el bloque N.
2. `BlockProcessorService.findReorgFrom` compara el hash guardado en `indexed_blocks` con el que acaba de devolver el nodo.
3. Si difieren → `ReorgService.rollbackFrom(chainId, N)`:
   - borra `indexed_blocks` desde N
   - borra `processed_chain_logs` desde N
   - publica `ChainReorgEvent` (los módulos borrar su STATE desde N)
   - retrocede el checkpoint a `N − 1`
4. Guarda/actualiza el hash del bloque.

**Limitación conocida:** el rollback borra agentes **creados** en el rango (`created_block >= N`) y filas con `block_number >= N`. No revierte un `Transfer` o `URIUpdated` que modificó un agente creado *antes* de N. Al re-indexar el rango, esos eventos se vuelven a aplicar y el estado converge.

`resetCheckpoint()` **tampoco** borra agentes, feedback ni metadata. Solo checkpoint + `indexed_blocks`. Un reindex desde cero con datos viejos depende de la idempotencia (unique keys), no de un wipe.

### 5. `eth_getLogs`

`BlockchainService.getLogs(from, to, addresses, topics)`:

- `addresses` = Identity + Reputation (si hay address) + Validation (si hay address). Ver `BlockchainProperties.monitoredAddresses()`.
- `topics` = OR de los 9 `topics[0]` (o menos, si reputation/validation están deshabilitados). `filter.addOptionalTopics(...)`.
- Cada chunk respeta `max-log-range`.
- Cada log se mapea a `BlockchainLog` (address, topics, data, blockNumber, txHash, blockHash, **logIndex**, removed).

Un 401 en esta llamada se clasifica como `BlockchainAuthException` (mensaje con URL redactada: `https://host/***`).

### 6. Ruteo y decodificación

`LogProcessorService` no conoce entidades de dominio. Por cada log:

1. Si `removed == true` → skip (log huérfano de una reorg que el nodo todavía reporta).
2. Si `processed_chain_logs` ya tiene `(chainId, txHash, logIndex)` → skip.
3. Compara `address` (case-insensitive) contra los tres registries.
4. Reputation/validation además exigen que el bloque sea `>= effective*StartBlock()` (0 en config = usar `start-block`).
5. `ContractEventDecoder.decodeX(...)` — si el topic no matchea, `Optional.empty()`, se prueba el siguiente decoder del mismo contrato.
6. Publica el evento de dominio correspondiente (`AgentRegisteredEvent`, `FeedbackReceivedEvent`, …).
7. `processedLogService.markProcessed(...)`.

Un log que no matchea ningún decoder se marca igual como procesado. No se reintenta. Si el ABI del contrato cambia, esos logs quedan “tragados” hasta un reset + wipe o un cambio de unique key.

### 7. Publicación y proyección

Los eventos se publican **dentro** de la transacción del indexer. Con Modulith + JPA se escriben en `event_publication` en el mismo commit. Los listeners corren **después** del commit, cada uno en su transacción (`REQUIRES_NEW`) y, en la mayoría, en otro hilo (`@Async` implícito de `@ApplicationModuleListener`).

Cadena típica de un `Registered`:

```
LogProcessor  → AgentRegisteredEvent
AgentEventListener → AgentService.create → agents row + AgentCreatedEvent
                    ├─ ActivityEventListener → agent_activity REGISTERED
                    ├─ MetadataEventListener → fetch HTTP/IPFS (async)
                    └─ PendingFeedbackReplayListener → mueve pending_feedback → agent_feedback
```

---

## Operaciones manuales

| Acción | Qué hace realmente | Qué **no** hace |
|---|---|---|
| `POST /indexer/run` | Una corrida del pipeline, espera el lock | No resetea nada |
| `POST /indexer/run?resetCheckpoint=true` | Borra checkpoint + `indexed_blocks`, luego una corrida desde `start-block` | No borra `agents` ni feedback. Re-procesa logs (idempotente) |
| `POST /indexer/checkpoint?block=N` | Pone `last_block = N`, borra `indexed_blocks` desde `N+1` | No toca STATE. Útil para saltar un hueco vacío o rehacer un tramo |
| `POST /indexer/resume` | Baja `authFailurePaused` | No reintenta el tick al instante; espera el próximo schedule |

Mover el checkpoint **hacia atrás** sin borrar STATE es seguro por las unique keys. Moverlo **hacia adelante** salta bloques: esos logs nunca se verán a menos que se vuelva atrás.

---

## Cómo leer el código en este orden

1. `IndexerScheduler` — cuándo corre y cuándo se pausa
2. `IndexerService.processNextBlocksInTransaction` — el loop
3. `BlockchainService.getLogs` — el RPC
4. `ContractEventDecoder` — firmas ABI y topics
5. `LogProcessorService` — ruteo
6. `ReorgService` + `*ReorgListener` — rollback
7. Listeners de cada módulo — proyección
