# P5 — Resultados

## Línea base

Antes de cambios: backend 69 tests y mobile 94 tests pasaban; typecheck/lint pasaban. Warning existente: `react-test-renderer` deprecated.

## Resultado final

- Backend: **7 suites, 69 tests, pasa**.
- Mobile: **8 suites, 94 tests, pasa**.
- Adaptador externo: **8 tests, pasa**.
- SQLite repository/importación: **10 tests, pasa**.
- Backend coverage: **85.24% statements**, **68.68% branches**, **88.70% lines**.
- Mobile coverage: **66.47% statements**, **44.44% branches**, **70.75% lines**.
- EAS local: **failed** during `:app:assembleDebug`; Gradle daemon disappeared during native CMake compilation. No APK produced.
- Prisma validate: pasa.
- Migraciones locales aplicadas: pasa.
- Expo export Android: pasa.
- EAS local: pendiente de resultado del comando documentado aparte.

No se presenta exportación como APK ni mocks como integración PostgreSQL.
