# TODO — ERC-8183 en el marketplace (sin `@bnbagent/sdk` completo)

Decisión: no instalar el SDK entero. Es runtime de agente (keystore, TWAK, Turnkey, Altana, paymaster). El market es una dapp wagmi: el usuario firma; la cuenta del agente es un Safe 7579 con session key.

Quedarnos solo con **protocolo 8183**: ABIs, direcciones, estados de job, writes vía viem.

Fuentes:

- SDK: `../bnbagent-sdk/typescript/src/networks/addresses.ts`
- ABIs: `../bnbagent-sdk/abis/` y `../bnbagent-sdk/typescript/src/abis/`
- Safe 7579: `../safe7579`

Stack que ya existe y no se toca como riel de pago HTTP:

- Catálogo / Agent Card (ERC-8004) — descubrimiento
- x402 0.001 $U — micropago HTTP (inference / créditos)

8183 es **otro riel**: job con escrow $U.

---

## 0. Alcance

- [ ] Cliente 8183 flaco en el frontend (`viem` + `walletClient` de wagmi)
- [ ] Usuario (EOA conectada): `createJob` → `registerJob` → `fund` → `settle` / `dispute` / `claimRefund`
- [ ] Agente (Safe 7579 + session key): `submit` sin volver a pedir firma humana
- [ ] UI: elegir agente (card ya cargada) → crear job 8183 (no mezclar con el botón x402)
- [ ] **No** meter `EVMWalletProvider`, `loadEnv`, TWAK, Turnkey, Altana, MegaFuel, `fundedJobWatcher`

---

## 1. Extraer constantes y ABIs

Carpeta sugerida: `agent-market-frontend/app/lib/erc8183/`

- [ ] Copiar direcciones BSC 56 / 97 (checksum):

  | | testnet 97 | mainnet 56 |
  | --- | --- | --- |
  | `$U` | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` | `0xcE24439F2D9C6a2289F741120FE202248B666666` |
  | Commerce (proxy) | `0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de` | `0xea4daa3100a767e86fded867729ae7446476eba6` |
  | Router (proxy) | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` | `0x51895229e12f9876011789b04f8698af06ccd6da` |
  | OptimisticPolicy | `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea` | `0x9c01845705b3078aa2e8cff7520a6376fd766de5` |

- [ ] `addresses.ts` — `getErc8183(chainId)` tipo el `x402PaymentConfig()` actual
- [ ] Copiar ABIs mínimos (no el JSON entero del repo si no hace falta):
  - `AgenticCommerce` — `createJob`, `setBudget`, `fund`, `submit`, `claimRefund`, `getJob`, `paymentToken`
  - `EvaluatorRouter` — `registerJob`, `settle`
  - `OptimisticPolicy` — `dispute`, `disputeWindow`, `voteReject` (vote puede esperar)
  - ERC-20 — `approve`, `allowance`, `decimals`, `balanceOf`
- [ ] `types.ts` — `JobStatus` (0–5), `Verdict`, `Job`
- [ ] El **payment token no se hardcodea en el cliente 8183**: leer `commerce.paymentToken()`. Debe coincidir con el $U de x402 en esa chain; si no, fallar explícito.

---

## 2. Cliente flaco (viem, sin WalletProvider)

- [ ] `read.ts` — `publicClient.readContract` para `getJob`, `paymentToken`, `disputeWindow`, `allowance`
- [ ] `write.ts` — funciones que reciben `WalletClient` (usuario **o** session del Safe):

  ```
  createJob({ provider, evaluator: router, expiredAt, description, hook? })
  registerJob(jobId)          // bind OptimisticPolicy
  setBudget(jobId, amount)
  fund(jobId, amount)         // approve $U si allowance corta, después fund
  submit(jobId, deliverable)
  settle(jobId)
  dispute(jobId)
  claimRefund(jobId)
  ```

- [ ] `expiredAt` = now + `disputeWindow` + buffer (p.ej. 10 min). Si queda corto, `createJob` revierte.
- [ ] `fund`: si `allowance < amount` → `approve(commerce, amount)` (o floor estable 100 tokens, configurable). Budget `0` = job gratis, skip approve.
- [ ] Parsear `jobId` del evento `JobCreated` en el receipt (no adivinar).
- [ ] Tests unitarios con transporte mock de viem (sin chain live).

**No** adaptar `WalletProvider` de bnbagent encima de wagmi.

---

## 3. Quién firma qué

| Acción | Quién | Cómo |
| --- | --- | --- |
| `createJob` / `registerJob` / `setBudget` / `fund` | Usuario (cliente) | wagmi `useWalletClient` — igual que x402 |
| `dispute` / `settle` / `claimRefund` | Usuario (o cualquiera: settle es permissionless) | misma wallet |
| `submit` | Cuenta del **agente** (provider) | Safe 7579 + session key |

