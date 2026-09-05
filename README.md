# Task Manager Mobile

Aplicación académica de gestión de tareas para Android, desarrollada con React Native y Expo. Funciona primero sobre almacenamiento local y puede sincronizar tareas y fotografías con una API propia cuando existe una sesión remota y conectividad.

Funcionalidades principales:

- registro, login, logout y recuperación de sesión;
- creación, edición, finalización, reapertura y eliminación de tareas;
- trabajo local inmediato con SQLite;
- sincronización opcional de tareas y fotografías;
- ubicación GPS asociada a tareas;
- cámara, fotografías locales y copias remotas protegidas;
- notas de voz locales con grabación, preview, reproducción y eliminación;
- importación selectiva de tareas ficticias desde JSONPlaceholder;
- interfaz en español con sistema visual Mulberry Night.

## Stack resumido

| Área | Tecnologías principales |
|---|---|
| Mobile | Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router, TypeScript 6, NativeWind 4 y SQLite |
| Backend | Express 5, TypeScript 5.9, Zod, JWT, Multer y Prisma 6 |
| Datos remotos | PostgreSQL 16.6 |
| Desarrollo | Yarn Classic 1.22.22, Docker Compose y Expo Development Build |
| Pruebas | Jest, Testing Library, Supertest y ts-jest |

## Estado funcional

| Funcionalidad | Local/offline | Remota | Estado |
|---|---|---|---|
| Autenticación | Sesión e identidad previamente validadas conservadas en SecureStore | JWT emitido y validado por backend | Vigente |
| Tareas | SQLite por usuario; cambios inmediatos | PostgreSQL mediante sincronización | Vigente |
| Fotografías | Archivo en filesystem y metadata en SQLite | Upload, metadata y descarga protegida | Vigente |
| GPS | Coordenadas completas persistidas con tarea | Incluido al crear o actualizar tarea | Vigente |
| Notas de voz | Archivo y metadata locales; reproducción sin conexión | API backend existente, no consumida por flujo móvil estable | Parcial deliberado |
| Importación | Selección y procedencia persistidas localmente | JSONPlaceholder como fuente ficticia; al sincronizar, checkout móvil envía la tarea sin procedencia externa | Vigente con límite documentado |

“Parcial deliberado” significa que audio remoto móvil no pertenece al alcance estable actual. Grabación y reproducción local sí funcionan; upload, descarga y sincronización móvil de audio no están conectados.

## Arquitectura

```text
Aplicación móvil
React Native + Expo Router
SQLite + SecureStore + filesystem local
              ↕ HTTP / Bearer JWT
Backend Express + Zod
              ↕ Prisma
PostgreSQL + volumen de uploads
```

### Responsabilidades de almacenamiento

- **SQLite** es fuente local inmediata para UI, tareas, metadata de fotografías, metadata de audio y cola de sincronización. Los registros se aíslan por `ownerId`.
- **PostgreSQL** conserva usuarios, tareas remotas, versiones, mutaciones idempotentes y metadata de attachments. API admite procedencia externa, pero sincronización móvil vigente no la envía para tareas importadas.
- **SecureStore** conserva JWT e identidad local previamente validada. Credenciales y tokens no van a AsyncStorage ni SQLite.
- **Filesystem del dispositivo** conserva fotografías y notas de voz locales. SQLite guarda URI y metadata, no binarios.
- **Volumen Docker de uploads** conserva binarios remotos bajo `backend/uploads` dentro del contenedor. No existe una ruta pública `/uploads`; las descargas válidas pasan por endpoints autenticados.
- **AsyncStorage** conserva solo preferencias no sensibles, actualmente filtro de tareas.

SQLite y PostgreSQL no cumplen la misma función. Cada operación móvil escribe primero una identidad local estable y puede reconciliar después su representación remota.

### `localId`, `remoteId` y sincronización

