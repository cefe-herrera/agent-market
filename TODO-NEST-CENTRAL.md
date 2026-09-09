# Nest central — contexto y corte (no adaptar hasta “armando”)

Estado: **solo contexto**. No cambiar call sites del frontend hasta que el usuario diga **armando** y el Nest central esté corriendo.

Hoy en esta rama el mercado habla con **tres procesos por separado**. La versión del colega (`main-branch`, commit `153ecdb` *delete bff*) pone **Nest como único origen HTTP** y deja facilitator + indexer como **microservicios detrás de Nest**.

---

## 1. Arquitectura

### Ahora (esta rama)

```
Browser ──► Next :3000
              ├─ /api/marketplace/*     ──► indexer Java :8085
              ├─ /api/agent/resource    ──► facilitator :8080  + Gemini / yield
              ├─ /api/x402/settle       ──► facilitator :8080
              ├─ /api/agent/yield|card  ── (Next only: AlphaYield)
              ├─ /api/merchant*         ── (Next only: /sell)
              └─ /api/agent/8183/*      ── (Next only: worker Safe 7579)

Nest :3005          (indexer Nest / marketplace viejo — casi no lo usa el hire)
```

Puertos locales actuales (`.env.example`):

| Proceso | Env | Default |
|---|---|---|
| Next UI + BFF | — | `3000` |
| Facilitator x402 | `FACILITATOR_URL` | `http://127.0.0.1:8080` |
| Indexer Java ERC-8004 | `INDEXER_BNB_URL` / `NEXT_PUBLIC_INDEXER_BNB_URL` | `http://127.0.0.1:8085` |
| Nest | `NEXT_PUBLIC_API_HOST` + `NEXT_PUBLIC_API_PORT` | `127.0.0.1:3005` |

### Destino (cuando esté armando)

```
Browser ──► Next (UI only)
              └─ apiV1() ──► Nest :3000  /api/v1/*
                                ├─ marketplace/*     ──► indexer :8085
                                ├─ x402/settle       ──► facilitator :8080
                                └─ agent/resource    ──► facilitator :8080
```

Contrato publicado por el colega (`apps/api/docs/frontend-cutover-checklist.md` en `main-branch`):

- Nest local `:3000`, Next UI `:3001`, `NEXT_PUBLIC_API_PORT=3000`
- Browser **no** llama indexer ni facilitator
- Next **no** proxya marketplace / x402 / agent resource (ellos borraron el BFF)

---

## 2. Contrato Nest `/api/v1` (target)

Marketplace:

- `GET /api/v1/marketplace/agents`
- `GET /api/v1/marketplace/search`
- `GET /api/v1/marketplace/featured`
- `GET /api/v1/marketplace/stats`
- `GET /api/v1/marketplace/agents/:id`
- `GET /api/v1/marketplace/agents/:id/a2a-health`
- `GET /api/v1/marketplace/agents/:id/reputation`
- `GET /api/v1/marketplace/agents/:id/card`

x402:

- `POST /api/v1/x402/settle`
- `GET /api/v1/agent/resource`
- `POST /api/v1/agent/resource`

Nest necesita `FACILITATOR_URL`, `INDEXER_BNB_URL`, `NETWORK`, tokens `$U`, `X402_PAY_TO`.

Errores que el front ya espera: `{ success, error, details }`.

---

## 3. Call sites de esta rama (inventar al cortar)

### Browser → Next (hoy). Destino Nest `apiV1()`

| Hoy | Destino colega | Notas |
|---|---|---|
| `GET /api/marketplace/agents` | `apiV1("/marketplace/agents")` | Catalog indexer. **Conflicto:** hoy el BFF mergea merchants + Gemini. |
| `GET /api/marketplace/agents/:id` | `apiV1("/marketplace/agents/:id")` | |
| `GET .../a2a-health` | `apiV1(".../a2a-health")` | Hoy `a2a-probe` cubre AlphaYield. Nest no lo tiene. |
| `GET .../card` | `apiV1(".../card")` | Skills Gemini viven en Next `/api/agent/card/:id`. |
| `POST /api/agent/resource` | `apiV1("/agent/resource")` | Hoy corre `resolvePaidWork` + Gemini. |
| `POST /api/x402/settle` (`x402-client`) | `apiV1("/x402/settle")` | |
| Feedback URI `origin/api/agent/resource?seller=` | `apiV1("/agent/resource")?seller=` | |

Helper ya existe y **no se usa**: `app/lib/api.ts` → `apiV1()`. Puerto default sigue `3005` (no cambiar a `3000` hasta el corte).

### Next server → microservicios (hoy). Destino: Nest los llama

| Hoy | Destino |
|---|---|
| `app/api/agent/resource` → `FACILITATOR_URL /verify` + `/settle` | Nest x402 module |
| `app/api/x402/settle` → mismo facilitator | Nest |
| `app/lib/indexer-bnb.ts` → `INDEXER_BNB_URL /api/v1/agents` | Nest marketplace module |

### Se quedan en Next hasta que Nest los cubra (no están en el contrato v1)

Estas rutas **no existen** en el cutover del colega. Si borramos el BFF sin portarlas, se rompe esta rama:

| Ruta Next | Qué es |
|---|---|
| `GET /api/agent/yield` | Snapshot Venus / Pancake / Lista |
| `GET /api/agent/card/:id` | Agent Card mintable AlphaYield + skills→prompt |
| `GET/POST /api/merchant*` | Wizard `/sell` |
| `POST /api/agent/8183/submit` + `pending` | Worker Safe 7579 |
| Gemini `resolvePaidWork` post-x402 | Cerebro yield (no es tool-calling) |

Opción al cortar: **híbrido** — catálogo/x402 indexer van a Nest; yield / sell / 8183 / Gemini se quedan en Next hasta un segundo PR.

---

## 4. Qué no romper

- x402 exact 0.001 $U EIP-3009 (EOA). Facilitator solo verifica/settle; `payTo` es otra wallet.
- ERC-8183 = otro riel (escrow + Buyer Safe 7579). No mezclar con x402.
- Catalog / Agent Card = ERC-8004 discovery.
- `GEMINI_API_KEY` server-only. Nunca `NEXT_PUBLIC_`.
- `AGENT_SESSION_PRIVATE_KEY` worker-only.

---

## 5. Procedimiento cuando digan “armando”

1. Confirmar Nest central up (`:3000` o el puerto que acuerden) + Swagger `/api/v1/*`.
2. Smoke: list / detail / a2a-health / card / `POST agent/resource` / `POST x402/settle`.
3. Decidir **Nest-only** vs **híbrido** (recomendado híbrido en el primer corte).
4. Recién ahí mover call sites a `apiV1()` y ajustar env (`NEXT_PUBLIC_API_PORT`, `NEXT_PUBLIC_API_URL`).
5. No borrar BFF Next hasta que yield + sell + 8183 tengan dueño (Nest o Next).

No implementar el switch en este archivo. Esperar la palabra **armando**.
