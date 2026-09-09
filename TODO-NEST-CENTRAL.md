# Nest central — corte híbrido (Next BFF)

Estado: **híbrido live**. El browser solo pega a Next `:3001` `/api/*` (mismo origen, HTTPS en prod). Nest es HTTP; Next proxea con `NEST_API_URL`. Facilitator e indexer viven detrás de Nest.

```
Browser ──► Next UI :3001  /api/*
              ├─ /api/marketplace/*  ──► Nest :3000 /api/v1/marketplace/*
              ├─ /api/x402/settle    ──► Nest :3000 /api/v1/x402/settle
              ├─ /api/agent/resource ──► Nest :3000 /api/v1/x402/settle
              │                         o /api/v1/agent/resource
              │                         (Gemini/merchant: settle Nest + work Next)
              └─ /api/agent/{yield,grid,health,rebalance,card,8183}
                 /api/merchant*   (Next BFF — no borrar)

Nest :3000
  ├─ INDEXER_BNB_URL   ──► indexer Java :8085
  └─ FACILITATOR_URL   ──► facilitator Rust :8080
```

## Qué se movió

| Call site | Destino |
|---|---|
| Catálogo / search / stats / featured | Next `/api/marketplace/…` → Nest |
| Detail / a2a-health / card (CAIP, UUID, `demo:`) | Next → Nest |
| Detail / a2a-health / card (Gemini + merchants `/sell`) | Next BFF local |
| POST hire Gemini / merchant | Next `/api/agent/resource` → Nest `x402/settle` + Gemini work |
| POST hire indexer / demo | Next `/api/agent/resource` → Nest `/api/v1/agent/resource` |
| POST x402 settle | Next `/api/x402/settle` → Nest |

Helper browser: `app/lib/nest-routes.ts` (rutas relativas).  
Helper server: `app/lib/nest-server.ts` (`NEST_API_URL`, default `http://127.0.0.1:3000`).

Next BFF `app/api/marketplace`, `app/api/x402`, `app/api/agent/resource` **no se borra**.

## Cómo correr (local contra el VPS)

```bash
# Nest :3000  (INDEXER_BNB_URL + FACILITATOR_URL apuntan al server)
npm run dev:api:mainnet

# Next UI :3001  (NEST_API_URL=http://127.0.0.1:3000)
cd apps/agent-market-frontend && npm run dev:mainnet
```

Swagger Nest: `http://localhost:3000/api/docs`.
