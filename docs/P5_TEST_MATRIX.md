# P5 — Matriz de verificación

| Riesgo/función | Caso | Nivel | Código real | Simulados | Entorno | Test/resultado |
|---|---|---|---|---|---|---|
| Auth | login/register, validación, respuesta HTTP | unitario/integración controlada | schemas, auth API/provider | transporte y SecureStore | Node/Jest | suites auth existentes, pasa |
| Tareas | CRUD, validación, estados | componente/servicio | TaskStore, SQLite, UI | API | Node + SQLite real | suites existentes, pasa |
| Sync | reintentos, 401, conflictos, respuesta tardía | integración controlada | sync-service/repository | transporte, reloj/promesas | Node + SQLite real | sync/repository suites, pasa |
| Importación | Zod, mixtos, duplicados, límites, cancelación, 429/5xx | unitaria | adaptador real | fetch | Node/Jest | `jsonplaceholder-adapter.test.ts`, 8 pasa |
| Importación local | lote atómico, procedencia, dedupe, aislamiento | integración | repository/migraciones | ninguno | SQLite `node:sqlite` real | repository suite, 10 pasa |
| Provenance remoto | manual/importada, unicidad y reconciliación | integración | Prisma/service/schema | HTTP en suite existente | PostgreSQL local | task suite 15 pasa; específica P4 pendiente |
| Filesystem multimedia | hash, limpieza parcial | integración | attachment/file storage | requests | PostgreSQL/filesystem temporal | attachment suite existente |
| UI importación | preview/selección/confirmación/error | componente | `app/import.tsx` | API externa | Jest/Node | pendiente; Maestro preparado |
| E2E | login, CRUD, persistencia, importación | E2E | APK + backend | proveedor puede ser smoke | Android | pendiente: Maestro no instalado/dispositivo ausente |
| APK | Development Build instalable | build | eas/android/Gradle | ninguna | local | resultado en `P5_ANDROID_DEVELOPMENT_BUILD.md` |

Diferencias: `node:sqlite` no valida puente nativo `expo-sqlite`; mocks HTTP/Prisma no prueban backend/PostgreSQL; exportación no es APK; APK no prueba instalación ni hardware.
