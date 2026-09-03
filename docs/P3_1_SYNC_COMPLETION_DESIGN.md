# P3.1 — Diseño de cierre

## Inventario

P3 ya aporta `Task.version`, `TaskMutation`, operaciones SQLite persistentes y executor manual. P3.1 completa: uploads de imagen idempotentes, resolución explícita de conflictos, disparadores de foreground/conectividad y reintentos con presupuesto durable.

## Decisiones

- SQLite continúa como fuente de lectura inmediata.
- Cada operación conserva clave y payload; respuestas tardías se aplican solo al propietario y operación vigente.
- Conflictos conservan snapshot local y remoto; resolver servidor descarta solo operación afectada, conservar cambios crea operación nueva con versión remota actual.
- Imágenes usan hash de bytes + tarea + usuario como fingerprint y clave persistente; filesystem escribe temporal, registra metadata y limpia temporal/final cuando corresponde.
- Foreground y conectividad solo disparan sesión remota válida; acceso local nunca autoriza HTTP.
- Reintentos limitados; 429 respeta `Retry-After`; 401 pausa; 400/403/conflicto no reintentan solos.
- P2 `unknown` permanece en revisión y no se reenvía automáticamente.
