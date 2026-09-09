# Frontend Integration cURL Guide (Nest only)

The Next frontend calls **only Nest** (`apiV1()` in `app/lib/api.ts`). Nest integrates indexer + facilitator.

Base URL examples:

- Local Nest: `http://localhost:3000`
- Local Next dev: `http://localhost:3001` (UI only; API calls go to Nest)
- Prod: `NEXT_PUBLIC_API_URL`

## 1) Marketplace catalog

### List consumable agents

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/agents?isTestnet=true&chainId=97&usable=true&page=1&limit=24"
```

### Search agents

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/search?isTestnet=true&chainId=97&usable=true&q=bnbagent"
```

### Featured agents

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/featured"
```

### Marketplace stats

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/stats"
```

## 2) Agent detail endpoints

Use any valid id format:

- UUID
- `chainId:registry:tokenId`
- tokenId
- slug

### Agent detail

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/agents/97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417"
```

### A2A health

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/agents/97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417/a2a-health"
```

### Reputation

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/agents/97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417/reputation"
```

### Agent Card preview

```bash
curl -sS "http://localhost:3000/api/v1/marketplace/agents/97:0x8004a169fb4a3325136eb29fa0ceb6d2e539a432:417/card"
```

## 3) x402 settlement endpoint

### Verify + settle in one call

```bash
curl -sS -X POST "http://localhost:3000/api/v1/x402/settle" \
  -H "Content-Type: application/json" \
  -d '{
    "x402Version": 2,
    "paymentRequirements": {
      "scheme": "exact",
      "network": "eip155:97",
      "amount": "1000000000000000",
      "asset": "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565",
      "payTo": "0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b"
    },
    "paymentPayload": {
      "accepted": {
        "scheme": "exact",
        "network": "eip155:97",
        "amount": "1000000000000000",
        "asset": "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565",
        "payTo": "0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b"
      }
    }
  }'
```

## 4) Paid agent resource flow (frontend critical path)

### Step A: request payment requirements (expects HTTP 402)

```bash
curl -i "http://localhost:3000/api/v1/agent/resource?seller=demo:fx-desk"
```

### Step B: send signed x402 payload

```bash
curl -sS -X POST "http://localhost:3000/api/v1/agent/resource" \
  -H "Content-Type: application/json" \
  -H "x-agent-id: demo:fx-desk" \
  -H "x-agent-name: Latam FX Desk" \
  -d '{
    "x402Version": 2,
    "paymentRequirements": {
      "scheme": "exact",
      "network": "eip155:97",
      "amount": "1000000000000000",
      "asset": "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565",
      "payTo": "0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b"
    },
    "paymentPayload": {
      "accepted": {
        "scheme": "exact",
        "network": "eip155:97",
        "amount": "1000000000000000",
        "asset": "0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565",
        "payTo": "0xA457Dd1a8D9E243f229EB919d7a08b43802aeD8b"
      }
    }
  }'
```

Success returns:

- `success`
- `transaction`
- `payer`
- `network`
- `agentId`
- `work` (resolved JSON payload + payment receipt)

## 5) Recommended frontend checks

- Treat `402` as expected in Step A (`GET /api/v1/agent/resource`).
- On `POST /api/v1/agent/resource`, handle:
  - `400` for missing headers or malformed request.
  - `402` for verify/settle/payment errors.
  - `502`/`503` as upstream instability (facilitator/indexer/RPC).
- Always forward `x-agent-id` header from selected catalog item.
