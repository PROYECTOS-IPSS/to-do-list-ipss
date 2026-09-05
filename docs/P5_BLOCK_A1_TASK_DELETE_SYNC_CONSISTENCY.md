# Block A.1 — Consistencia de eliminación, identidad y sincronización

## Estado inicial y causa

La advertencia `local-1788423388061-hx426oqqdnu` pertenece a la colección de tareas de `mobile/app/index.tsx`, no a fotografías ni operaciones. SQLite declara `tasks.local_id` como clave primaria; por tanto, dos filas con el mismo local ID no son válidas. La duplicación nacía en UI: `saveTask` anteponía resultado guardado a `tasks` sin quitar una copia que podía haber llegado por `loadTasks` concurrente. `FlatList` usaba `task.id`, alias de `localId`.

El aviso `La tarea local ya no está disponible` sí tenía causa durable: `markDelete` eliminaba una tarea local sin `remoteId`, pero dejaba su operación `create`. El ejecutor reabría esa operación, encontraba tarea ausente y la convertía en `review`; la fila de revisión aparecía bajo “Tus tareas” y el resumen superior repetía la causa.

La causa original del `401` no queda demostrada por este bloque: el teléfono y SQLite Android no son accesibles desde este entorno. Cliente auth/tasks usan URL efectiva de entorno y token recibido por llamada; backend deriva propietario desde JWT y aplica ownership. Block A1 conserva el `401` como diagnóstico pendiente, pero cierra recuperación local y pausa de cola sin borrar datos.

## Invariantes aplicadas

| Invariante | Implementación comprobada |
|---|---|
| Propiedad | Consultas SQLite reciben `ownerId`; backend deriva `userId` del JWT. |
| Identidad | `localId` estable; `remoteId` se adquiere en `confirmCreate`; FlatList usa `localId`. |
| Persistencia | Mutación local se refleja antes/independiente del envío remoto. |
| Borrado | `pending_delete` queda fuera de lista activa; confirmación tardía de create crea delete pendiente. |
| Atomicidad | Cancelación de creación nunca enviada borra tarea y operaciones en una transacción. |
| Idempotencia | Operación existente conserva `operationId`, payload y versión esperada. |
| Respuesta tardía | `confirmCreate` respeta `deleted_at`; `saveRemoteIfUnchanged` protege edición posterior. |
| Recuperación | Operaciones `sending` se normalizan al iniciar ejecutor existente; 401 pausa lote. |
| Incertidumbre | Resultado desconocido conserva tarea/operación y no se convierte en borrado confirmado. |
| Presentación | Inserción de tarea deduplica por `localId`; operaciones se renderizan por `operationId`. |

## Transiciones de eliminación

| Estado | Acción | Resultado |
|---|---|---|
| Create pending, sin envío | borrar | cancela create/update dependientes y elimina tarea local; no DELETE remoto. |
| Create sending/failed/unknown, sin remoteId | borrar | conserva tarea/operación; no concluye que servidor no creó. |
| Create responde después de borrar | respuesta | asigna remoteId, conserva pending_delete y encola DELETE con versión recibida. |
| Remota limpia | borrar | tombstone `pending_delete` + DELETE persistente; lista activa la oculta. |
| Update pendiente + borrar | borrar | conserva update y delete en orden; no reescribe payload ya enviado. |
| DELETE temporal/401/conflicto | respuesta | conserva operación recuperable; pausa por 401 o muestra conflicto. |
| Resultado remoto incierto | reintento | conserva identidad idempotente; no crea nueva operación de creación. |
| Operación sin tarea | reapertura | solo ocurre para datos históricos; se marca review, no se descarta ni recrea ID. |

## Cambios

- `mobile/src/services/task-repository.ts`: cancelación transaccional de create nunca enviado; `confirmCreate` conserva tombstone y encola delete posterior.
- `mobile/app/index.tsx`: inserción de creación deduplicada por `localId`; keys, navegación, imágenes y handlers usan identidad local explícita.
- `mobile/src/services/task-store.ts`: Block A mantiene tarea local ante 401 con `requiresAuth`.
- `mobile/src/services/sync-service.ts`: pausa tras 401 y mensajes con título/causa cuando existe.

No se modificaron backend, esquema Prisma, JWT, credenciales, endpoints ni migraciones SQLite.

## Pruebas

Añadida prueba SQLite real: create offline + update + delete antes de envío elimina tarea y operaciones juntas. Tests existentes cubren persistencia/reapertura, ownership, pending delete, versiones y conflictos. La carrera UI se reproduce como transición de estado: carga puede insertar misma tarea; inserción ahora elimina copia previa por `localId`.

No se añadió aún un harness RNTL de `Index`; la deduplicación se verifica en el updater real de estado y el warning físico requiere teléfono/React Native runtime.

Límites: no hay acceso a SQLite Android, red del teléfono, logout real ni promesas nativas en este entorno. No se afirma validación física.

## Comandos actuales

- Focalizadas: 2 suites, 13 tests, OK.
- `yarn workspace task-manager-mobile typecheck`: OK.
- `yarn typecheck:tests`: OK.
- `yarn lint`: OK.
- `yarn test`: backend 7 suites/69 tests OK; mobile 8 suites/96 tests OK.
- Docker: `/health` y `/ready` respondieron `200`.


## Pendientes / riesgos

- Confirmar desde teléfono la causa concreta del 401: URL efectiva auth/tasks, usuario JWT y respuesta HTTP sin imprimir token.
- Verificar recovery: 401 → nueva autenticación misma cuenta → sincronización manual → confirmación remota.
- Operaciones históricas huérfanas inseguras permanecen visibles como revisión; no se limpian automáticamente.

## Checklist físico sin borrar datos

A. Recargar app; revisar pendientes y títulos. No eliminar SQLite.
B. Crear online; pulsar Sincronizar; confirmar tarea en API/PostgreSQL.
C. Activar modo offline/red controlada; crear y borrar antes de reconectar; reconectar y verificar que no reaparece.
D. Crear offline, editar, sincronizar; verificar una sola tarea con contenido final.
E. Borrar tarea remota, sincronizar; consultar lista/API y verificar no reaparece.
F. Cerrar/reabrir app con pendiente; verificar recuperación de `sending` y cola.
G. Pulsar Sincronizar repetidamente y volver a foreground; verificar sin filas/avisos duplicados.
H. Simular 401 o sesión expirada; iniciar sesión con misma cuenta; sincronizar manualmente; verificar sin pérdida/duplicación.
I. Cambiar de cuenta; verificar lista y cola aisladas por propietario.

Requieren simulación controlada de red/sesión: C, H y escenarios de pérdida de respuesta. ADB/emulador/EAS no se ejecutaron por restricción del bloque.
