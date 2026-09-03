# P1 — Correcciones y pruebas de regresión

## Alcance y estado

P1 se ejecutó sobre rama actual `fix/camera-gps-auth`, conservando cambios previos y sin cambiar de rama, resetear, limpiar, hacer commit o publicar. Expo SDK 57 y su combinación de dependencias permanecen intactos. No se avanzó a P2.

## Defectos confirmados

| Flujo | Evidencia inicial | Causa raíz |
|---|---|---|
| Cámara | `attachPhoto()` solo apagaba `photoLoading` dentro de `catch`. Éxito y cancelación dejaban el botón bloqueado. | Falta de `finally` y de guardia síncrona contra reentrada. |
| GPS | `removeLocation()` apagaba `locationLoading` solo cuando la API fallaba. | Falta de `finally` en la eliminación remota. |
| Sesión | Cualquier error de `authApi.me()` borraba SecureStore. | El cliente HTTP descartaba status/código y el provider trataba red, 5xx y 401 como iguales. No había validación de respuesta ni estado recuperable. |

La línea base tenía mobile `1 suite / 48 tests`; no había cobertura ejecutable de estos tres flujos. La evidencia previa fue inspección del código real. No se registró una ejecución roja previa porque las pruebas se incorporaron durante la corrección; el resultado posterior está separado abajo.

## Correcciones

### Cámara y GPS

Se extrajo `useTaskComposer` en `mobile/src/services/task-composer.ts`; `mobile/app/index.tsx` lo utiliza directamente.

- Busy refs (`useRef`) bloquean reentrada antes del siguiente render.
- Cámara libera estado en éxito, cancelación y error mediante `finally`.
- Cancelación no produce feedback ni modifica preview.
- GPS remoto libera estado en éxito y error mediante `finally`.
- Error remoto conserva tarea, ubicación y formulario; permite reintentar.
- Tarea nueva elimina ubicación solo en memoria y no llama API.
- Todas las actualizaciones relevantes pasan por `mounted` para evitar cambios posteriores al desmontaje.
- Operaciones de ubicación comparten una guardia; no se envía dos veces la misma eliminación.

### Restauración de sesión

`mobile/src/services/auth.ts` ahora:

- conserva `statusCode` y `code` en `AuthHttpError`;
- valida usuario y respuestas login/register con Zod;
- distingue respuestas HTTP no exitosas de JSON malformado;
- conserva el contrato `/api/auth/me` y endpoints existentes.

`mobile/src/auth/AuthProvider.tsx` ahora expone `restoreError` y `retryRestore`.

- Sin token: finaliza carga sin sesión.
- 401: intenta borrar token y termina sin sesión.
- Red, 5xx, respuesta malformada o lectura SecureStore fallida: conserva token almacenado, no habilita sesión offline, termina carga y muestra reintento.
- Borrado SecureStore fallido durante 401: estado recuperable controlado.
- Contador de operación invalida respuestas tardías después de logout, login/register, retry o desmontaje.
- `mobile/app/index.tsx` muestra `StateMessage` en español con botón `Reintentar`.

## Casos cubiertos

| Escenario | Nivel | Límites simulados | Resultado |
|---|---|---|---|
| Foto exitosa conserva preview y permite segunda captura | Hook usado por pantalla | `takePhoto` | Aprobado |
| Cancelación no agrega foto ni feedback | Hook usado por pantalla | `takePhoto` devuelve `undefined` | Aprobado |
| Error/permisos de cámara libera carga y da feedback | Hook usado por pantalla | `takePhoto` rechaza | Aprobado |
| Dos capturas concurrentes abren una sola cámara | Hook usado por pantalla | Promesa controlada | Aprobado |
| Desmontaje durante cámara no actualiza estado | Hook usado por pantalla | Promesa controlada | Aprobado |
| Eliminación GPS remota actualiza tarea y formulario | Hook usado por pantalla | `tasksApi.update` | Aprobado |
| Error GPS conserva datos y permite reintento | Hook usado por pantalla | `tasksApi.update` rechaza y luego resuelve | Aprobado |
| Tarea nueva elimina GPS localmente | Hook usado por pantalla | API mock | Aprobado; cero llamadas |
| Eliminación GPS concurrente se envía una vez | Hook usado por pantalla | Promesa controlada | Aprobado |
| Error obteniendo GPS libera carga y da feedback | Hook usado por pantalla | `getCurrentLocation` rechaza | Aprobado |
| Ausencia de token | Provider real | `authApi.getToken` | Aprobado |
| Restauración válida | Provider real | `authApi.me` | Aprobado |
| 401 elimina sesión | Provider real | `AuthHttpError(401)` + SecureStore mock | Aprobado |
| Red, 5xx y respuesta malformada no autentican | Provider real | errores controlados | Aprobado |
| Reintento temporal exitoso | Provider real | `me` rechaza y luego resuelve | Aprobado |
| Lectura SecureStore falla | Provider real | `getToken` rechaza | Aprobado |
| Borrado SecureStore falla tras 401 | Provider real | `clearToken` rechaza | Aprobado |
| Logout durante restauración | Provider real | promesa `me` pendiente | Aprobado; respuesta tardía ignorada |
| Desmontaje durante restauración | Provider real | promesas controladas | Aprobado |
| `/api/auth/me` válido | Servicio real | `fetch` + `Response` local | Aprobado |
| `/api/auth/me` 401 conserva status/código | Servicio real | `fetch` + envelope backend | Aprobado |
| JSON exitoso malformado | Servicio real | `fetch` + `Response` local | Aprobado; ZodError |
| Error de red | Servicio real | `fetch` rechaza | Aprobado; error recuperable |

