# P5 — Development Build Android

## Prerrequisitos

Node `v24.15.0`, Yarn Classic `1.22.22`, Java `21.0.8`, Android SDK/Gradle y Docker para EAS local. `mobile/app.json` conserva `com.taskmanager.mobile` y proyecto EAS existente. `mobile/eas.json` usa perfil `development` con `developmentClient` e `internal`.

## Comando reproducible

Desde raíz:

```bash
mkdir -p build-output
cd mobile
npx eas-cli@23.2.0 build --platform android --profile development --local --output ../build-output/task-manager-development.apk --non-interactive
```

EAS documenta `--local` y `--output`; el resultado debe ser un APK. El build no debe ejecutarse junto a tests pesados/emulador. Gradle workers se limitan según recursos del host si el build lo requiere.

## Uso

Con backend disponible y `EXPO_PUBLIC_API_URL` apuntando a IP LAN del equipo:

```bash
yarn run backend:start   # desde raíz, alternativa: yarn run backend
yarn run mobile:dev-client
adb install -r build-output/task-manager-development.apk
```
## Evidencia

Versión EAS: `eas-cli/23.2.0`, Linux x64, Node `v24.15.0`. El comando llegó a `:app:assembleDebug`, pero Gradle daemon desapareció durante compilación CMake nativa (`expo-modules-core`/Reanimated); exit code `1`. No se produjo APK, por lo que no hay ruta, tamaño ni hash SHA-256.

Expo Doctor ejecutado dentro del build: **19/21 checks passed**. El aviso de lockfiles múltiples correspondía a `package-lock.json`, eliminado durante migración; queda únicamente `yarn.lock`. También se reportó proyecto no-CNG con `android/` presente y propiedades declaradas en `app.json`.

Sin `adb` conectado al iniciar P5; instalación y hardware quedan pendientes.