- `localId` identifica la tarea en SQLite y en la UI. Se usa también como key estable de listas.
- `remoteId` es UUID asignado por PostgreSQL después de creación remota; puede ser `null` mientras la tarea existe solo localmente.
- `remoteVersion` conserva versión conocida del servidor. Update y delete pueden enviar `If-Match`; versión stale produce `409 TASK_VERSION_CONFLICT`.
- `sync_operations` es cola durable para create, update, delete e image. Cada operación conserva `operationId`, payload, intentos y estado.
- `operationId` se envía como `Idempotency-Key` donde corresponde. Repetir misma clave con misma solicitud devuelve mismo resultado lógico; reutilizarla con solicitud distinta devuelve `409 IDEMPOTENCY_KEY_REUSED`.
- Conflictos no se resuelven silenciosamente. UI permite aceptar servidor o conservar cambio local con versión remota actualizada.
- Sincronización puede iniciarse manualmente y al volver app a foreground con sesión remota válida. No corre con app cerrada ni como tarea background.
- Fotografías quedan locales hasta confirmación remota. Eliminación física ocurre solo después de actualizar metadata o confirmar flujo correspondiente; filesystem y PostgreSQL no forman una transacción única.
- Tareas importadas entran a cola como tareas normales, pero `sourceProvider`/`sourceExternalId` quedan solo en SQLite en checkout actual; deduplicación de reimportación móvil sigue siendo local.

Ownership siempre deriva de `userId` del JWT. Cliente nunca elige propietario mediante body o query.

## Estructura

```text
mobile/                         Aplicación Expo, UI, servicios y persistencia local
backend/                        API Express
backend/prisma/                 Esquema y migraciones PostgreSQL
scripts/                        Setup raíz y orquestación Docker/Metro
postman/                        Colección manual de API

docs/                           Informes históricos y guías vigentes
docker-compose.yml              PostgreSQL, migraciones y backend
.env.example                    Plantilla segura del único entorno local
package.json                    Workspaces y comandos raíz
```

## Prerrequisitos

Entorno reproducible comprobado por configuración vigente:

- Node.js `24.15.0`;
- Yarn Classic `1.22.22`;
- Docker Engine o Docker Desktop con Docker Compose v2;
- dispositivo o emulador Android con Expo Development Build del proyecto instalado;
- teléfono y host en misma red local para pruebas físicas;
- puertos de Metro y `BACKEND_PORT` accesibles desde dispositivo.

Docker no se instala ni se inicia mediante `yarn setup`; script solo valida disponibilidad de `docker compose`. APIs nativas usadas por SecureStore, SQLite, cámara, GPS y audio requieren Development Build. Expo Go no es superficie de validación del proyecto.

## Instalación automática

Desde raíz:

```bash
yarn install --frozen-lockfile
yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000
yarn dev:docker
```

### Qué hace `yarn setup`

1. valida disponibilidad de Node.js, Yarn y Docker Compose;
2. crea `.env` raíz desde `.env.example` solo cuando falta;
3. completa `POSTGRES_DB`, `POSTGRES_USER` y `BACKEND_PORT` si están vacíos;
4. reemplaza placeholders de `POSTGRES_PASSWORD` y `JWT_SECRET` con valores aleatorios generados por `node:crypto`;
5. valida puerto y URL pública;
6. conserva valores válidos existentes.

Es idempotente: repetirlo no regenera secretos ya configurados ni sobrescribe valores válidos. No inicia Docker.

Precedencia de URL:

1. `--api-url` explícito;
2. `EXPO_PUBLIC_API_URL` ya presente en `.env`;
3. candidato IPv4 LAN, solo en modo interactivo y cuando existe exactamente uno;
4. error con candidatas disponibles cuando falta URL o hay ambigüedad.

Modo no interactivo falla si falta URL. `.env.example` contiene una IP de ejemplo, no una detección automática; usar `--api-url` con IP real evita conservar placeholder.

```bash
# Interactivo: solo autoselecciona cuando falta URL y existe una candidata única
yarn setup

# Reproducible y recomendado
yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000
```

### Qué hace `yarn dev:docker`

1. ejecuta `yarn setup --non-interactive`;
2. construye e inicia Compose;
3. espera PostgreSQL saludable;
4. aplica `prisma migrate deploy` mediante servicio `migrate`;
5. inicia backend;
6. consulta `GET /ready` hasta 120 segundos;
7. inicia Metro en host con perfil Development Client.

`Ctrl+C` detiene Metro y ejecuta Compose `down`. Volúmenes nombrados permanecen.

## Variables de entorno

Existe un único `.env` local en raíz:

| Variable | Consumidor | Uso |
|---|---|---|
| `POSTGRES_DB` | Compose | Nombre de base Docker |
| `POSTGRES_USER` | Compose | Usuario PostgreSQL Docker |
| `POSTGRES_PASSWORD` | Compose | Password PostgreSQL Docker |
| `JWT_SECRET` | Backend | Firma y validación JWT |
| `BACKEND_PORT` | Compose/scripts | Puerto publicado del backend en host |
| `EXPO_PUBLIC_API_URL` | Metro/mobile | URL HTTP pública alcanzable por dispositivo |

