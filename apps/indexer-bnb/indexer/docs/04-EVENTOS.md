# 04 — Eventos

Dos capas: **eventos on-chain** (logs de los contratos) y **eventos internos** (records en `agora3.indexer.common.event`). El indexer traduce los primeros en los segundos; los módulos reaccionan solo a los segundos.

---

## Eventos on-chain (9)

Declarados como `org.web3j.abi.datatypes.Event` en `ContractEventDecoder`. El `topics[0]` se calcula con `EventEncoder.encode(...)`. Si cambia la firma Solidity, el topic cambia y el decoder deja de reconocer el log **sin error**.

### Identity Registry — `0x8004A1…a432`

#### `Registered(uint256 indexed agentId, string agentUri, address indexed owner)`

Nace un agente. El `agentId` **es** el token ID del ERC-721.

| Origen | Campo interno |
|---|---|
| `topics[1]` | `agentId` |
| `topics[2]` | `owner` |
| `data` | `agentUri` → `metadataUri` |

Publica `AgentRegisteredEvent`.

#### `URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)`

Cambia la URI de metadata off-chain.

Publica `AgentUriUpdatedEvent`. `AgentService` actualiza `agents.metadata_uri`. `MetadataEventListener` hace `refresh` (force) del JSON.

#### `Transfer(address indexed from, address indexed to, uint256 indexed tokenId)`

Cambio de dueño. Heredado de ERC-721. `tokenId` = `agentId`.

Publica `AgentTransferredEvent`. Actualiza `agents.owner_address`.

El mint inicial también emite `Transfer(0x0 → owner, tokenId)` junto con `Registered`. Ambos se procesan; el Transfer sobre un agente que todavía no existe se ignora (`ifPresent`). El `Registered` crea la fila.

#### `MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)`

Par clave/valor on-chain. El `indexedKey` en topics es el **hash** del string (tipos dinámicos indexados no guardan el valor). El decoder lee `key` y `value` del `data`.

Publica `AgentMetadataSetEvent`. `OnchainMetadataService` hace upsert en `agent_onchain_metadata`. Si `key == "agentWallet"`, `OnchainMetadataValueDecoder` intenta extraer una address (20 bytes raw o string `0x…`) y la escribe en `agents.agent_wallet_address`.

### Reputation Registry — `0x8004BA…9b63`

#### `NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed tag1, string tag2, string endpoint, string feedbackURI, string extra, bytes32 feedbackHash)`

Un cliente puntúa un agente. `value` + `valueDecimals` reemplazan un float: `450` + `2` = **4.50**. Ver `AgentFeedback.normalizedValue()`.

Publica `FeedbackReceivedEvent`. Si el agente no existe, va a `pending_feedback`. Si existe, a `agent_feedback` y luego `FeedbackRecordedEvent`.

#### `FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)`

Marca `revoked = true`. Recalcula reputación. No borra la fila.

#### `ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)`

Respuesta a un feedback existente. Si el feedback no está (aún pending, o agente desconocido), se descarta.

### Validation Registry — `0x8004Cb…4272`

**No desplegado en BSC mainnet.** El código está; no llegan logs.

#### `ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash)`

Identificado por `requestHash` (normalizado a lowercase). Si el agente no existe, se loguea y se descarta (no hay cola pending, a diferencia del feedback).

#### `ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)`

`response` es 0–100. Unique `(request_id, tag)`: un request puede tener varias respuestas, una por tag. Dispara recálculo de reputación y activity `VALIDATION_RESPONSE`.

---

## Eventos internos

Todos son `record` en `agora3.indexer.common.event`. No tienen lógica. `common` es módulo `OPEN` para que cualquier módulo los importe.

### Publicados por `indexing` (traducción 1:1 de logs)

| Evento | Trigger on-chain |
|---|---|
| `AgentRegisteredEvent` | `Registered` |
| `AgentUriUpdatedEvent` | `URIUpdated` |
| `AgentTransferredEvent` | `Transfer` |
| `AgentMetadataSetEvent` | `MetadataSet` |
| `FeedbackReceivedEvent` | `NewFeedback` |
| `FeedbackRevokedEvent` | `FeedbackRevoked` |
| `FeedbackResponseAppendedEvent` | `ResponseAppended` |
| `ValidationRequestedEvent` | `ValidationRequest` |
| `ValidationRespondedEvent` | `ValidationResponse` |
| `ChainReorgEvent` | hash de bloque distinto (solo si `verify-blocks`) |

`AgentRegisteredEvent` usa `agentId` on-chain (`BigInteger`). Todavía no hay UUID interno: el agente no existe.

### Publicados por módulos de dominio