- [ ] `provider` en `createJob` = smart account del agente (no el token ERC-8004 `270339`)
- [ ] Mapear `agentId` 8004 → `agentWallet` / Safe del seller (hoy el catálogo ya tiene `agentWallet`)
- [ ] Si el seller no tiene Safe 7579, no ofrecer 8183; dejar solo x402 + Agent Card

---

## 4. Smart account del agente (Safe 7579)

Repo: `C:\Users\Blas\Desktop\Proyectos\Hackatons\BSC\safe7579`

- [ ] Decidir: Safe nuevo con launchpad 7579 vs adapter en Safe existente
- [ ] Instalar validator de sesión (session key) con:
  - allowlist: Commerce proxy + Router proxy (+ $U `approve` solo a Commerce)
  - tope de spend $U
  - expiry
- [ ] Flujo owner (una vez):
  1. Conectar wallet owner del agente
  2. Deploy / attach Safe 7579
  3. Firmar grant de session key
  4. Fondear Safe con BNB (gas) y $U (si el agente también paga fees / no hay paymaster)
- [ ] Runtime del agente (fuera del browser del usuario): usa la session key para `submit` cuando hay un job `FUNDED` hacia su address
- [ ] **No** usar `AltanaWalletProvider` del SDK para esto

Hackathon: un Safe de demo + session key en env del worker alcanza. La dapp del usuario no custodia esa key.

---

## 5. Worker de submit (mínimo)

No copiar `fundedJobWatcher` del SDK. Un script/Next route server-side:

- [ ] Poll `JobFunded` (logs Commerce) filtrado por `provider = safeAgente`
- [ ] Verificar status `FUNDED`, budget ≥ piso, `expiredAt` con margen
- [ ] Hacer el trabajo (o stub JSON)
- [ ] `submit(jobId, hash o URI del deliverable)` con la session key
- [ ] **No** auto-settle desde el worker (settle lo pica el usuario o un cron aparte)

---

## 6. UI en `agent-market-frontend`

Hoy: catálogo → Agent Card (skills, x402, A2A) → botón **Pagar 0.001 $U** (x402).

- [ ] En el panel, con agente seleccionado y card cargada, segunda acción: **Crear job 8183**
- [ ] Form mínimo: descripción, budget en $U, expiry (default = window + buffer)
- [ ] Mostrar `provider` (Safe / agentWallet) y chain 56
- [ ] Pasos visibles: created → registered → funded (approve + fund) → waiting submit → settle
- [ ] Lista de jobs del usuario (`client == account`) — leer `getJob`
- [ ] No romper x402: dos botones, dos rieles, copy distinto
  - x402 = “pagar un hit HTTP”
  - 8183 = “fondear un trabajo con escrow”

---

## 7. Relación con 8004 / indexer

- [ ] Seguir descubriendo agentes como ahora (indexer 8085 + 8004scan fallback)
- [ ] Agent Card **antes** de crear el job (ya está)
- [ ] `provider` 8183 ≠ `agentId` 8004. Guardar ambos en el job description JSON si hace falta (`agentId`, `cardUrl`, `a2a`)
- [ ] No esperar a que el indexer Java indexe 8183; los jobs se leen de Commerce, no del indexer 8004

---

## 8. Orden de implementación (hackathon)

1. [ ] `app/lib/erc8183/{addresses,abis,types,read,write}.ts`
2. [ ] Página o panel: create + fund con la wallet conectada (testnet 97 primero; mainnet cuando el happy path cierra)
3. [ ] Un Safe 7579 demo + session key + script `submit` stub
4. [ ] UI estados del job + settle
5. [ ] Cablear `provider` al `agentWallet` del catálogo (BORT / mandaterebalance solo si tienen Safe; si no, demo seller 8183)

---

## 9. Verificación

- [ ] `paymentToken()` del Commerce == $U de esa chain
- [ ] Usuario A crea y fondea; worker submite; A settlea después del dispute window (o ventana corta en testnet)
- [ ] Session key **no** puede `approve` a arbitrary spender ni llamar contratos fuera de la allowlist
- [ ] x402 hire de BORT sigue funcionando igual
- [ ] Agent Card se sigue viendo sin pagar

---

## Fuera de alcance (por ahora)

- Votantes `voteReject` / UI de disputa completa
- NegotiationHandler / quotes EIP-191 del SDK
- Paymaster MegaFuel para 8183 mainnet
- Indexar jobs 8183 en el Java indexer
- A2A runtime (el card `url` se usa para hablar; el escrow es Commerce)
