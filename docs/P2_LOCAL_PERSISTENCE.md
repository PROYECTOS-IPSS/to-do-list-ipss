# P2 — Persistencia local y acceso degradado

## Implementado

- SQLite local mediante `expo-sqlite`, con migración `PRAGMA user_version`.
- Tablas `tasks` y `task_files`, siempre filtradas por `ownerId`.
- Estados `clean`, `pending_create`, `pending_update` y `pending_delete`.
- Crear, editar y eliminar funcionan en modo local.
- Fallos de red conservan cambios localmente y muestran estado incierto.
- Errores HTTP no se convierten en éxito local.
- Fotografías offline se copian a `FileSystem.documentDirectory` y se muestran desde URI local.
- Identidad local validada se guarda en SecureStore; logout limpia token e identidad.
- Home, formulario y detalle consumen repositorio local compartido.

## Fuera de P2

No hay sincronización automática, reintentos, cola ejecutora ni resolución automática de conflictos. Esas garantías requieren P3.

Audio offline no se presenta como subida exitosa: tarea local puede grabar vista previa, pero persistencia/subida de audio requiere tarea remota.

## Verificación

- `npm run typecheck`: mobile y backend pasan.
- `npm test`: backend 61 tests; mobile 77 tests; todo pasa.
- `npm run lint --workspace mobile`: no existe script `lint` en workspace mobile.
- Expo export/build Android y prueba con hardware real quedan pendientes de entorno nativo; `expo-sqlite` requiere recompilar Development Build.
La verificación detallada de persistencia, aislamiento y estados pendientes está en [`P2_1_PERSISTENCE_VERIFICATION.md`](./P2_1_PERSISTENCE_VERIFICATION.md).
