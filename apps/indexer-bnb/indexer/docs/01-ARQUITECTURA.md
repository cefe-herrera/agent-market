# 01 — Arquitectura

## Stack

| Componente | Versión | Rol |
|---|---|---|
| Java | 21 | Records, sealed types, switch expressions, virtual-thread-ready |
| Spring Boot | 4.1.1 | Base de la aplicación |
| Spring Modulith | 2.1.0 | Límites de módulo verificados + eventos transaccionales persistidos |
| PostgreSQL | 14+ (Neon en dev) | Único almacén de estado |
| Flyway | (gestionado por Boot) | Migraciones versionadas `V1`–`V6` |
| web3j | 4.12.2 | Cliente JSON-RPC + codec ABI |
| Resilience4j | via Spring Cloud 2025.1.2 | Circuit breaker sobre llamadas RPC |
| springdoc-openapi | 3.1.0 | Swagger UI en `/swagger-ui.html` |
| Micrometer + Prometheus | runtime | Métricas en `/actuator/prometheus` |

Notas sobre dependencias:

- Están **ambos** `spring-boot-starter-webmvc` (la API REST, servlet, Tomcat) y `spring-boot-starter-webflux` (solo por `WebClient`, usado para descargar metadata off-chain). No es un error: la app es MVC; WebFlux entra únicamente como cliente HTTP.
- `spring-modulith-starter-jpa` es lo que hace que los eventos se persistan en la tabla `event_publication`. Sin él, un evento perdido en un listener asíncrono se perdería para siempre.
- PostgreSQL requiere las extensiones `pgcrypto` (por `gen_random_uuid()`, disponible nativamente desde PG 13) y `pg_trgm` (creada por la migración V6).

---

## Por qué monolito modular y no microservicios

Un indexer es un **pipeline con un cuello de botella secuencial**: hay un solo checkpoint que avanza y debe avanzar en orden. Partirlo en servicios agrega coordinación distribuida sin ganar paralelismo real en la parte crítica.

La modularidad se consigue con Spring Modulith: cada paquete de primer nivel bajo `agora3.indexer` es un módulo con dependencias **declaradas y verificadas en tiempo de test**. Si un módulo importa una clase de otro que no declaró, la verificación falla. Eso da los beneficios de límites explícitos sin el costo de la red.

---

## Los diez módulos

```
agora3.indexer
├── common       (OPEN)  eventos de dominio + excepciones
├── blockchain           web3j, RPC, decodificación ABI
├── indexing            checkpoint, scheduler, ruteo de logs, reorg
├── agents              entidad Agent (STATE)
├── metadata            fetch off-chain + metadata on-chain
├── activity            timeline de eventos por agente
├── reputation          feedback + cálculo de score
├── validation          requests/responses de validadores
├── ranking             rankings materializados
└── api          (OPEN)  controllers REST + DTOs
```

### Grafo de dependencias permitidas

Declarado en cada `package-info.java`:

| Módulo | `allowedDependencies` |
|---|---|
| `common` | — (tipo `OPEN`) |
| `blockchain` | `common` |
| `indexing` | `common`, `blockchain` |
| `agents` | `common` |
| `metadata` | `common`, `agents` |
| `activity` | `common`, `agents` |
| `validation` | `common`, `agents` |
| `reputation` | `common`, `activity`, `agents`, `validation` |
| `ranking` | `common`, `reputation`, `activity`, `agents` |
| `api` | `common`, `agents`, `metadata`, `ranking`, `activity`, `indexing`, `reputation`, `validation` (tipo `OPEN`) |

Leído como capas, de abajo hacia arriba:

```
                    api
                     │
        ┌────────────┼────────────┐
        │            │            │
     ranking     reputation    indexing
        │         │  │  │          │
        └──► activity │ validation │
                 │    │      │     │
                 └── agents ─┘  blockchain
                        │            │
                        └─► common ◄─┘
```

### Reglas que se derivan del grafo

1. **`indexing` no conoce el dominio.** Solo sabe de bloques, logs y publicar eventos. No importa `agents` ni `reputation`. Cambiar la fórmula de reputación no toca el indexer.
2. **`agents` es la raíz del dominio.** Solo depende de `common`. Es el módulo más estable.
3. **`common` es `OPEN`** porque contiene los records de evento, que por definición cruzan todos los límites. No tiene lógica.
4. **`api` es `OPEN`** porque los DTOs necesitan leer entidades de todos los módulos para mapearlas.
5. **La comunicación hacia "arriba" es solo por eventos.** `agents` nunca llama a `activity`; publica `AgentCreatedEvent` y `activity` reacciona.

---

## El mecanismo de eventos

Todo el acoplamiento entre módulos pasa por `ApplicationEventPublisher` y `@ApplicationModuleListener`.

`@ApplicationModuleListener` de Spring Modulith es una anotación compuesta equivalente a:

```java
@Async
@Transactional(propagation = Propagation.REQUIRES_NEW)
@TransactionalEventListener   // por defecto: AFTER_COMMIT
```

Las tres piezas importan:

| Pieza | Consecuencia |
|---|---|
| `@TransactionalEventListener` | El listener corre **después del commit** del publicador. Si el indexer hace rollback, ningún listener se ejecuta. |
| `@Async` | Corre en otro hilo. El pipeline de indexación no se bloquea esperando un fetch de IPFS. |
| `REQUIRES_NEW` | Cada listener tiene su propia transacción. Si el cálculo de reputación falla, no arrastra la escritura del feedback. |

Con `spring-modulith-starter-jpa`, cada publicación se registra en la tabla `event_publication` antes de entregarse y se marca completada al terminar. Un listener que falla deja una fila incompleta, visible en `/actuator/modulith` — es el mecanismo de *at-least-once* del sistema.

