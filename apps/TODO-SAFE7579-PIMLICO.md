# TODO — Safe 7579 + Pimlico + session key (self-custodial)

Decisión: el escrow 8183 ya funciona (job #56750 `FUNDED`). Falta la cuenta que **ejecuta**. Bundler = **Pimlico**. Cuenta = **Safe 7579** (repo `../safe7579`). Session keys = módulo **Smart Sessions** (Rhinestone), no Altana / TWAK / Turnkey.

Self-custodial: la EOA en MetaMask sigue siendo `owner` del Safe. La dapp no guarda esa key. La session key del agente vive solo en el **worker** (env del operador); el owner puede revocarla on-chain.

x402 (0.001 $U EIP-3009) **no se toca**. Sigue siendo hit HTTP desde la EOA.

---

## 0. Dos cuentas, dos fricciones

El job #56750 pidió ~6 firmas al **comprador** y **cero** trabajo al agente. Se resuelven por separado:

| Cuenta | Quién es `owner` | Para qué | Firma humana |
| --- | --- | --- | --- |
| **Buyer SA** | EOA del usuario que contrata | Batch 8183: `createJob` + `registerJob` + `setBudget` + `approve` + `fund` en **un** UserOp | 1 vez por hire (firma el UserOp) |
| **Agent SA** | EOA del operador del agente | `provider` en `createJob`. Session key → worker → A2A + `submit` | 1 vez en la vida: deploy + grant session |

Pimlico entra en **las dos**: bundler ERC-4337 (EntryPoint 0.7). Paymaster Pimlico es **opcional**; default hackathon = el Safe paga gas con BNB propio (self-funded, self-custodial). Sponsorship se prende con flag.

```
Buyer EOA (MetaMask)                    Agent operator EOA (MetaMask)
        │                                        │
        │ owner of                               │ owner of
        ▼                                        ▼
   Buyer Safe 7579                          Agent Safe 7579
        │                                        │
        │ 1 UserOp (batch 8183)                  │ grant Smart Session (1 vez)
        ▼                                        ▼
   Commerce JobFunded ──────────────────► worker + session key
                                          A2A / stub → submit(jobId)
        │
        ▼
   settle (permissionless, EOA o SA)
```

Si un seller **no** tiene Agent SA, no ofrecer 8183 (solo Agent Card + x402). Hoy BORT `0x97e8…eB50` no es 7579: por eso #56750 quedó `FUNDED` y el agente no se enteró.

---

## 1. Stack (no reinventar)

Paquetes en `agent-market-frontend` (no `@bnbagent/sdk`):

- `permissionless` — `createSmartAccountClient`, `createPimlicoClient`, `erc7579Actions`
- `permissionless/accounts` — `toSafeSmartAccount`
- `@rhinestone/module-sdk` — Smart Sessions (`getSmartSessionsValidator`, `getEnableSessionsAction`, policies)

Cuentas 7579 canónicas (ya en `../safe7579/script/DeployAccount.s.sol`):

| | address |
| --- | --- |
| EntryPoint 0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Safe7579 adapter (`safe4337ModuleAddress`) | `0x7579EE8307284F293B1927136486880611F20002` |
| Launchpad (`erc7579LaunchpadAddress`) | `0x7579011aB74c46090561ea277Ba79D510c6C00ff` |
| Rhinestone attester | `0x000000333034E9f539ce08819E12c1b8Cb29084d` |

Pimlico (mismo API key, slug por chain):

| chain | slug | bundler |
| --- | --- | --- |
| 56 | `binance` | `https://api.pimlico.io/v2/binance/rpc?apikey=` |
| 97 | `binance-testnet` | `https://api.pimlico.io/v2/binance-testnet/rpc?apikey=` |

Env:

```
PIMLICO_API_KEY=               # server / worker (nunca al browser si se puede evitar)
NEXT_PUBLIC_PIMLICO_API_KEY=   # solo si el Buyer SA bundlear desde el cliente
PIMLICO_SPONSOR=false          # true = paymaster Pimlico; false = Safe paga BNB
AGENT_SAFE_ADDRESS=
AGENT_SESSION_PRIVATE_KEY=     # worker only — secret
```

Carpeta sugerida:

```
app/lib/aa/pimlico.ts          # clients bundler/paymaster por chain
app/lib/aa/safe7579.ts         # toSafeSmartAccount(owner EOA)
app/lib/aa/batch-8183.ts       # UserOp batch hire
app/lib/aa/smart-sessions.ts   # install + enable session (seller)
scripts/agent-submit-worker.ts # poll JobFunded → submit
```

Guías a copiar, no a reescribir:

- [Pimlico ERC-7579 Safe](https://docs.pimlico.io/references/permissionless/how-to/accounts/use-erc7579-account)
- [Smart Sessions + permissionless](https://erc7579.com/tooling/module-sdk/using-modules/smart-sessions)
- Tutorial Rhinestone: `permissionless-safe.ts`

**No** usar `EVMWalletProvider` / Altana / MegaFuel.

---

## 2. Buyer SA — batch del hire 8183

Hoy `createAndFundJob` manda 5 txs EOA (`write.ts`). Objetivo: **una firma**.

- [ ] `getBuyerSafe(owner: Account)` — counterfactual Safe 7579, `owners: [EOA conectada]`, version `1.4.1`, launchpad de arriba. Primera UserOp la deploya (initcode).
- [ ] UI: mostrar address del Safe (“tu cuenta 8183”) distinta de la EOA. Fondear BNB (gas) y $U **al Safe**, no a la EOA.
- [ ] `createAndFundJobBatched` via `smartAccountClient.sendUserOperation({ calls: [...] })`.

Predicción de `jobId` (para meter `registerJob` en el mismo batch):

1. Leer `commerce.jobCounter()` (o el getter equivalente) **antes** de armar el UserOp.
2. `nextId = counter + 1` (confirmar en el ABI / una llamada de prueba en 56).
3. Batch atómico:

   ```
   createJob(provider=AgentSA, evaluator=router, expiredAt, description, hook=router)
   registerJob(nextId, policy)
   setBudget(nextId, amount)
   approve($U, commerce, amount)     # skip si amount=0
   fund(nextId, amount)
   ```

4. Si `jobCounter` no es fiable (carrera): fallback **2 UserOps** — (a) `createJob`, parse `JobCreated`; (b) batch `register + budget + approve + fund`. Sigue siendo 2 firmas, no 5.

- [ ] Parsear `jobId` del receipt de la UserOp (`userOpReceipt.receipt.logs` + `parseJobCreatedId`). No adivinar si el counter falló.
- [ ] `client` on-chain pasa a ser el **Safe**, no la EOA. `Mis Agentes` filtra `client == buyerSafe` (y deja de mirar solo la EOA).
- [ ] x402 **no** pasa por este Safe (sigue EIP-3009 de la EOA).

Paymaster: si `PIMLICO_SPONSOR=true`, el UserOp no necesita BNB en el Safe (sigue haciendo falta $U para el escrow). Default `false`.

---

## 3. Agent SA — owner self-custodial + session key

Esta es la pieza que faltó en #56750: `provider` tiene que ser un Safe 7579, no el `agentWallet` 6551 de BORT.

### 3.1 Deploy / attach (owner, una vez)

- [ ] Misma receta `toSafeSmartAccount` con `owners: [operatorEOA]`.
- [ ] Decidir: Safe nuevo (launchpad) vs adapter en Safe existente. Hackathon: **nuevo**.
- [ ] Instalar Smart Sessions validator (`installModule`) con attester Rhinestone.
- [ ] Fondear el Safe: BNB (gas de `submit`) + nada de $U (el escrow lo pone el buyer).
- [ ] Publicar esa address como `provider` 8183 del agente (env `AGENT_SAFE_ADDRESS` + más adelante metadata 8004). El market **deja de** usar `agentWallet` EOA/6551 como provider.

### 3.2 Grant session (owner, una vez; revocable)

Session key = secp256k1 **nueva**, no la EOA. El owner firma `enableSessions`. Allowlist mínima (seller):

| target | selector | por qué |
| --- | --- | --- |
| Commerce 56 `0xEa4D…EBA6` | `submit(uint256,bytes32,bytes)` | entregar el job |
| — | **prohibido** `approve` / `transfer` $U | una session filtrada no saca plata |

Opcional después: `claimRefund` no. `settle` es permissionless (cualquier EOA). No hace falta en la session.

Policies Rhinestone:

- [ ] `userOpPolicies`: sudo **solo en testnet**. Mainnet: spending/timeframe (tope BNB gas, expiry 7d).
- [ ] `actions`: un actionTarget = Commerce, selector = `submit`.
- [ ] `permitERC4337Paymaster`: `true` si hay sponsor; si no, el Safe paga.

Guardar en env del worker: `AGENT_SESSION_PRIVATE_KEY` + `AGENT_SAFE_ADDRESS`. **Nunca** `NEXT_PUBLIC_`.

- [ ] UI owner (página `/my-agents` o `/agent-account`): “Crear Safe”, “Grant session”, “Revoke”. Una firma por acción.
- [ ] Test: session **no** puede `approve($U, arbitrary)` ni `createJob`.

### 3.3 Worker (sin humano)

No copiar `fundedJobWatcher` del SDK.

- [ ] Poll `JobFunded` en Commerce, `provider = AGENT_SAFE_ADDRESS`.
- [ ] Check `getJob`: status `FUNDED`, budget ≥ piso, `expiredAt - now > disputeWindow`.
- [ ] Trabajo: stub JSON primero; después JSON-RPC A2A al card (`https://api.bortagent.xyz/api/a2a` si el job description trae `agentId`/URL).
- [ ] `deliverable = keccak256(canonical JSON)`; `optParams` con `deliverable_url`.
- [ ] `submit` como UserOp firmado por la **session**, bundler Pimlico, nonce con validator = Smart Sessions (`encodeValidatorNonce`).
- [ ] **No** auto-settle.

---

## 4. Cablear el marketplace

Estado actual: `CreateJob8183` pone `provider = selectedPayTo` (BORT `0x97e8…`). Eso hay que romper.

- [ ] `provider` = `AGENT_SAFE_ADDRESS` (demo) o mapping `agentId → safe` cuando haya más de uno.
- [ ] Hire 8183 usa Buyer SA + `createAndFundJobBatched`, no el loop de 5 `writeContract`.
- [ ] Panel: 1 paso “Firmar UserOp (batch 8183)” en vez de created/registered/budget/approve/fund sueltos. Internamente igual se muestran checks cuando el receipt confirma cada evento.
- [ ] Tras `FUNDED`, copiar “esperando submit del agente” y, cuando el worker submite, habilitar `settle`.
- [ ] `Mis Agentes`: jobs del Buyer SA + status on-chain (incluye `SUBMITTED`).

---

## 5. Orden de implementación

1. [ ] `app/lib/aa/pimlico.ts` + env. Smoke: `pimlico_getUserOperationGasPrice` en 56 y 97.
2. [ ] Buyer SA counterfactual + UI address. Fondear BNB+$U al Safe.
3. [ ] Batch 8183 (counter+1 o fallback 2 UserOps). Rehacer el hire de 0.01 $U: **1–2 firmas**, mismo Commerce.
4. [ ] Agent SA demo (operator EOA). Instalar Smart Sessions. Grant session. Env worker.
5. [ ] Worker `JobFunded` → stub → `submit` con session + Pimlico.
6. [ ] Market: `provider = Agent SA`. BORT/x402 intactos. Settle desde la UI.
7. [ ] (Opcional) A2A real en el worker usando el Agent Card.

Testnet 97 primero si el paymaster/sponsor es más barato; mainnet cuando 3+5 cierren (ya hay $U y Commerce en 56).

---

## 6. Verificación

- [ ] Buyer: un UserOp (o dos) deja job `FUNDED`; BscScan muestra `JobCreated` + `JobFunded` en el mismo (o segundo) bundle.
- [ ] `client` del job = Buyer Safe, no la EOA.
- [ ] Agent: `submit` **sin** MetaMask; tx from = Agent Safe; validator = session.
- [ ] Session no puede `approve` ni mover $U.
- [ ] Owner revoca session → el siguiente `submit` del worker revierte.
- [ ] x402 0.001 $U a BORT sigue igual (EOA, EIP-3009).
- [ ] Agent Card se lee sin pagar.
- [ ] No hay `PIMLICO_API_KEY` ni session key en el bundle cliente (`NEXT_PUBLIC_` vacío de secretos de agente).

---

## Fuera de alcance

- Altana / EIP-7702 session (otro modelo; el nuestro es 7579 Safe).
- MegaFuel / paymaster propio — Pimlico sponsor es el único atajo de gas.
- Kernel / Biconomy — solo Safe7579.
- Meter session en x402.
- Indexar 8183 en el indexer Java.
- UI completa de disputa / `voteReject`.
- Migrar BORT de 6551 a 7579 (hackathon: Safe demo como `provider`; el A2A de BORT se llama off-chain si el worker quiere).
