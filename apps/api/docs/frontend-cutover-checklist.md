# Frontend Cutover Checklist (Nest as single API)

Use this checklist when switching frontend traffic from mixed sources to Nest-only.

## 1) Contract readiness

- [ ] Swagger documents all public endpoints under `/api/v1/*`.
- [ ] Marketplace calls available in Nest:
  - [ ] `GET /api/v1/marketplace/agents`
  - [ ] `GET /api/v1/marketplace/search`
  - [ ] `GET /api/v1/marketplace/featured`
  - [ ] `GET /api/v1/marketplace/stats`
  - [ ] `GET /api/v1/marketplace/agents/:id`
  - [ ] `GET /api/v1/marketplace/agents/:id/a2a-health`
  - [ ] `GET /api/v1/marketplace/agents/:id/reputation`
  - [ ] `GET /api/v1/marketplace/agents/:id/card`
- [ ] x402 calls available in Nest:
  - [ ] `POST /api/v1/x402/settle`
  - [ ] `GET /api/v1/agent/resource`
  - [ ] `POST /api/v1/agent/resource`

## 2) Error compatibility

- [ ] Frontend-visible error payloads keep `success`, `error`, and `details` shape where expected.
- [ ] Indexer failures map to 502-level boundary in Nest, not unhandled 500s.
- [ ] Facilitator verify/settle failures return stable messages and HTTP status codes.

## 3) Environment parity

- [ ] Nest has `FACILITATOR_URL` configured per environment.
- [ ] Nest has `INDEXER_BNB_URL` configured per environment (default `http://127.0.0.1:8085`).
- [ ] Network mode (`NETWORK`) matches the frontend deployment mode.
- [ ] x402 token/payee env vars are set (`U_TOKEN_MAINNET` / `U_TOKEN_TESTNET`, `X402_PAY_TO`).

## 4) Frontend switch procedure

- [x] Replace frontend mixed API calls with Nest base URL only (`app/lib/api.ts` → `apiV1()`).
- [x] Remove direct frontend calls to indexer and facilitator endpoints.
- [x] Remove Next BFF routes (`app/api/marketplace`, `app/api/x402`, `app/api/agent`).
- [ ] Keep a short fallback window with legacy routes until smoke tests pass.
- [ ] Enable feature flag/rollback toggle for one-click revert during rollout.

**Dev ports:** Nest `:3000`, Next UI `:3001`. Set `NEXT_PUBLIC_API_PORT=3000` (default).

## 5) Validation before removing legacy paths

- [ ] Run end-to-end smoke tests on agent listing, detail, health check, and reputation.
- [ ] Run end-to-end smoke tests for x402 verify+settle+resource flow.
- [ ] Validate both testnet and mainnet modes.
- [ ] Monitor Nest logs for upstream error spikes (indexer/facilitator).
- [ ] Remove legacy frontend BFF routes only after 24h clean telemetry.