Reglas:

- `.env` raíz está ignorado por Git y Docker build context;
- no copiar `.env` a `mobile/` ni `backend/`;
- solo `EXPO_PUBLIC_API_URL` se entrega a Metro y puede formar parte del bundle;
- nunca usar prefijo `EXPO_PUBLIC_` para secretos;
- `BACKEND_PORT=3000` exige normalmente `EXPO_PUBLIC_API_URL=http://IP_LAN_DEL_HOST:3000`;
- no versionar valores reales de password, JWT, token o credenciales.

## Comandos vigentes

Todos desde raíz salvo indicación contraria.

| Acción | Comando |
|---|---|
| Instalar dependencias | `yarn install --frozen-lockfile` |
| Preparar `.env` | `yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000` |
| Docker + backend + Metro | `yarn dev:docker` |
| Estado Compose | `yarn status:docker` |
| Logs Compose | `yarn logs:docker` |
| Detener Compose | `yarn stop:docker` |
| Rebuild backend/migrate sin cache | `yarn rebuild:docker` |
| Metro normal | `yarn mobile` |
| Metro Development Client | `yarn mobile:dev-client` |
| Backend host en desarrollo | `yarn backend` |
| Backend host | `yarn backend:start` |
| Typecheck producto | `yarn typecheck` |
| Typecheck tests backend | `yarn typecheck:tests` |
| Lint monorepo | `yarn lint` |
| Todas las pruebas | `yarn test` |
| Pruebas backend | `yarn test:backend` |
| Pruebas mobile | `yarn test:mobile` |
| Generar Prisma Client | `yarn workspace task-manager-backend prisma:generate` |
| Validar Prisma schema | `yarn workspace task-manager-backend exec prisma validate` |
| Estado de migraciones | `yarn workspace task-manager-backend exec prisma migrate status` |
| Development Build Android local | `yarn workspace task-manager-mobile android` |

Backend ejecutado directamente en host requiere `DATABASE_URL`, `JWT_SECRET` y opcionalmente `PORT`/`UPLOAD_DIR`; flujo recomendado de desarrollo es Docker porque construye esas variables desde `.env` raíz.

## Docker Compose

Servicios:

- `db`: PostgreSQL `16.6-bookworm`, interno como `db:5432`;
- `migrate`: espera DB saludable y ejecuta `prisma migrate deploy` una vez;
- `backend`: espera migración exitosa, publica puerto `${BACKEND_PORT}:3000` y usa volumen de uploads;
- Metro: corre en host, nunca dentro de Compose.

Readiness:

- `GET /health` confirma proceso HTTP y devuelve `200 {"status":"ok"}`;
- `GET /ready` consulta PostgreSQL y devuelve `200 {"status":"ready"}` o `503 {"status":"not-ready"}`.

Volúmenes:

- `task-manager-dev-postgres`: datos PostgreSQL;
- `task-manager-dev-uploads`: imágenes y audios almacenados por backend.

`yarn stop:docker` y `Ctrl+C` usan `docker compose down`; eliminan contenedores/red, no volúmenes.

> No usar `docker compose down -v` salvo que se quiera eliminar deliberadamente base de datos y archivos subidos.

## Generar e instalar el Development Build

Development Build es cliente Android nativo propio del proyecto. Incluye `expo-dev-client` y módulos usados por SQLite, SecureStore, cámara, GPS y audio; después de instalarlo, carga JavaScript/TypeScript desde Metro.

No es lo mismo que:

- **Metro:** servidor del bundle JavaScript, no instala módulos nativos;
- **backend:** API y PostgreSQL, independientes del APK;
- **APK de producción:** binario firmado para distribución final, no configurado aquí;
- **Expo Go:** cliente genérico que no sustituye validación de módulos y configuración nativos del proyecto.

Configuración auditada:

- script workspace `android`: `expo run:android`;
- `mobile/android/`: proyecto nativo versionado;
- package/namespace Android: `com.taskmanager.mobile`;
- scheme: `task-manager` — manifiesto nativo también registra `exp+task-manager`;
- `expo-dev-client`: dependencia instalada;
- proyecto EAS: owner `wuanpack` y `projectId` configurado;
- único perfil EAS: `development`, con `developmentClient: true` y `distribution: internal`;
- EAS CLI: no es dependencia y no existe script Yarn para EAS.

