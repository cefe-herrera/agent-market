# 02 — Glosario y conceptos

Definiciones necesarias para entender el código sin conocimiento previo de blockchain.

---

## Conceptos de blockchain

### Bloque

Un lote de transacciones confirmado por la red, con número secuencial (`blockNumber`) y hash propio. En BSC se produce **uno cada ~3 segundos**, lo que significa ~28.800 bloques por día.

Cada bloque referencia el hash de su padre (`parentHash`). Esa cadena de hashes es lo que permite detectar una reorganización: si el bloque N que teníamos guardado tiene otro hash del que ahora reporta el nodo, la cadena cambió bajo nuestros pies.

### Transacción y recibo

Una transacción es una operación firmada. Al ejecutarse produce un *recibo* que incluye los **logs** que emitieron los contratos involucrados.

### Log (evento)

Cuando un contrato Solidity ejecuta `emit MiEvento(...)`, el nodo guarda una estructura:

| Campo | Contenido |
|---|---|
| `address` | Contrato que emitió el evento |
| `topics[0]` | Hash keccak256 de la firma del evento — identifica *qué* evento es |
| `topics[1..3]` | Hasta 3 parámetros marcados `indexed`, uno por topic |
| `data` | Los parámetros **no** indexados, concatenados y codificados en ABI |
| `blockNumber`, `transactionHash`, `logIndex` | Ubicación exacta del log |
| `removed` | `true` si el log quedó huérfano por una reorg |

La combinación `(transactionHash, logIndex)` identifica un log de forma única. Es la clave que usa la tabla `processed_chain_logs` para deduplicar.

### Topic

`topics[0]` es el hash de la firma textual del evento. Ejemplo:

```
keccak256("Registered(uint256,string,address)") = 0x...
```

`ContractEventDecoder` calcula estos hashes al construirse con `EventEncoder.encode(...)` de web3j. Filtrar por topic en `eth_getLogs` es lo que evita traer todos los logs de un contrato.

**Consecuencia práctica:** si cambia la firma de un evento en el contrato (aunque sea el nombre de un tipo), el topic cambia y el decoder deja de reconocerlo silenciosamente. Siempre verificar contra un log real en BscScan.

### Parámetro `indexed`

En Solidity, `event Registered(uint256 indexed agentId, string agentUri, address indexed owner)`:

- `agentId` → `topics[1]` (indexado, filtrable)
- `owner` → `topics[2]` (indexado, filtrable)
- `agentUri` → dentro de `data` (no indexado, hay que decodificarlo)

Los tipos dinámicos (`string`, `bytes`) marcados `indexed` guardan el **hash** del valor, no el valor. Por eso el `metadataKey` de `MetadataSet` aparece declarado como indexado en el evento pero el decoder lo lee del `data`.

### `eth_getLogs`

La llamada JSON-RPC que hace el trabajo pesado. Recibe rango de bloques, lista de direcciones y lista de topics, y devuelve todos los logs que matchean.

Los proveedores limitan el rango (típicamente 2.000–10.000 bloques). Por eso `BlockchainService.getLogs()` parte el pedido en chunks de `blockchain.max-log-range` y concatena los resultados.

### Reorganización (reorg)

La punta de la cadena no es definitiva. Si dos mineros producen bloques casi simultáneos, la red puede descartar unos bloques y adoptar otros. Los logs de los bloques descartados **nunca ocurrieron** desde el punto de vista final.

Dos defensas en este sistema:

1. **`confirmationBlocks`** — nunca indexar más allá de `chainHead - confirmationBlocks`. Con 12 bloques en BSC son ~36 segundos de margen. La mayoría de las reorgs se resuelven muy por debajo de eso.
2. **Verificación de hashes** — con `verify-blocks: true`, se guarda el hash de cada bloque indexado. Si al re-visitarlo el hash difiere, se dispara `ChainReorgEvent` y todos los módulos borran lo escrito desde ese bloque.

### Chain ID

Identificador numérico de la red. Este proyecto trabaja con:

| Red | Chain ID |
|---|---|
| BSC mainnet | 56 |
| BSC testnet | 97 |

Todas las tablas de estado llevan `chain_id`, así que la misma base puede alojar varias redes sin colisión.

### CREATE2 y direcciones deterministas

Los contratos ERC-8004 se despliegan con `CREATE2`, lo que hace que la dirección resultante dependa del bytecode y una salt, **no** de la cuenta que despliega ni del nonce. Por eso los mismos contratos tienen direcciones con prefijo reconocible en todas las cadenas:

| Registry | Dirección | Prefijo |
|---|---|---|
| Identity | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004A…` |
| Reputation | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | `0x8004B…` |
| Validation | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` | `0x8004C…` |

El `8004` es el número del EIP; las letras A/B/C corresponden a Identity/Reputation/Validation. Nemotecnia deliberada de los autores del estándar.

### Bloque de deploy (`start-block`)

No tiene sentido escanear desde el bloque 0: el contrato no existía. `blockchain.start-block` es el bloque de creación del contrato. Para este proyecto en BSC mainnet: **118855138**.

Se obtiene en BscScan → dirección del contrato → *Contract Creation* → número de bloque.

---

## Conceptos de ERC-8004

ERC-8004 es un estándar de **identidad y reputación de agentes de IA** on-chain. Define tres registries independientes.

### Identity Registry

Un NFT (ERC-721) por agente. El token ID **es** el ID del agente.

| Evento | Significado |
|---|---|
| `Registered` | Nace un agente. Trae `agentId`, `owner`, `agentUri` |
| `URIUpdated` | Cambió la URI de metadata |
| `Transfer` | Cambió el dueño (herencia de ERC-721) |
| `MetadataSet` | Se escribió un par clave/valor arbitrario on-chain |

