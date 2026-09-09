# Conectar ABIs reales de BNB Chain

Este proyecto incluye un ABI stub en `src/main/resources/abi/AgentRegistry.json` con el evento `AgentRegistered`. Reemplazalo cuando tengas el contrato real desplegado.

## 1. Obtener el ABI desde BscScan

1. Abrí [bscscan.com](https://bscscan.com) (testnet: [testnet.bscscan.com](https://testnet.bscscan.com)).
2. Buscá la dirección del contrato Agent Registry.
3. Entrá a **Contract → Code** y confirmá que el contrato está verificado.
4. En **Contract → ABI**, usá **Copy ABI** o **Export ABI**.
5. Guardá el JSON en:

```
indexer/src/main/resources/abi/AgentRegistry.json
```

## 2. Obtener el ABI vía API de BscScan

```bash
curl "https://api.bscscan.com/api?module=contract&action=getabi&address=0xTU_CONTRATO&apikey=TU_API_KEY"
```

Creá una API key gratis en [bscscan.com/myapikey](https://bscscan.com/myapikey).

La respuesta trae el ABI como string JSON en el campo `result`. Guardalo en el archivo indicado arriba.

## 3. Si deployaste el contrato vos (Hardhat / Foundry)

- **Hardhat:** `artifacts/contracts/AgentRegistry.sol/AgentRegistry.json` → campo `abi`
- **Foundry:** `out/AgentRegistry.sol/AgentRegistry.json` → campo `abi`

Copiá ese array JSON al recurso del indexer.

## 4. Configuración requerida

Actualizá `application-dev.yml` o variables de entorno:

| Variable | Descripción |
|---|---|
| `REGISTRY_ADDRESS` | Dirección del contrato en BNB Chain |
| `START_BLOCK` | Bloque de deploy (visible en BscScan → Contract Creation) |
| `BNB_RPC_URL` | URL RPC (mainnet o testnet) |
| `blockchain.chain-id` | `56` mainnet, `97` testnet |

Ejemplo:

```yaml
blockchain:
  registry-address: "0xABC..."
  start-block: 12345678
  chain-id: 56
  rpc-url: https://bsc-dataseed.binance.org
```

## 5. Verificar el topic del evento

`ContractEventDecoder` calcula el topic de `AgentRegistered` desde el ABI. Si cambiás la firma del evento en el contrato real, actualizá el ABI y reiniciá la app.

Podés validar topics reales en BscScan abriendo un log del contrato en **Events**.

## 6. (Opcional) Generar wrapper Java con web3j

```bash
web3j generate solidity \
  -a src/main/resources/abi/AgentRegistry.json \
  -o src/main/java \
  -p agora3.indexer.blockchain.generated
```

Útil cuando el contrato crece; al inicio el decoder manual es suficiente.

## 7. Reindexar desde el bloque de deploy

Después de conectar el contrato real:

1. Configurá `registry-address` y `start-block`.
2. Truncá tablas de indexing si estás en desarrollo.
3. Reiniciá la aplicación; el scheduler procesará desde `start-block`.

```sql
TRUNCATE indexer_checkpoint, indexed_blocks CASCADE;
-- opcional: recalcular derived sin reindexar raw/state
TRUNCATE agent_reputation, agent_rankings;
```