Fuentes oficiales: [Development builds](https://docs.expo.dev/develop/development-builds/introduction/), [compilación local](https://docs.expo.dev/guides/local-app-development/), [EAS CLI](https://docs.expo.dev/build/setup/#install-the-latest-eas-cli), [distribución interna EAS](https://docs.expo.dev/build/internal-distribution/) y [variables de entorno](https://docs.expo.dev/guides/environment-variables/).

### Ruta A — compilación local con Android SDK

Requisitos:

- JDK 21; entorno auditado usa Java `21.0.8`;
- Android Studio o Android SDK compatible con Expo SDK 57;
- `ANDROID_HOME` apuntando al SDK; `ANDROID_SDK_ROOT` puede depender de instalación;
- Android SDK Platform/Build Tools solicitados por Gradle;
- `platform-tools` y `adb` disponibles en `PATH`;
- teléfono físico con opciones de desarrollador, depuración USB y autorización RSA, o emulador Android iniciado.

Repositorio no fija números de Platform/Build Tools en `mobile/android/app/build.gradle`: los resuelve configuración Expo/Gradle. Instalar componentes que Gradle solicite, sin documentar compatibilidad más amplia no verificada.

Desde raíz, para teléfono por USB:

```bash
yarn install --frozen-lockfile
adb devices
yarn workspace task-manager-mobile android --device
```

`adb devices` debe mostrar serial con estado `device`. Estado `unauthorized` requiere desbloquear teléfono y aceptar autorización RSA. Lista vacía significa que ADB no detecta teléfono/emulador.

`--device` permite elegir dispositivo físico conectado. Script ejecuta `expo run:android`: compila variante debug mediante SDK local, instala binario, abre app e inicia Metro cuando compilación termina. Primera compilación puede tardar por Gradle, CMake y dependencias nativas.

Para emulador:

1. iniciar AVD desde Android Studio;
2. confirmar estado `device` con `adb devices`;
3. ejecutar:

```bash
yarn workspace task-manager-mobile android
```

Sin `--device`, Expo usa emulador disponible por defecto. Con varios destinos, usar `--device`.

Docker/backend no necesita estar activo para compilar o instalar cliente. Sí será necesario para autenticación y sincronización después. `expo run:android` inicia Metro; puede detenerse con `Ctrl+C` tras verificar instalación y reiniciarse mediante flujo integrado del proyecto.

### Instalar APK local manualmente

Build debug local exitoso produce artifact Gradle confirmado por metadata actual:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Normalmente instalación manual no hace falta porque `expo run:android` instala mediante ADB. Para reinstalar APK ya generado desde raíz:

```bash
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Con varios dispositivos:

```bash
adb -s SERIAL install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Ruta existe solo después de build debug exitoso y está ignorada por Git. F.1.1 confirmó configuración/metadata existente; no compiló ni instaló APK.

### Ruta B — EAS Development Build

`mobile/eas.json` contiene perfil real `development`:

```json
{
  "developmentClient": true,
  "distribution": "internal"
}
```

Según Expo, `distribution: internal` cambia build Android predeterminado a APK instalable, salvo `gradleCommand` personalizado. Este perfil no define comando personalizado, por lo que genera APK de distribución interna, no AAB. AAB está orientado a Play Store y no se instala directamente como APK.

EAS CLI no está instalado en dependencias ni existe script Yarn. Sin modificar manifests, usar runner oficial:

```bash
npx eas-cli@latest login
cd mobile
npx eas-cli@latest build --platform android --profile development
```

Ruta requiere cuenta Expo y login. EAS sube proyecto, compila en servicio remoto y entrega enlace/QR. En teléfono Android se descarga APK y se permite instalación desde fuente desconocida cuando sistema lo solicite. También puede instalarse en emulador desde prompt de EAS o descargando APK.

Enlace interno debe tratarse como acceso al binario: por defecto cualquiera con URL puede descargarlo si proyecto permite acceso no autenticado. Revisar configuración del proyecto Expo antes de compartir.

### Conectar cliente instalado a Metro y backend

Orden recomendado después de instalación:

1. configurar URL pública:

   ```bash
   yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000
   ```

2. iniciar PostgreSQL, migraciones, backend y Metro:

   ```bash
   yarn dev:docker
   ```

3. abrir Development Build instalado;
4. elegir servidor mostrado por launcher, QR o URL de Metro;
5. mantener teléfono y host en misma LAN.

`EXPO_PUBLIC_API_URL` se incorpora en bundle servido por Metro. Cambiarla no exige reconstruir APK mientras configuración nativa permanezca igual: reiniciar Metro mediante `yarn dev:docker` y hacer reload completo del cliente. Variables `EXPO_PUBLIC_*` quedan visibles en bundle.

### Cuándo reconstruir

Reconstruir e instalar nuevamente normalmente al cambiar:

- dependencia con código nativo;
- Expo SDK o React Native;
- plugins Expo;
- permisos o configuración nativa;
- package Android o scheme;
- archivos dentro de `mobile/android/`.

Normalmente basta recarga o reinicio de Metro para:

- JSX, TypeScript o lógica JavaScript;
- estilos y textos;
- `EXPO_PUBLIC_API_URL` servida por Metro;
- assets que Metro pueda actualizar.

Si Metro conserva bundle anterior, detenerlo, iniciar nuevamente y usar limpieza de caché solo cuando exista evidencia de caché stale. No regenerar `mobile/android/` ni borrar caches indiscriminadamente.

### Solución de problemas

#### ADB no detecta teléfono

```bash
adb devices
adb kill-server
adb start-server
adb devices
```

Revisar cable con datos, depuración USB, autorización RSA, modo USB y reglas udev en Linux. Primera instalación física documentada usa USB; no se presupone ADB inalámbrico.

#### App instalada pero no conecta a Metro

Revisar misma LAN, firewall, VPN/bridge incorrecto, terminal de Metro, QR/URL, puertos Expo y reload. Confirmar que Development Build corresponde a dependencias/configuración nativas actuales.

#### Backend inaccesible

Desde teléfono probar:

```text
http://IP_LAN_DEL_HOST:3000/ready
```

No usar `localhost`: desde teléfono apunta al propio teléfono.

#### Cambio nativo no aparece

Ejecutar nuevamente ruta local o EAS e instalar nuevo Development Build.

#### Fallo Gradle

Leer primer error real de Gradle/CMake y corregir requisito señalado. Resumen final puede ocultar causa inicial. No borrar `android/`, `.gradle`, SDK o caches como respuesta genérica.

### Seguridad del Development Build

- Development Build es para desarrollo, no publicación.
- No compartir APK suponiendo que contenido público sea secreto.
- `EXPO_PUBLIC_*` es visible en bundle; nunca guardar JWT, passwords, claves privadas o secretos.
- URL pública de API no es credencial, pero no publicar endpoints internos innecesariamente.
- No compartir enlace EAS interno sin revisar acceso.
- No reutilizar keystore o credenciales fuera de su alcance sin comprender firma, actualización e identidad de aplicación.

## Uso desde dispositivo Android

1. Obtener IPv4 LAN del host en interfaz física conectada a misma red del teléfono.
2. Evitar direcciones de VPN, bridge Docker o interfaz inactiva.
3. Configurar URL usando puerto publicado:

   ```bash
   yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000
   ```

4. Ejecutar `yarn dev:docker`.
5. Confirmar desde host `http://127.0.0.1:3000/ready` y, si red lo permite, desde teléfono `http://IP_LAN_DEL_HOST:3000/ready`.
6. Abrir Development Build ya instalado y conectarlo al Metro mostrado por terminal/QR.
7. Si falla conexión, revisar que teléfono y host compartan LAN, desactivar VPN conflictiva y permitir `BACKEND_PORT`/puerto Metro en firewall.

`localhost` o `127.0.0.1` dentro del teléfono apunta al teléfono, no al computador. Postman ejecutado en host sí puede usar `http://localhost:3000`.

## Pruebas y alcance

Gates completos:

```bash
yarn typecheck
yarn typecheck:tests
yarn lint
yarn test
```

Conteo verificado en F.1:

- backend: **8 suites, 80 tests**;
- mobile: **14 suites, 127 tests**;
- total: **22 suites, 207 tests**;
- snapshots: 0.

Jest/Supertest cubre contratos HTTP, auth, ownership, tareas, ubicación, attachments, idempotencia y validación. Jest mobile cubre esquemas, servicios, SQLite, sincronización, importación y componentes. Estos gates no prueban bridge Android, permisos reales, cámara, GPS, micrófono, reproducción, gestos ni conectividad física.

Validación adicional según cambio:

```bash
docker compose -p task-manager-dev -f docker-compose.yml config --quiet
yarn workspace task-manager-backend exec prisma validate
yarn workspace task-manager-backend exec prisma migrate status
yarn workspace task-manager-mobile android
```

Docker, Prisma contra DB, Gradle, dispositivo físico y EAS se ejecutan solo cuando cambio lo requiere. No son necesarios para cambios puramente documentales.

## API y Postman

Colección:

```text
postman/task-manager.postman_collection.json
```

### Flujo recomendado

1. iniciar backend;
2. importar colección;
3. mantener `baseUrl=http://localhost:3000` cuando Postman corre en host;
4. ejecutar Health y Ready;
5. registrar usuario ficticio y hacer Login;
6. confirmar que Login guardó `token` como variable de colección;
7. ejecutar Me;
8. crear tarea y reutilizar `taskId`/`taskVersion` capturados;
9. listar, obtener y actualizar tarea;
10. seleccionar archivos locales manualmente para multipart;
11. ejecutar pruebas de validación, ownership, conflicto e idempotencia;
12. ejecutar deletes y Logout al final.

Variables incluidas: `baseUrl`, `email`, `password`, `token`, `otherEmail`, `otherPassword`, `otherToken`, `taskId`, `taskVersion`, `imageId`, `audioId`, `createIdempotencyKey` e `imageIdempotencyKey`. Credenciales son datos locales evidentemente ficticios; tokens e IDs comienzan vacíos.

### Contratos relevantes

- Rutas privadas: `Authorization: Bearer {{token}}`.
- Create task y upload image de colección: `Idempotency-Key`; claves se generan solo si variable correspondiente está vacía y permanecen estables para replay.
- Update/delete: `If-Match` acepta versión decimal opcional; colección usa `{{taskVersion}}` sin sintaxis ETag añadida.
- Imágenes: multipart `file`; MIME permitidos `image/jpeg`, `image/png`, `image/webp`; máximo 10 MiB.
- Audio backend: multipart `file` + `duration`; MIME `audio/mp4`, `audio/mpeg`, `audio/aac`, `audio/wav`, `audio/x-m4a`; máximo 10 MiB y duración mayor que 0 hasta 3600 segundos.
- No fijar manualmente `Content-Type: multipart/form-data`; Postman genera boundary.
- Descargas usan `/api/tasks/:taskId/images/:imageId/file` y `/api/tasks/:taskId/audios/:audioId/file` con Bearer. Nunca usar `/uploads` ni token en query.
- Recursos ajenos devuelven 404 para no revelar existencia.

Scripts Postman guardan token/IDs/versiones únicamente cuando respuesta válida contiene campo esperado. No imprimen secretos. Archivos binarios y rutas locales no están versionados: usuario debe seleccionarlos en Postman.

## Limitaciones vigentes

- Audio móvil remoto fuera de alcance: cliente estable conserva notas de voz solo localmente, aunque backend mantiene API de audio para pruebas directas.
- Sincronización no corre con app cerrada, no usa background task y no resuelve conflictos silenciosamente.
- Filesystem local y PostgreSQL no ofrecen transacción distribuida única.
- Multipart valida MIME declarado por cliente, no magic bytes.
- APIs nativas requieren Development Build y dispositivo Android físico para validación completa.
- Cámara, GPS, audio, lector de pantalla, fuente aumentada y gestos deben validarse físicamente.
- JSONPlaceholder contiene datos ficticios; importación sirve como demostración, no como fuente confiable.
- `ExampleBox` usa scroll interno y catálogo acotado a máximo 200 registros; catálogo grande requiere otra estrategia.
- EAS, Gradle, emuladores y contenedores no se ejecutan automáticamente por gates Jest/TypeScript.
- No existe deployment productivo ni perfil EAS `production` configurado.
- `uploads` local/volumen Docker es apropiado para desarrollo académico, no almacenamiento productivo distribuido.
- Logout backend es stateless; aplicación elimina sesión local, servidor no mantiene blacklist JWT.

## Seguridad

- Passwords se hashean con bcryptjs; `passwordHash` no se devuelve.
- JWT viaja solo en header Bearer y se guarda en SecureStore.
- Zod valida cuerpos, parámetros y queries en límites HTTP.
- Ownership usa JWT y filtros por usuario/tarea/attachment.
- Archivos remotos se descargan mediante endpoints protegidos; `/uploads` no se expone con `express.static`.
- `.env`, uploads y tokens reales no se versionan.

## Uso académico

Proyecto para Desarrollo de Aplicaciones Móviles. Documentación histórica de etapas vive en `docs/`; README describe estado vigente del checkout.