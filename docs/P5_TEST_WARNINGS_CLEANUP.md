# P5 — Limpieza quirúrgica de warnings de tests

## Línea base

Suites afectadas:

- `mobile/src/auth/__tests__/AuthProvider.test.tsx`
- `mobile/src/services/__tests__/task-composer.test.tsx`

Ambas usaban directamente `create()` y tipos de `react-test-renderer`, provocando `react-test-renderer is deprecated` con React `19.2.3`.

El servicio `mobile/src/services/preferences.ts` emite dos warnings intencionales cuando AsyncStorage falla: `[preferences] unable to read task filter` y `[preferences] unable to save task filter`. No existen en este checkout tests que simulen esos fallos; no se modificó el servicio ni se añadió silenciamiento global.

## Migración elegida

Se eligió `@testing-library/react-native@14.0.0`, estable y compatible con React `>=19`, React Native `>=0.78` y Jest `>=29`. Documentación oficial RNTL v14 requiere APIs async y el paquete `test-renderer`; Expo SDK 57 se acompaña con `jest-expo@57.0.0` y `@react-native/jest-preset@0.86.3`.

RNTL v14 usa `test-renderer`, no el paquete deprecated `react-test-renderer`. `jest-expo` conserva internamente su renderer compatible; por eso no se afirma que desaparezca toda dependencia transitiva, únicamente el uso directo y warning del código propio.

## Cambios

- AuthProvider tests: `create`/`ReactTestRenderer` sustituidos por `render`, `act` y cleanup públicos de RNTL.
- Task-composer tests: mismo cambio; `render` async y `unmount` async.
- Jest mobile usa `jest-expo` y `babel-jest` para transformar React Native correctamente.
- Añadidos `@testing-library/react-native`, `test-renderer`, `jest-expo` y `@react-native/jest-preset` como devDependencies de mobile.
- Retirados `react-test-renderer` y `@types/react-test-renderer` como dependencias directas.
- `--runInBand` conservado.
- `yarn.lock` actualizado solo por estas dependencias/configuración.

No se modificó código productivo, Expo/React, backend, API, base de datos ni Android.

## Escenarios preservados

Los 21 tests de las dos suites siguen pasando. Se conservaron restauración de sesión, éxito, invalidación, errores SecureStore, reintento, logout tardío, desmontaje, cámara, cancelación, errores, doble captura, reentrada, GPS, reintento y cleanup.

## Verificación

```bash
yarn workspace task-manager-mobile test src/auth/__tests__/AuthProvider.test.tsx src/services/__tests__/task-composer.test.tsx --runInBand
yarn test:mobile
yarn test:backend
yarn typecheck
yarn typecheck:tests
yarn lint
```

Resultados:

- Suites afectadas: 2/2; 21/21 tests.
- Mobile: 8 suites; 95/95 tests.
- Backend: 7 suites; 69/69 tests.
- Typecheck producto: correcto.
- Typecheck tests backend: correcto.
- Lint: correcto.
- El warning directo de `react-test-renderer` desapareció en las suites afectadas.
- No aparecieron warnings de `act`, promesas sin manejar ni cleanup.

La suite mobile aún muestra `console.info` de diagnóstico de auth existente; no es warning de React ni se modificó en esta tarea. Los warnings de preferencias no fueron producidos porque no hay tests de fallo de preferencias en el checkout actual; si se añaden casos, deben usar spy local, validar mensaje y restaurar `console.warn`.