| Evento | Quién lo publica | Cuándo |
|---|---|---|
| `AgentCreatedEvent` | `AgentService.create` | Tras insertar en `agents`. Trae UUID interno + `onchainId` |
| `FeedbackRecordedEvent` | `FeedbackService` / `PendingFeedbackService` | Tras persistir feedback (no al encolar pending) |
| `ActivityRecordedEvent` | `ActivityService` | Tras insertar una fila de activity |
| `MetadataFetchedEvent` | `MetadataService` | Tras un fetch SUCCESS |

---

## Cadena de listeners

`@ApplicationModuleListener` = `@Async` + `@Transactional(REQUIRES_NEW)` + `@TransactionalEventListener(AFTER_COMMIT)`.

El listener **no** lleva `@Transactional` propio. Delega a un servicio que sí lo tiene. Ver [01 — Arquitectura](01-ARQUITECTURA.md#trampa-importante).

### Identity

```
AgentRegisteredEvent
  └─ AgentEventListener.onAgentRegistered
       └─ AgentService.create
            └─ AgentCreatedEvent
                 ├─ ActivityEventListener          → REGISTERED
                 ├─ MetadataEventListener          → fetch (async, skip si URI vacía)
                 └─ PendingFeedbackReplayListener  → replay pending_feedback

AgentUriUpdatedEvent
  ├─ AgentEventListener                 → agents.metadata_uri
  ├─ MetadataEventListener              → refresh forzado
  └─ ActivityEventListener              → URI_UPDATED

AgentTransferredEvent
  ├─ AgentEventListener                 → agents.owner_address
  └─ ActivityEventListener              → TRANSFERRED

AgentMetadataSetEvent
  └─ MetadataEventListener              → upsert onchain metadata
                                         + agentWallet → agents.agent_wallet_address
```

### Reputation

```
FeedbackReceivedEvent
  └─ ReputationEventListener → FeedbackService.recordFeedback
        ├─ (agente ausente) PendingFeedbackService.queue
        └─ (agente presente) save + FeedbackRecordedEvent + ReputationService.calculate

FeedbackRecordedEvent
  └─ ActivityEventListener → FEEDBACK_RECEIVED
       └─ ActivityRecordedEvent → ReputationEventListener → calculate de nuevo

FeedbackRevokedEvent
  └─ ReputationEventListener → revoke + calculate

FeedbackResponseAppendedEvent
  └─ ReputationEventListener → append (sin recálculo)

ActivityRecordedEvent / MetadataFetchedEvent / ValidationRespondedEvent
  └─ ReputationEventListener → calculate
```

Un `NewFeedback` de un agente conocido dispara **dos** cálculos de reputación: uno al persistir el feedback y otro al grabar la activity. Es redundante, no incorrecto.

### Validation

```
ValidationRequestedEvent  → ValidationEventListener → ValidationService.recordRequest
ValidationRespondedEvent  → ValidationEventListener → recordResponse
                          → ActivityEventListener   → VALIDATION_RESPONSE
                          → ReputationEventListener → calculate
```

### Reorg

```
ChainReorgEvent
  ├─ AgentReorgListener       → delete agents where created_block >= from
  ├─ ActivityReorgListener    → delete activity where block_number >= from
  ├─ ReputationReorgListener  → delete responses, feedback, pending desde from
  ├─ ValidationReorgListener  → delete responses, requests desde from
  └─ MetadataReorgListener    → delete agent_onchain_metadata desde from
```

No hay listener que borre `agent_metadata` (el JSON off-chain). Queda huérfano si el agente se borra por CASCADE (`ON DELETE CASCADE` desde `agents`). Si el agente sobrevive (fue creado antes de `from`), su metadata off-chain no se toca.

---

## At-least-once

`event_publication` (migración V2) registra cada entrega. Un listener que lanza deja `completion_date` NULL. Visible en `/actuator/modulith`.

Consecuencia: un listener **debe ser idempotente**. Lo son: unique keys + `existsBy` / `findBy` antes de insertar. Re-entregar un `AgentCreatedEvent` no duplica el agente (`create` retorna el existente y **no** vuelve a publicar `AgentCreatedEvent`).

---

## Cómo agregar un evento nuevo

1. Declarar el `Event` web3j en `ContractEventDecoder` con los tipos **exactos** del ABI (indexed vs no).
2. Sumarlo a `identityTopics` / `reputationTopics` / `validationTopics`.
3. Agregar `decodeX` y el `ifPresent` en `LogProcessorService`.
4. Crear el record en `common.event`.
5. Crear listener + persistencia en el módulo dueño.
6. Si debe aparecer en el timeline: factory en `AgentActivity` + método en `ActivityService` + rama en `ActivityEventListener`.
7. Si debe revertirse en reorg: delete por `block_number` en el `*ReorgListener` de ese módulo.
8. Migración Flyway si hay tabla nueva.
