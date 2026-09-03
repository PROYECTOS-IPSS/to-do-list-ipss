# P0 — Migración a Expo SDK 57

## Estado

Migración ejecutada en rama `chore/expo-sdk-57`. La aplicación declara Expo SDK 57 y React Native 0.86.3. No se hicieron commits, pushes ni publicaciones.

## Estado inicial y causa Babel

Estado observado al comenzar:

| Componente | Inicial declarado | Inicial instalado observado |
|---|---:|---:|
| Expo | `~54.0.0` | `54.0.36` |
| React Native | `0.81.5` | `0.81.5` |
| React | `19.1.0` | `19.1.0` |
| Expo Router | `~6.0.0` | `6.0.24` |
| Reanimated | `^3.19.4` | `3.19.5` |
| NativeWind | `4.1.23` | `4.1.23` |
| css-interop | `0.1.22` | `0.1.22` |
| Worklets | no declarado | no instalado |

La combinación alternativa antecedente NativeWind `4.2.6` + css-interop `0.2.6` carga desde `react-native-css-interop/babel.js` el plugin `react-native-worklets/plugin`. El proyecto solo tenía Reanimated 3 y no tenía `react-native-worklets`; por eso la resolución concreta fallaba con `Cannot find module 'react-native-worklets/plugin'`. La combinación original instalada usaba `react-native-reanimated/plugin` desde css-interop `0.1.22`, pero no era válida para el objetivo SDK 57.

No se instaló Worklets como parche de Reanimated 3. Se actualizó Reanimated a 4 junto con Worklets y css-interop compatible.

## Versiones finales

| Componente | Final declarado | Final instalado en verificación |
|---|---:|---:|
| Expo | `~57.0.17` | `57.0.19` |
| React Native | `0.86.3` | `0.86.3` |
| React / React DOM | `19.2.3` | `19.2.3` |
| Expo Router | `~57.0.18` | `57.0.18` |
| Expo modules principales | `~57.x` | `expo-audio 57.0.4`, `expo-camera 57.0.4`, `expo-location 57.0.15`, `expo-file-system 57.0.6`, `expo-image-picker 57.0.15`, `expo-secure-store 57.0.3` |
| NativeWind | `4.2.6` | `4.2.6` |
| css-interop | `0.2.6` | `0.2.6` |
| Reanimated | `4.5.1` | `4.5.1` |
| Worklets | `0.10.1` | `0.10.1` |
| TypeScript | `~6.0.3` | `6.0.3` |
| Jest mobile | `~29.7.0` | `29.7.x` |

NativeWind permaneció en la línea mayor 4; el salto a `4.2.6` fue necesario para css-interop `0.2.6`, que soporta RN `0.83`–`0.86` y Worklets `0.10.x`.

## Saltos ejecutados

### SDK 54 → 55

- `expo` pasó a `~55.0.0`.
- Expo CLI alineó módulos, React `19.2.0` y RN `0.83.10` mediante `npx expo install --fix --npm`.
- Se alineó el conjunto NativeWind `4.2.6`, css-interop `0.2.6`, Reanimated `4.2.1` y Worklets `0.7.4`.
- Se añadieron `expo-constants` y `expo-linking`, peers requeridos por Expo Router.
- SDK 55 eliminó `newArchEnabled` de app config; se retiró de `mobile/app.json`.
- Primera exportación del salto quedó bloqueada por instalación mezclada Yarn/npm y resolución de `babel-preset-expo`; una instalación limpia con npm y lock regenerado corrigió ese problema.

### SDK 55 → 56

- Expo CLI alineó Expo Router `56.2.20`, Expo modules `56.x`, React `19.2.3`, RN `0.85.3`, Reanimated `4.3.1` y Worklets `0.8.3`.
- SDK 56 dejó de admitir paquetes `@react-navigation/*` junto con Expo Router; no había imports de aplicación, por lo que se retiró `@react-navigation/native` del manifest.
- TypeScript 6 dejó de incluir automáticamente globals Jest en este proyecto; se añadió `types: ["jest"]` al tsconfig móvil.
- `StatusBar.backgroundColor` ya no forma parte del tipo de SDK 56; se eliminó la prop. El color de barras queda gestionado por edge-to-edge/configuración nativa.
- Exportación Android SDK 56 completó Metro y Babel.

### SDK 56 → 57

- Se instaló `expo@~57.0.17`; npm resolvió patch `57.0.19`.
- `npx expo install --fix --npm` alineó Expo modules, Router `57.0.18`, RN `0.86.3`, Reanimated `4.5.1` y Worklets `0.10.1`.
- Se añadió `expo-system-ui`, requerido por `userInterfaceStyle` en Android.
- Se eliminó `expo.edgeToEdgeEnabled` obsoleto de `mobile/android/gradle.properties`.
- NativeWind 4.2.6, css-interop 0.2.6 y Metro existente se conservaron.

## Monorepo y lockfile

- El nombre privado del paquete raíz pasó de `task-manager-mobile` a `task-manager-workspace`; evitó colisión de identidad con workspace `mobile` y permitió una instalación npm limpia.
- Dependencias Expo duplicadas del manifest raíz se eliminaron; pertenecen al workspace móvil.
- Se conserva `package-lock.json` raíz y los comandos usan npm explícitamente.
- `yarn.lock` ya era un cambio local no rastreado al iniciar. No se eliminó. Por eso Expo Doctor conserva una advertencia de dos lockfiles; npm es lockfile autoritativo para este repositorio.