`MetadataSet` es el mecanismo de extensión. La clave más relevante en producción es `agentWallet`: la dirección que el agente usa para operar, distinta del `owner` que lo posee.

### Reputation Registry

Feedback firmado por clientes que interactuaron con un agente.

| Evento | Significado |
|---|---|
| `NewFeedback` | Un cliente puntúa un agente |
| `FeedbackRevoked` | El cliente retira su feedback |
| `ResponseAppended` | El agente (u otro) responde a un feedback |

El feedback trae `value` + `valueDecimals` en lugar de un float, porque Solidity no tiene punto flotante. `value = 450, valueDecimals = 2` significa **4.50**. La conversión vive en `AgentFeedback.normalizedValue()`.

También trae `tag1`, `tag2` (categorías libres), `endpoint` (qué servicio se consumió) y `feedbackUri`/`feedbackHash` (detalle off-chain más su hash de integridad).

### Validation Registry

Atestiguaciones de validadores externos: un tercero verifica el comportamiento de un agente y publica un puntaje.

| Evento | Significado |
|---|---|
| `ValidationRequest` | Se pide validar un agente. Identificado por `requestHash` |
| `ValidationResponse` | El validador responde con `response` (0–100) y un `tag` |

Un request puede tener varias responses, una por `tag` (de ahí el unique `(request_id, tag)`).

**Estado actual:** el contrato de validación no está desplegado en BSC mainnet. Está configurado y el código lo maneja, pero no llegan eventos hasta que exista.

---

## Conceptos internos del proyecto

### Checkpoint

Una única fila en `indexer_checkpoint` por `chain_id`, con `last_block` = el último bloque completamente procesado. Es el estado de avance del pipeline.

Se inicializa en `start-block - 1` (para que el primer rango procesado empiece exactamente en `start-block`).

### Safe head

```
chainHead = eth_blockNumber()
safeHead  = chainHead - confirmationBlocks
```

El indexer **nunca** pasa de `safeHead`. Cuando `safeHead <= checkpoint`, el estado es `CAUGHT_UP` y no hay nada que hacer.

### Batch

Cuántos bloques procesa una corrida (`blockchain.batch-size`). Con 10.000 en dev y bloques de 3s, cada corrida cubre ~8 horas de cadena. El scheduler dispara cada segundo, así que el backfill avanza rápido.

Es distinto de `max-log-range`, que es cuántos bloques pide por llamada RPC. Si `batch-size` > `max-log-range`, una corrida hace varias llamadas.

### Log dedup

`processed_chain_logs` guarda `(chain_id, transaction_hash, log_index)` de cada log procesado. Antes de decodificar, `LogProcessorService` consulta esa tabla. Es lo que hace seguro re-procesar rangos tras un reinicio, una reorg o un movimiento manual de checkpoint.

### Pending feedback

Los logs llegan ordenados por bloque, pero un `NewFeedback` puede referirse a un agente cuyo `Registered` está en un bloque anterior a nuestro `start-block`, o cuyo procesamiento asíncrono aún no completó.

En vez de descartar el feedback, se guarda en `pending_feedback`. Cuando aparece el `AgentCreatedEvent` de ese agente, `PendingFeedbackReplayListener` lo reproduce y lo mueve a `agent_feedback`.

### Estados de metadata

`agent_metadata.status` es una máquina de estados:

```
PENDING ──fetch ok──► SUCCESS
   │
   └──fetch falla──► RETRY ──(hasta max-retries)──► FAILED
                       ▲                              │
                       └──── backoff exponencial ─────┘
```

`RETRY` guarda `next_retry_at`; `FAILED` lo deja en `NULL`, lo que lo vuelve terminal (el scheduler solo levanta filas con `next_retry_at <= now`).

### Actividad

`agent_activity` es el timeline de un agente. Cada fila es un hecho on-chain que lo involucró:

| `activity_type` | Origen |
|---|---|
| `REGISTERED` | `AgentCreatedEvent` |
| `URI_UPDATED` | `AgentUriUpdatedEvent` |
| `TRANSFERRED` | `AgentTransferredEvent` |
| `FEEDBACK_RECEIVED` | `FeedbackRecordedEvent` |
| `VALIDATION_RESPONSE` | `ValidationRespondedEvent` |

Alimenta el endpoint `/activity`, el factor de actividad de la reputación y el ranking `ACTIVE`.

### Full-text search vs trigram

La migración V6 instala dos mecanismos complementarios:

| Mecanismo | Para qué sirve | Índice |
|---|---|---|
| **`tsvector` / `to_tsquery`** | Buscar por palabras completas o prefijos (`trad:*` encuentra "trading") | GIN sobre `search_vector` |
| **`pg_trgm` / `similarity()`** | Tolerar typos y ordenar por parecido; acelerar `ILIKE '%x%'` | GIN con `gin_trgm_ops` |

La query de búsqueda usa **ambos** en el `WHERE` (unidos por `OR`) y `similarity()` en el `ORDER BY` para rankear.

La columna `search_vector` es `GENERATED ALWAYS AS ... STORED`: PostgreSQL la recalcula automáticamente en cada `INSERT`/`UPDATE` de `agents`. No hay que mantenerla desde Java.

### Weights de tsvector (A/B/C)

`setweight(..., 'A')` marca la importancia del término. `A` > `B` > `C` > `D`. Aquí:

- `A` → `name`
- `B` → `description`
- `C` → `owner_address` y `agent_wallet_address`

Los weights solo importan si se usa `ts_rank`. La query actual ordena por `similarity()` de trigram, así que hoy los weights están declarados pero no influyen en el orden. Quedan disponibles para cuando se quiera un ranking full-text puro.
