# P5 — Corrección de autenticación Android y tipos Jest

## Diagnóstico confirmado

La petición móvil sí podía quedar esperando indefinidamente: `mobile/src/services/auth.ts` usaba `fetch` sin timeout, incluyendo `response.json()`. La instrumentación segura registró método, ruta, URL efectiva, status y duración, sin credenciales ni cuerpos.

En ejecución de tests, la URL efectiva sin sustitución Expo fue `http://10.205.187.96:3000`, el fallback compilado en `auth.ts`. El `.env` actual de `mobile` contiene `http://192.168.100.1:3000`; por tanto, el APK instalado fue generado con otra configuración efectiva o con bundle anterior. Postman contra `/health` no demuestra conectividad desde el teléfono. No había dispositivo `adb` disponible para comprobar la ruta física.

La pantalla no se quedaba bloqueada por una transición interna de navegación: su `finally` sí libera su loading local. El bloqueo ocurre antes, esperando la promesa de autenticación HTTP. AuthProvider tampoco inicia sincronización remota durante login/register.

## Corrección

- `auth.ts` usa `AbortController` con límite de 15 segundos que cubre fetch y lectura del cuerpo.
- Timer se limpia siempre.
- Timeout se clasifica como `AuthTimeoutError`; la pantalla muestra error recuperable en español y libera loading mediante `finally`.
- Se conservan guards de doble envío de las pantallas y control de operación tardía del provider.
- Diagnóstico `console.info` queda solo para desarrollo y registra URL/ruta/status/tiempo; nunca token, Authorization, password ni cuerpo.
- El APK requiere rebuild para incorporar una URL Expo pública distinta: `EXPO_PUBLIC_API_URL` queda embebida durante bundling. No es un cambio nativo, pero sí afecta bundle JavaScript.

## TypeScript/Jest

`backend/tsconfig.json` solo incluía `src/**/*.ts`; por eso `yarn typecheck` no comprobaba `backend/tests`. Aunque `@types/jest` ya estaba instalado y compatible (`^30.0.0`), el editor no tenía una configuración explícita para asociar globals Jest.

Se añadió `backend/tsconfig.test.json`, extendiendo configuración productiva, incluyendo `src` y `tests`, y declarando `types: ["node", "jest"]`. Se añadió `typecheck:tests` en backend y raíz.

Comando reproducible:

```bash
yarn typecheck:tests
```

Resultado: correcto; desaparecen `jest`, `beforeEach` y `describe` como símbolos ausentes.

## Pruebas

Antes de corregir no se inventó una prueba roja previa; la reproducción confirmada fue la espera del fetch sin finalización y la URL efectiva observada en instrumentación/tests.

Después:

```bash
yarn workspace task-manager-mobile test src/services/__tests__/auth.test.ts --runInBand
yarn workspace task-manager-backend run typecheck:tests
yarn test
yarn typecheck
yarn typecheck:tests
yarn lint
yarn workspace task-manager-mobile expo export --platform android
```

Resultados: auth 5/5; backend 7 suites / 69 tests; mobile 8 suites / 95 tests; typecheck de producto y tests OK; lint OK; export Android OK.

La regresión cubre respuesta exitosa, HTTP 401, JSON inválido, error de red y fetch que no responde. SecureStore y provider ya tenían pruebas de restauración, errores y operaciones obsoletas; no se cambió backend ni base de datos.

## Reproducción exacta

1. Conectar teléfono y backend a misma LAN.
2. Confirmar desde otro equipo: `curl http://IP_LAN_BACKEND:3000/health`.
3. Editar `mobile/.env` sin sobrescribir secretos:
   `EXPO_PUBLIC_API_URL=http://IP_LAN_BACKEND:3000`.
4. Desde `mobile/`, reiniciar Metro limpiamente:
   `yarn start --clear`.
5. Abrir Development Build conectada al Metro y observar logs `[auth]`.
6. Ejecutar login/registro con cuenta de prueba.
7. Verificar que log muestre URL LAN correcta, status HTTP y retorno a la pantalla.

Para APK EAS, volver a construir después de confirmar `.env`; la URL se embebe en el bundle. No ejecutar reintento automático de registro si la respuesta se pierde; usar login manual.

## Evidencia física

No se verificó login/registro en el teléfono durante esta sesión: `adb devices` no mostró dispositivos. Tampoco se pudo probar backend inaccesible desde hardware. La evidencia física queda pendiente.

Conclusión: tipos Jest corregidos y verificados; autenticación ahora tiene finalización acotada y diagnóstico de URL, y causa de esta ejecución quedó identificada como URL embebida distinta del `.env` actual. Confirmación final en APK/teléfono requiere rebuild con URL LAN correcta y prueba física.
