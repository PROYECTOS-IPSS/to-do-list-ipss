# P5 — Migración npm a Yarn

## Decisión

Se adopta Yarn Classic `1.22.22`, versión disponible y compatible con workspaces actuales. La versión queda fijada mediante `packageManager` en `package.json`, `.yarnrc` y `.yarn/releases/yarn-1.22.22.cjs`.

No se actualizaron dependencias de producto ni contratos de aplicación.

## Cambios

- `package-lock.json` eliminado del repositorio después de copiarlo a `../task-manager-lockfile-backup/package-lock.json`.
- `yarn.lock` queda como lockfile autoritativo; su hash no cambió durante migración.
- Scripts raíz migrados a `yarn`, incluyendo workspaces por nombre:
  - `task-manager-mobile`
  - `task-manager-backend`
- README, AGENTS y guía activa de Development Build actualizados.
- `npx eas-cli@23.2.0` se conserva únicamente como launcher explícitamente versionado para EAS CLI; no es gestor de dependencias.

## Instalación reproducible

```bash
yarn install --frozen-lockfile --non-interactive
```

Resultado: instalación limpia y reinstalación forzada completadas; `yarn.lock` permaneció sin cambios. `yarn workspaces info` resolvió ambos workspaces correctamente.

`yarn check --integrity` continúa fallando con `Integrity check failed` y advertencia de que lockfiles no coinciden, pese a que la instalación congelada pasa. Se conserva como riesgo conocido y no se presenta como verificación verde.

## Verificación Yarn

Ejecutado desde raíz:

```bash
yarn test
yarn typecheck
yarn lint
yarn run prisma:generate
yarn workspace task-manager-backend exec prisma validate
yarn workspace task-manager-backend exec prisma migrate status
yarn workspace task-manager-mobile expo export --platform android
```

Resultados esperados ya comprobados: backend 7 suites / 69 tests, mobile 8 suites / 94 tests, TypeScript, lint, Prisma y export Android correctos.

## EAS

EAS CLI `23.2.0` detectó Yarn durante ejecución previa y el proyecto conserva solo `yarn.lock`. No se repitió compilación EAS completa después de migrar. La compilación anterior llegó a `:app:assembleDebug`, pero el daemon Gradle desapareció durante CMake nativo; no se produjo APK. No hubo dispositivo `adb` conectado ni Maestro disponible.
