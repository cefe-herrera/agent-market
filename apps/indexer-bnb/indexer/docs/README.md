# Documentación — Agora Indexer

Indexer de agentes **ERC-8004** sobre **BNB Smart Chain**, construido como monolito modular con Spring Boot 4 y Spring Modulith.

El sistema lee eventos de tres contratos on-chain (Identity, Reputation, Validation), los proyecta a un modelo relacional en PostgreSQL, enriquece cada agente con metadata off-chain (HTTP/IPFS/data-URI) y expone todo por una API REST con búsqueda, actividad, reputación y rankings.

---

## Índice

| Documento | Contenido |
|---|---|
| [01 — Arquitectura](01-ARQUITECTURA.md) | Stack, módulos, límites, decisiones de diseño |
| [02 — Glosario](02-GLOSARIO.md) | Bloque, log, topic, checkpoint, reorg, ERC-8004, CREATE2 |
| [03 — Pipeline de indexación](03-PIPELINE-INDEXACION.md) | Del `eth_getLogs` a la fila en PostgreSQL, paso a paso |
| [04 — Eventos](04-EVENTOS.md) | 9 eventos on-chain + 11 eventos internos y su cadena de listeners |
| [05 — Modelo de datos](05-MODELO-DATOS.md) | Las 15 tablas, migraciones V1–V6, índices |
| [06 — API](06-API.md) | Todos los endpoints, parámetros, respuestas, ejemplos |
| [07 — Configuración y operación](07-CONFIGURACION-Y-OPERACION.md) | Properties, secretos, arranque, troubleshooting, runbooks |
| [08 — Reputación y rankings](08-REPUTACION-Y-RANKINGS.md) | Fórmula del score, factores, los 5 tipos de ranking |
| [09 — Limitaciones y roadmap](09-LIMITACIONES-Y-ROADMAP.md) | Deuda técnica conocida, qué falta antes de abrir a terceros |

Documento legado: [ABI_SETUP.md](ABI_SETUP.md) — cómo obtener ABIs desde BscScan. Parcialmente desactualizado: hoy los eventos se declaran en código (`ContractEventDecoder`), no se leen de un archivo ABI.

---

## Arranque rápido

```bash
cd indexer
cp local.properties.example local.properties   # llenar DB_URL, credenciales, RPC
./mvnw spring-boot:run
```

Verificación:

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/api/v1/indexer/status
open http://localhost:8080/swagger-ui.html
```

---

## Estado de las fases

| Fase | Alcance | Estado |
|---|---|---|
| **A** | Esqueleto: indexar `Registered`, agentes, metadata, rankings | Completa |
| **B** | Indexación on-chain completa: 9 eventos, dedup, reorg, retry, pending feedback | Completa |
| **C** | API sólida: búsqueda en PostgreSQL, `/activity`, `/reputation`, paginación | Completa |
| **D** | Hardening pre-lanzamiento: auth, rate limiting, paginación total, observabilidad | Pendiente — ver [09](09-LIMITACIONES-Y-ROADMAP.md) |

---

## Mapa mental en una frase

> Un scheduler avanza un **checkpoint** por bloques, pide los **logs** de tres contratos, los **decodifica** a eventos de dominio, y una cadena de **listeners transaccionales** proyecta esos eventos a tablas de estado (`agents`), actividad (`agent_activity`) y derivadas (`agent_reputation`, `agent_rankings`), que la API expone paginadas.
