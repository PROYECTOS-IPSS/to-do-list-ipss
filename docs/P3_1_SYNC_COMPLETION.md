# P3.1 — Completar sincronización y verificar recuperación

## Inventario

P3 ya tenía tareas idempotentes/versionadas y operaciones SQLite. P3.1 añadió idempotencia de imágenes, recuperación de conflictos, ejecución al volver a foreground, presupuesto de intentos y estados visibles.

## Cambios

- `TaskImage.contentHash` y registro durable vía `TaskMutation`.
- `Idempotency-Key` multipart validada, asociada a usuario/tarea y fingerprint SHA-256 de bytes + destino.
- Replay y concurrencia de imagen devuelven un único resultado lógico; payload distinto devuelve 409.
- Archivos perdedores o metadata fallida se limpian; no se promete transacción filesystem/PostgreSQL.
- Operaciones `sending` se recuperan al reabrir; `unknown` heredado pasa a `review` sin reenvío automático.
- Executor limita tres intentos totales; backoff exponencial limitado a 30 s y soporte de `Retry-After` en helper.
- 401 pausa; 400/403/conflicto no reintentan automáticamente.
- AppState foreground dispara sincronización solo con sesión remota válida y ejecutor único.
- UI española muestra conflictos/revisión y permite usar servidor o conservar cambios; conservar crea operación nueva con versión actual.

## Pruebas

| Garantía | Nivel | Resultado |
|---|---|---|
| Migración/reapertura/pendientes SQLite | SQLite real `node:sqlite` | Pasa, 7 tests |
| Idempotencia/concurrencia task | PostgreSQL real | Pasa |
| Idempotencia/concurrencia imagen | PostgreSQL real + filesystem temporal | Pasa según focused backend |
| Replay de imagen y mismatch hash | PostgreSQL real | Pasa |
| Ownership task/adjunto | PostgreSQL real y SQLite real | Pasa |
| UI/provider/composer | Jest + transporte controlado | Pasa |
| Foreground | código AppState; listener limpiado | Implementado; dispositivo pendiente |
| Android bridge | no ejecutado | Development Build pendiente |

## Comandos

- `npm test`: backend **69 tests**, mobile **84 tests**, pasa.
- Focused backend task/attachment: **2 suites, 34 tests**, pasa.
- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `prisma validate`: pasa.
- `prisma migrate status`: base local actualizada.
- `npx expo export --platform android` desde `mobile`: pasa.
- SQLite focused: **1 suite, 7 tests**, pasa.

## Límites

No hay ejecución con app cerrada, audio offline ni broker. El listener de conectividad requiere una señal de red disponible en runtime; esta versión usa foreground como trigger seguro y no añade dependencia de red. La subida de imagen conserva archivo local hasta respuesta válida, pero filesystem y PostgreSQL no son una transacción única.

P3 queda cerrado en implementación automatizada de tareas/imágenes, conflictos y recuperación básica. Validación física Android y conectividad real quedan pendientes antes de afirmar cierre operativo completo. No se inicia P4.