Estas pruebas no son E2E ni pruebas contra backend real. Son pruebas de hook/provider/servicio con límites externos simulados.

## Archivos modificados

- `mobile/app/index.tsx`: integración del hook y estado recuperable de sesión.
- `mobile/src/services/task-composer.ts`: lógica real de cámara/GPS y lifecycle guards.
- `mobile/src/services/auth.ts`: parsing y clasificación HTTP segura.
- `mobile/src/auth/AuthProvider.tsx`: restauración, retry y control de carreras.
- `mobile/jest.config.cjs`: soporte `.test.tsx` y setup de React act.
- `mobile/jest.setup.ts`: configuración del entorno de act.
- `mobile/src/services/__tests__/task-composer.test.tsx`: 10 regresiones de cámara/GPS.
- `mobile/src/auth/__tests__/AuthProvider.test.tsx`: 10 escenarios de restauración y carreras.
- `mobile/src/services/__tests__/auth.test.ts`: 4 escenarios de transporte y parsing.
- `mobile/package.json`, `package-lock.json`: `react-test-renderer` y tipos compatibles con React `19.2.3`.
- `docs/P0_EXPO_SDK_57_MIGRATION.md`: corrección de rollback y copias condicionales de `.env`.
- Este archivo.

No se modificaron backend, endpoints, esquema Prisma ni migraciones.

## Comandos ejecutados

Línea base:

```text
npm run test:mobile       1 suite / 48 tests aprobados
npm run test:backend      7 suites / 61 tests aprobados
npm run typecheck         aprobado mobile + backend
npm run lint              aprobado
```

Regresiones:

```text
npm --workspace mobile test -- --runInBand src/services/__tests__/task-composer.test.tsx
  1 suite / 10 tests aprobados

npm --workspace mobile test -- --runInBand src/auth/__tests__/AuthProvider.test.tsx src/services/__tests__/auth.test.ts
  2 suites / 15 tests aprobados

npm run test:mobile
  4 suites / 73 tests aprobados

npm ci
  aprobado; 1313 paquetes instalados desde package-lock.json

npm test
  backend 7 suites / 61 tests; mobile 4 suites / 73 tests; aprobado

npm run typecheck
  aprobado mobile + backend

npm run lint
  aprobado

npx expo export --platform android
  aprobado; Metro/Babel generó bundle Hermes Android
```

El warning de `react-test-renderer` deprecated proviene de React 19; no se ocultó ni se desactivaron reglas.

## Correcciones documentales P0

- Una rama sin commits no conserva por sí sola cambios pendientes. El procedimiento ahora exige commit, stash o exportar un parche antes de cambiar de rama; esta tarea no hace commits automáticos.
- Las copias de plantillas de entorno ahora son condicionales:

```bash
test -e backend/.env || cp backend/.env.example backend/.env
test -e mobile/.env || cp mobile/.env.example mobile/.env
```

No se sobrescriben archivos `.env` existentes.

## Verificación manual y bloqueos

No se declara hardware probado mediante mocks. Falta ejecutar con backend activo y emulador/dispositivo conectado:

- arranque y navegación;
- registro, login, restauración y logout;
- captura y cancelación de cámara;
- eliminación GPS con API real;
- restauración con red interrumpida;
- flujos de audio existentes.

El emulador disponible durante P0 se desconectó antes de la instalación manual; debe reconectarse antes de estas pruebas. No se ejecutaron E2E ni se usaron servicios remotos.

## Otros problemas fuera del alcance

- Expo Doctor mantiene las advertencias de P0 sobre `yarn.lock` local adicional y app config no sincronizada al versionar `android/`; no afectan estas regresiones y no se desactivaron.
- `react-test-renderer` emite warning de deprecación en React 19. Se mantiene como dependencia mínima para probar hooks y provider reales; migrarlo a otra infraestructura queda fuera de P1.
