# P2.1 — Verificación de persistencia local, aislamiento y pendientes

## Inventario inicial y brechas

`task-repository.test.ts` ya ejecutaba migración, reapertura, CRUD, aislamiento básico, deduplicación remota y rollback transaccional contra SQLite real (`node:sqlite`). Faltaban comprobaciones explícitas de reapertura de campos de tarea completada/reabierta, metadata de archivos después de reapertura y asociación de archivos contra tarea de otra cuenta.

No se reprodujo ejecución roja previa: las brechas eran cobertura ausente, no fallo confirmado.

## Corrección aplicada

`LocalTaskRepository.saveLocalImage` ahora valida dentro de la transacción que tarea y `ownerId` coinciden antes de escribir metadata. Evita asociar metadata a una tarea ajena o inexistente. No se tocó backend ni se añadió sincronización.

## Modelo verificado

| Operación | Modo local | Resultado remoto perdido | HTTP 400/401/403 |
|---|---|---|---|
| Crear | `pending_create`, `remote_outcome=none` | `pending_create`, `remote_outcome=unknown` | No se guarda como éxito; error propagado |
| Editar creación pendiente | conserva `pending_create` | conserva estado y marca `unknown` | No fallback |
| Editar remota limpia | `pending_update` | `pending_update`, `unknown` | No fallback |
| Eliminar remota | `pending_delete`, oculta de lista activa | `pending_delete`, `unknown` | No fallback |
| Eliminar solo local | borrado físico, sin delete remoto | no aplica | no aplica |

Carga remota usa `preservePending`; no pisa ediciones pendientes ni resucita `pending_delete`. No existe envío automático, cola ni reintento.

## Escenarios y nivel

| Escenario | Evidencia | Resultado |
|---|---|---|
| Base vacía + migración | SQLite real Node | Pasa |
| Inicialización repetida | SQLite real Node | Pasa |
| Crear, cerrar, reabrir, recuperar | SQLite real Node | Pasa |
| Completar y reabrir tarea | SQLite real Node | Pasa |
| Borrado local/remoto pendiente | SQLite real Node | Pasa |
| Rollback por fallo intermedio | SQLite real Node + fallo inyectado | Pasa |
| Metadata de archivo tras reapertura | SQLite real Node | Pasa |
| Duplicado remoto | SQLite real Node | Pasa |
| Aislamiento de consultas y mutaciones | SQLite real Node, `alice`/`bob` e IDs cruzados | Pasa |
| Asociación de archivo ajeno | SQLite real Node, intento `bob` sobre tarea `alice` | Pasa tras validación |
| Fotos físicas persistentes | FileSystem revisado; sin Android disponible | Pendiente dispositivo |
| Carreras visuales/Auth tardías | Tests provider/composer | Pasa en suite mobile |

La prueba Node usa el mismo `LocalTaskRepository` y las mismas consultas/migraciones; solo sustituye el puente Expo por un adaptador mínimo `node:sqlite`. No valida el bridge nativo ni permisos Android. Las operaciones físicas de archivos requieren Development Build.

## Comandos y resultados

- `npm test --workspace mobile -- --runInBand src/services/__tests__/task-repository.test.ts`: **1 suite, 6 tests, pasa**.
- `npm run typecheck --workspace mobile`: **pasa**.
- Suite mobile completa final: **5 suites, 79 tests, pasa**.
- Suite backend completa final: **7 suites, 61 tests, pasa**.
- `npm test` raíz: **backend 61 tests y mobile 79 tests, pasa**.
- `npm run typecheck` raíz: mobile y backend pasan.
- `npx expo export --platform android` desde `mobile`: **pasa**, bundle Android generado en `mobile/dist`.
- `npm run lint --workspace mobile`: no existe script `lint` en workspace mobile. No se repitió.

Los warnings observados de `react-test-renderer` son deprecación, no fallos de estas garantías.

## SecureStore y acceso local

Provider real conserva identidad local validada en SecureStore, separa `accessMode=local` de token remoto, exige autenticación ante 401 y limpia token/identidad en logout. Los pendientes SQLite permanecen almacenados pero requieren volver a autenticarse como misma cuenta. No se guardan credenciales en SQLite/AsyncStorage.

## Fotos

Las fotos offline se copian a `Paths.document` bajo directorio por usuario y tarea; metadata queda en `task_files`. Fallo de copia ocurre antes del insert de metadata. La prueba de metadata es SQLite real; copia/borrado físico sigue pendiente en Android. No hay subida automática.

## Bloqueos y P3

Pendiente: exportación Android, compilación debug local y prueba con Development Build que incluya `expo-sqlite`; depende del entorno nativo/dispositivo. P3 debe respetar `remote_outcome=unknown`, no reenviar automáticamente operaciones inciertas sin política explícita, mantener filtros por `ownerId`, preservar pendientes y no convertir HTTP explícito en éxito local.

No hay defecto confirmado de persistencia o aislamiento que impida comenzar P3. Sincronización, colas y resolución de conflictos siguen fuera de P2.1.
