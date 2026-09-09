# 08 — Reputación y rankings

Ambos son **DERIVED**: se pueden borrar y regenerar sin leer la cadena. La reputación se recalcula por evento. Los rankings se recalcan **todos** en cada tick del scheduler (`blockchain.poll-interval-ms`).

Esto **no** es `getSummary` de ERC-8004. Es una heurística interna, documentada aquí para no tratarla como score canónico del estándar.

---

## Reputación

`ReputationService.calculate(agentId)` escribe `agent_reputation`.

### Ingredientes

| Fuente | Qué se lee |
|---|---|
| Feedback | `agent_feedback` con `revoked = false`. Promedio de `normalizedValue()` |
| Validation | Todas las `agent_validation_responses` del agente (vía join al request). Promedio de `response` (0–100) |
| Activity | `count(*)` de `agent_activity` — todos los tipos, sin ventana de tiempo |

Feedback revocado no entra. Pending feedback no entra hasta el replay.

### Fórmula

```
feedbackScore    = min(50,  feedbackAverage    * 10)
validationScore  = min(30,  validationAverage  * 0.3)
activityScore    = min(20,  activityCount      * 2)
score            = min(100, feedbackScore + validationScore + activityScore)
```

| Factor | Techo | Cómo se satura |
|---|---|---|
| Feedback | 50 | Un promedio de 5.0 llena el techo (`5 * 10`). Promedio 0 → 0 |
| Validation | 30 | Un promedio de 100 llena el techo (`100 * 0.3`) |
| Activity | 20 | 10 eventos de timeline llenan el techo (`10 * 2`) |

Un agente nuevo con solo `REGISTERED`: `activityCount = 1` → score **2**. Sin feedback ni validation.

Un agente con un feedback 4.5 y 3 activities: `45 + 0 + 6 = 51`.

### Cuándo se calcula

`ReputationEventListener` llama `calculate` ante:

- `ActivityRecordedEvent`
- `MetadataFetchedEvent` (el JSON no entra en la fórmula; el recálculo es residual de la fase A)
- Tras persistir o revocar feedback
- `ValidationRespondedEvent`

`GET /agents/{id}/reputation` **lee** la fila. Si no hay fila → score 0, no dispara cálculo.

### `factors`

JSONB auditado. No hay garantía de schema estable hacia clientes: si cambia la fórmula, cambian las keys. Hoy:

`activityCount`, `feedbackCount`, `feedbackAverage`, `feedbackScore`, `validationCount`, `validationAverage`, `validationScore`, `activityScore`.

---

## Rankings

`RankingService.recalculateAll()` cada poll. Por cada tipo: `DELETE` todas las filas de ese tipo e `INSERT` en orden.

Carga: `ACTIVE` y `TRENDING` hacen `findAll(unpaged)` de **todos** los agentes y, por cada uno, `count` de activity. Eso no escala. Aceptable mientras el set sea chico; es la primera cosa a cambiar si hay miles de agentes (ver [09](09-LIMITACIONES-Y-ROADMAP.md)).

### `TRUSTED`

Orden de `agent_reputation.score` descendente. Position 1 = mayor score. Agentes sin fila de reputación **no aparecen**.

### `ACTIVE`

Todos los agentes, score = `count(activity)`. Incluye agentes con 0.

### `TRENDING`

Intención: actividad de los últimos 7 días. Implementación actual:

```
recentCount = count(activity where timestamp >= now-7d)   // global
score(agent) = recentCount > 0 ? count(activity del agente) : 0
```

Si hay **alguna** activity reciente en toda la tabla, cada agente se rankea por su activity **total**, no por la de 7 días. Si no hay ninguna, todos score 0. Es un placeholder, no un trending real.

### `POPULAR`

Copia de `TRUSTED` (recalcula Trusted y duplica). No hay señal de “popularidad” distinta (no usa volumen de feedback ni unique clients).

### `YIELD`

`TRUSTED * 0.5`. Placeholder para un ranking económico que todavía no existe (no hay fees, stakes ni volumen on-chain de uso).

---

## Cómo cambiar la fórmula sin tocar el indexer

1. Editar `ReputationService.calculate`.
2. Truncar `agent_reputation` **o** disparar `calculate` por cada agente (no hay job de backfill).
3. El próximo tick de rankings lee los scores nuevos.

`indexing` no depende de `reputation`. Un deploy que solo cambia la fórmula no requiere reindexar la cadena.

---

## Qué no hace

- No llama `getSummary` / `getFeedback` del contrato. Solo eventos.
- No pondera antigüedad del feedback (un rating de hace un año vale igual que uno de hoy).
- No distingue tags (`tag1`/`tag2`) ni endpoints.
- No usa `agentWallet` ni owner.
- No es resistente a Sybil: un cliente puede emitir muchos `NewFeedback` (el unique es por `client + index`, no por un único vote por cliente).
