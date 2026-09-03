# P3 — Diseño de sincronización segura

- **Lectura UI:** SQLite sigue siendo fuente inmediata; descarga remota reconcilia solo registros del usuario autenticado.
- **Operaciones:** nueva tabla local `sync_operations`, con `operation_id`, usuario, tarea, tipo, payload estable, versión esperada, estado y resultado.
- **Idempotencia:** `operation_id` generado antes del primer envío y persistido; PostgreSQL registra operación por usuario y responde con resultado previo.
- **Concurrencia:** API usa versión remota/`If-Match`; versión obsoleta devuelve conflicto, nunca última escritura silenciosa.
- **Reintentos:** solo operaciones protegidas y errores recuperables; misma clave, backoff limitado, un ejecutor por usuario. 401 pausa.
- **Resultado incierto P2:** operaciones `unknown` sin clave se conservan como revisión requerida y no se reenvían automáticamente.
- **Aislamiento:** todas las consultas locales y remotas derivan usuario del JWT y filtran ownership.
- **Fotografías:** creación de tarea primero; adjuntos dependen de `remote_id` y mantienen archivo local hasta confirmación. No se añade audio offline.
- **Pendientes P2:** nunca inventar claves retroactivas; mostrar revisión para `remote_outcome=unknown`.
