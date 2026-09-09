# 09 — Limitaciones y roadmap

Qué está cerrado, qué es deuda consciente, y qué vendría antes de abrir la API a terceros.

---

## Fases hechas

| Fase | Qué quedó |
|---|---|
| **A** | Pipeline, `Registered`, agentes, metadata HTTP/IPFS, rankings stub, API lista |
| **B** | 9 eventos, dedup, pending feedback, activity completa, agentWallet, retry metadata, reorg extendido, reputación con validation |
| **C** | Search PostgreSQL (tsvector + trigram), paginación real, `GET …/activity`, `GET …/reputation` |

---

## Limitaciones del código actual

Agrupadas por si bloquean un review interno o un launch público.

### Indexación (B) — no bloquean cerrar B

1. **Validation Registry no existe en BSC mainnet.** Código listo; 0 eventos. Cuando se despliegue: setear `validation-start-block` al bloque de creation y no dejarlo en 0 si Identity es mucho más viejo (si no, se escanean años de bloques vacíos del address CREATE2).
2. **Reorg no revierte mutaciones de agentes viejos.** Un `Transfer` en el bloque reorged deja el `owner_address` nuevo hasta que el rango se re-indexa. Con `verify-blocks: false` (dev) la reorg **no se detecta**; solo protege `confirmationBlocks`.
3. **`resetCheckpoint` no limpia STATE ni `processed_chain_logs`.** Reindex ≠ wipe. Documentado en [03](03-PIPELINE-INDEXACION.md) y [07](07-CONFIGURACION-Y-OPERACION.md).
4. **Request de validation para agente desconocido se descarta** (no hay `pending_validation` análogo a pending feedback).
5. **Logs no decodificados se marcan processed.** Un ABI mal tipado “pierde” el evento hasta borrar esa fila de `processed_chain_logs`.
6. **`Transfer` de mint** (`from = 0x0`) se intenta aplicar antes o junto al `Registered`; `ifPresent` lo ignora si el agente aún no existe. Correcto, pero no hay activity `MINTED` separada.

### API (C) — hecha para uso interno

7. **Sin auth ni rate limit.** `/indexer/run?resetCheckpoint=true` es destructivo a nivel de progreso.
8. **`/feedback` y `/validations` no paginan.** Un agente con mucho historial devuelve arrays enteros.
9. **Metadata `status` / `retry` invisibles** en `GET /agents/{id}`. Un FAILED se ve como `metadata: null`.
10. **Search no usa `sort` del cliente** y no busca en `raw_json`.
11. **Weights A/B/C del tsvector no afectan el orden** (ordena trigram). Ver [02](02-GLOSARIO.md).
12. **Reputación no se recalcula on-read.** Un score viejo se sirve tal cual hasta el próximo evento.
13. **`uint256` como JSON number** — riesgo de precisión en clientes JS.

### Rankings — placeholders

14. **`TRENDING` no es trending.** Usa activity total si existe *alguna* activity reciente global. Ver [08](08-REPUTACION-Y-RANKINGS.md).
15. **`POPULAR` = `TRUSTED`.** `YIELD` = Trusted × 0.5.
16. **Recálculo full-table cada segundo** (`findAll` + N counts). O(agentes) por tick.

### Operación

17. **Sin tests de dominio.** El pom trae starters de test; no hay `*Test.java` que fijen el decoder, la fórmula, ni Modulith.
18. **Sin perfil prod**, sin CI, sin Docker.
19. **Un solo chain_id por proceso.** El schema soporta varios; la config no.
20. **Gateway IPFS público** (`ipfs.io`) — lento y rate-limited. El retry existe por esto.
21. **`RankingService` y el indexer comparten `poll-interval-ms`.** Acelerar el indexer acelera el recálculo de rankings.

### Modelo / estándar

22. **Score ≠ ERC-8004 `getSummary`.** Heurística propia. No publicar como “reputación on-chain oficial” sin disclaimer.
23. **No hay Sybil resistance** en feedback.
24. **No se indexan llamadas** (solo eventos). Estado que el contrato guarda sin `emit` no existe para nosotros.

---