## Android y personalizaciones conservadas

Se ejecutó `npx expo prebuild --platform android --no-clean` después de inspeccionar el proyecto nativo. No se regeneró ni borró `mobile/android`.

Se conservaron:

- package/applicationId `com.taskmanager.mobile`;
- orientación portrait y scheme `task-manager` / `exp+task-manager`;
- permisos de cámara, audio, ubicación, red y vibración;
- Hermes y New Architecture;
- debug keystore y signing local existente;
- Gradle wrapper `8.14.3`, Java 21 y Android SDK local disponible;
- clases `MainActivity` y `MainApplication` con Expo wrappers;
- configuración Metro NativeWind y `global.css`.

Prebuild actualizó únicamente la integración esperada para SDK 57: permisos declarados, reglas de backup SecureStore, metadata de bsdiff, servicio Android de controles de audio, barras transparentes y `expo.inlineModules.watchedDirectories=[]`. También añadió los plugins `expo-font` y `expo-status-bar` durante la alineación SDK 56.

## Comandos y resultados

### Línea base

- `npm test`: backend ejecutó 61 tests, pero el proceso terminó con error de Prisma: cliente generado para `debian-openssl-3.0.x`, runtime `rhel-openssl-3.0.x`.
- `npm test --workspace mobile`: 1 suite, 48 tests aprobados.
- `npm run typecheck`: mobile y backend aprobados.
- `npm run lint`: aprobado.
- Resolución de `react-native-worklets/plugin`: falló, causa descrita arriba.
- Expo Doctor SDK 54 detectó versiones fuera de rango para Reanimated, Jest y parches Expo, además de lockfiles duplicados y app config no sincronizada.

### Verificación final ejecutada

- `npm ci`: aprobado; instalación limpia del lockfile raíz (`1312` paquetes añadidos).
- `npm run prisma:generate`: aprobado; cliente Prisma regenerado para el runtime local.
- `npm test`: aprobado; backend 7 suites / 61 tests y mobile 1 suite / 48 tests.
- `npm run typecheck`: aprobado para mobile y backend.
- `npm run lint`: aprobado.
- `npm --workspace backend exec prisma validate`: esquema válido.
- `npm --workspace backend exec prisma migrate status`: base local al día, 4 migraciones encontradas.
- `npx expo install --check --npm`: aprobado; dependencias alineadas.
- `npx expo export --platform android`: aprobado; Metro/Babel generó bundle Hermes Android.
- `npx expo-doctor`: 19/21 checks aprobados; solo reporta `yarn.lock` local adicional y app config no sincronizada por mantener `android/` versionado.
- `./gradlew app:assembleDebug --max-workers=2 --no-daemon -x lint -x test`: aprobado; `BUILD SUCCESSFUL`, 511 tareas.
- `npm run android --workspace mobile`: primer intento falló por timeout de Gradle Worker Daemon; tras adaptar `MainApplication.kt` al host SDK57 y limitar workers, la compilación Gradle terminó correctamente.
- `adb install`/arranque manual: bloqueado porque el emulador dejó de estar conectado después de compilar (`adb: no devices/emulators found`).

## Instalación y ejecución

Desde raíz:

```bash
npm ci
test -e backend/.env || cp backend/.env.example backend/.env
test -e mobile/.env || cp mobile/.env.example mobile/.env
npm run prisma:generate
npm run prisma:migrate
npm run backend
```

En otra terminal:

```bash
npm run mobile:dev-client
```

Controles:

```bash
npm run test:backend
npm run test:mobile
npm test
npm run typecheck
npm run lint
npm --workspace mobile exec expo-doctor
npm --workspace mobile exec expo export --platform android
```

Development Build Android local:

```bash
npm run android --workspace mobile
```

El backend requiere PostgreSQL accesible. En dispositivo físico, `EXPO_PUBLIC_API_URL` debe apuntar a la IP LAN del equipo; no usar `localhost` del teléfono.

## Verificaciones manuales pendientes

- Arranque y navegación en emulador/dispositivo.
- Registro, login, restauración de sesión y logout contra backend real.
- CRUD completo de tareas.
- Cámara: captura y cancelación.
- GPS: concedido, denegado y servicio desactivado.
- Audio: grabar, preview, reproducir y eliminar.

Bundle Android confirma Babel/Metro, no sustituye instalación y ejercicio de periféricos. No se usan datos reales para estas pruebas.

## Reversión segura

1. Guardar o revisar cambios locales antes de cambiar de rama; no ejecutar `git reset --hard`, `git clean` ni `checkout` destructivo.
2. Una rama sin commits no conserva por sí sola cambios pendientes: hacer commit, stash o exportar un parche antes de cambiar de rama. Esta migración no hizo commit automático.
3. Volver a la rama anterior con `git switch <rama-anterior>` solo después de confirmar que sus cambios están conservados.
4. Si se necesita reconstruir dependencias de una rama, ejecutar `npm ci` usando el `package-lock.json` de esa rama; no copiar `node_modules` entre ramas.
5. Restaurar Android únicamente desde los archivos versionados de la rama objetivo y revisar `git diff` antes de cualquier operación destructiva.

No se cambió backend, esquema Prisma ni migraciones. El fallo de Prisma de la línea base debe resolverse regenerando el cliente en el entorno destino; no es una modificación funcional de esta migración.
