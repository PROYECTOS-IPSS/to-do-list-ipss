# P3 — Sincronización segura de tareas

## Implementación

- PostgreSQL añade `Task.version` y `TaskMutation` durable, único por usuario + `Idempotency-Key`.
- Crear, actualizar y eliminar aceptan `Idempotency-Key`; update/delete aceptan `If-Match`.
- Repetición con mismo payload devuelve respuesta registrada; reutilización con payload distinto devuelve 409.
- Versiones obsoletas producen `TASK_VERSION_CONFLICT`; no hay última escritura silenciosa.
- SQLite v2 añade `sync_operations` con identidad, payload, versión esperada, intentos y estado persistente.
- Executor manual único procesa pendientes, limita intentos a tres, pausa 401 y conserva conflictos/revisión.
- UI expone botón `Sincronizar`; SQLite sigue siendo fuente inmediata.
- Operaciones P2 `remote_outcome=unknown` no reciben clave retroactiva ni se reenvían automáticamente.

## Evidencia

- PostgreSQL real: replay serial/concurrente, payload mismatch, ownership, versiones obsoletas y doble eliminación; pasa.
- Mobile SQLite: **1 suite, 7 tests, pasa**; suite mobile completa previa: **5 suites, 79 tests, pasa**.
- `npm test`, `npm run typecheck`, `npm run lint` raíz: pasan.
- `prisma validate` y `prisma migrate status`: pasan; base local actualizada.
- `npx expo export --platform android` desde `mobile`: pasa.

## Límites confirmados

- Fotografías ahora usan `Idempotency-Key`, hash de bytes + destino y `TaskMutation`; replay y concurrencia no duplican metadata.
- Tareas create/update/delete online generan operación persistente antes del envío; executor manual reutiliza la misma clave tras fallo de respuesta.
- Conflictos tienen resolución UI española; foreground dispara sync con sesión remota válida.