## Fase D — antes de abrir a terceros

Orden sugerido, no un compromiso de scope.

### D1 — No romper a los demás

- Auth en `/api/v1/indexer/**` (al menos). Idealmente API key en toda la API.
- Rate limiting (bucket por IP / key).
- Paginación en `/feedback` y `/validations`.
- Exponer `metadata.status`, `retryCount`, `nextRetryAt` en el detalle (y un `POST …/metadata/retry` opcional).
- Disclaimer en `/reputation`: score derivado, no `getSummary`.
- Serializar `onchainId` / `blockNumber` como string, o documentar el riesgo.

### D2 — Rankings honestos

- `TRENDING`: count de activity por agente en 7 días (query agrupada, no N+1).
- `POPULAR`: p.ej. `count(feedback no revocado)` o unique clients.
- `YIELD`: o se define con una señal real, o se saca del enum público.
- Recalcular rankings en un intervalo propio (`ranking.recalculate-interval-ms`), no atado al poll del indexer.
- Materializar con `INSERT … ON CONFLICT` o `position` update, no delete-all.

### D3 — Observabilidad y pruebas

- Test Modulith: `ApplicationModules.of(IndexerApplication.class).verify()`.
- Test del decoder con logs hex reales de BscScan (Registered + MetadataSet de agent 317675).
- Test de `ReputationService.calculate` con fixtures.
- Test de search nativo (requiere Postgres + `pg_trgm`; no hay Testcontainers hoy).
- Métrica: logs/tick, lag de bloques, fetches FAILED, circuit breaker open.
- Alerta si `authFailurePaused` o si `event_publication` acumula incompletas.

### D4 — Indexación más fiel

- `pending_validation` simétrico a pending feedback.
- Reorg: revertir `owner_address` / `metadata_uri` al valor del último evento *anterior* a `from`, o re-procesar el prefijo. Hoy se espera al reindex.
- Wipe explícito: `POST /indexer/reset?wipe=true` que trunque STATE + processed logs, no solo el checkpoint.
- Confirmar ABI de Validation contra el contrato real el día del deploy.

---

## Cómo trabajar sobre esto

### Leer para entender

1. [02 Glosario](02-GLOSARIO.md) si “bloque / topic / checkpoint” no son automáticos.
2. [01 Arquitectura](01-ARQUITECTURA.md) — módulos y por qué no se importan entre sí.
3. [03 Pipeline](03-PIPELINE-INDEXACION.md) — el loop.
4. El módulo que vas a tocar, empezando por su `package-info.java` (`allowedDependencies`).

### Cambiar el dominio (fórmula, activity types, search)

No toques `indexing` ni `blockchain`. Publicá o consumí eventos en `common.event`.

### Cambiar qué se indexa

`ContractEventDecoder` + `LogProcessorService` + un record + un listener. Lista en [04](04-EVENTOS.md#cómo-agregar-un-evento-nuevo).

### Cambiar el schema

Solo `V7__….sql` nueva. Entidad JPA alineada **antes** de arrancar (`validate` te lo exige). `SMALLINT` ↔ `short`.

### No romper Modulith

Si un módulo necesita una clase de otro, o se declara en `allowedDependencies`, o se habla por evento. `reputation → validation` ya está declarado (lee responses para el score). `indexing` no debe empezar a importar `agents`.

### Trampa que ya nos rompió el arranque

`@ApplicationModuleListener` + `@Transactional` en el mismo método → `BeanInitializationException`. El `@Transactional` va en el servicio.

---

## Preguntas abiertas (no resueltas a propósito)

- ¿El score público debe acercarse a `getSummary` del contrato (llamada RPC por agente) o seguir siendo evento-sourced y barato?
- ¿Una instancia por chain, o multi-chain en el mismo proceso?
- ¿IPFS propio / Pinata / gateway pago, o seguir con ipfs.io + retry?
- ¿Los rankings son producto o scaffolding? `YIELD`/`POPULAR` hoy no merecen un contrato con terceros.

Cuando se decida una de esas, el lugar de registrarlo es este archivo o un ADR corto en `docs/adr/` — solo si la decisión es cara de revertir.