### Trampa importante

**Nunca poner `@Transactional` sobre un método `@ApplicationModuleListener`.** Spring 7 lanza al arrancar:

```
@TransactionalEventListener method must not be annotated with @Transactional
unless when declared as REQUIRES_NEW or NOT_SUPPORTED
```

Porque `@ApplicationModuleListener` ya trae `REQUIRES_NEW` y la anotación explícita por defecto es `REQUIRED`, que entra en conflicto.

**Patrón correcto** (el que usa este código): el listener solo delega; la transacción vive en el servicio.

```java
@Component
public class ActivityReorgListener {

    private final ActivityService activityService;   // el servicio tiene @Transactional

    @ApplicationModuleListener
    public void onChainReorg(ChainReorgEvent event) {
        activityService.rollbackFromBlock(event.fromBlock());
    }
}
```

---

## Clasificación de los datos: RAW / STATE / ACTIVITY / DERIVED

El esquema está organizado en cuatro niveles según cuánto duele perderlos. La distinción guía qué se puede truncar sin re-indexar.

| Nivel | Tablas | Se puede truncar y regenerar sin RPC |
|---|---|---|
| **RAW** | `indexer_checkpoint`, `indexed_blocks`, `processed_chain_logs` | No — regenerarlo requiere re-leer la cadena |
| **STATE** | `agents`, `agent_metadata`, `agent_onchain_metadata`, `agent_feedback`, `agent_feedback_responses`, `agent_validation_requests`, `agent_validation_responses`, `pending_feedback` | No — es la proyección de los logs |
| **ACTIVITY** | `agent_activity` | No — se escribe al procesar eventos |
| **DERIVED** | `agent_reputation`, `agent_rankings` | **Sí** — se recalculan desde STATE + ACTIVITY |

En la práctica: si querés recalcular scores sin volver a leer la cadena, `TRUNCATE agent_reputation, agent_rankings` y el `RankingService` los reconstruye en el próximo tick.

---

## Decisiones de diseño y su motivo

### `BigInteger` para números de bloque y IDs on-chain

Los `uint256` de Solidity no caben en `long`. En PostgreSQL se mapean a `NUMERIC(78, 0)` (78 dígitos ≈ 2^256). Vale para `block_number`, `onchain_id`, `value` de feedback.

### `short` con `columnDefinition = "SMALLINT"`

Hibernate valida el esquema al arrancar (`ddl-auto: validate`). Un `int` en Java espera `INTEGER` en SQL; si la columna es `SMALLINT`, el arranque falla. Por eso `AgentFeedback.valueDecimals` y `AgentValidationResponse.response` son `short` con `columnDefinition` explícito, y los getters exponen `int` para comodidad de los DTOs.

### `ReentrantLock` además del lock pesimista de base

Dos protecciones para dos problemas distintos:

- **`ReentrantLock` en `IndexerService`** — evita que el scheduler y un `POST /indexer/run` manual corran a la vez *en la misma instancia*. El scheduler usa `tryLock()` (saltea el tick), las llamadas manuales usan `lock()` (esperan).
- **`@Lock(PESSIMISTIC_WRITE)` sobre el checkpoint** — evita `StaleObjectStateException` si hubiera *múltiples instancias* de la app apuntando a la misma base.

### `@Lazy IndexerService self`

`processNextBlocks()` es público y no transaccional; llama a `processNextBlocksInTransaction()`. Una llamada directa `this.method()` no pasa por el proxy de Spring y la anotación `@Transactional` se ignoraría. Inyectarse a sí mismo con `@Lazy` (para no crear un ciclo en el arranque) fuerza el paso por el proxy.

### Idempotencia por diseño

Cada escritura verifica antes si ya existe:

| Nivel | Mecanismo |
|---|---|
| Log | `processed_chain_logs` con unique `(chain_id, tx_hash, log_index)` |
| Agente | `agents` unique `(chain_id, onchain_id)` + chequeo en `AgentService.create` |
| Feedback | `agent_feedback` unique `(chain_id, onchain_agent_id, client_address, feedback_index)` |
| Actividad | índice único `(agent_id, activity_type, transaction_hash, block_number)` + `existsBy...` |
| Validación | unique `(chain_id, request_hash)` y `(request_id, tag)` |

Consecuencia práctica: **re-procesar un rango de bloques es seguro**. No duplica datos.

### Circuit breaker sobre RPC, no sobre la base

El proveedor RPC es la dependencia externa frágil (rate limits, 401, timeouts). El circuit breaker `blockchain` de Resilience4j envuelve todas las llamadas de `BlockchainService`. La base de datos no lleva breaker: si PostgreSQL no está, la app no tiene nada que hacer.

---

## Ciclo de vida de la aplicación

```
Arranque
  ├─ Flyway aplica V1..V6
  ├─ Hibernate valida el esquema contra las entidades  (ddl-auto: validate)
  ├─ Se validan BlockchainProperties (@Validated, patrones de dirección)
  ├─ ApplicationReadyEvent → IndexerService.logStartupState()
  │     loguea chainId, registry, startBlock, checkpoint, chainHead
  └─ Arrancan los schedulers:
        ├─ IndexerScheduler.index()              cada blockchain.poll-interval-ms
        ├─ RankingService.recalculateAll()       cada blockchain.poll-interval-ms
        └─ MetadataRetryScheduler.retryDue()     cada metadata.retry-poll-interval-ms
```

Si el RPC no responde al arrancar, `logStartupState()` captura `BlockchainRpcException` y solo advierte. La app arranca de todos modos y la API sigue sirviendo lo ya indexado.
