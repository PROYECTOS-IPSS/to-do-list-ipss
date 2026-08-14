# Task Manager

Aplicación académica móvil para gestionar tareas con autenticación, autorización por usuario, ubicación, fotografías y notas de voz.

El repositorio es un monorepo npm con dos workspaces:

- `mobile/`: aplicación React Native + Expo + TypeScript.
- `backend/`: API REST Express + TypeScript.
- PostgreSQL: persistencia relacional mediante Prisma.
- Almacenamiento local de desarrollo: archivos de imágenes y audios fuera de PostgreSQL; la base de datos conserva sus metadatos.

## Estado actual

Las etapas 1 a 8 están implementadas en código. Las validaciones físicas de cámara, GPS y audio fueron completadas en Development Build Android; la evidencia física de Etapa 7 también fue aprobada.

Verificación final ejecutada:

```text
Test Suites: 7 passed, 7 total
Tests:       61 passed, 61 total
Failures:    0
TypeScript:  mobile y backend OK
ESLint:      OK
Prisma:      schema válido; migraciones al día
Android:     debug build OK
``` 

Los tests de adjuntos utilizan mocks de Prisma para aislar la API. La validación física Android cubre los flujos nativos; no sustituye las limitaciones explícitas de tests automatizados sobre disco.

## Características

### Autenticación y sesión

- Registro de usuarios con `name`, `email` y contraseña.
- Email único y validación con Zod.
- Contraseñas almacenadas como hash mediante `bcryptjs`.
- Login con JWT firmado mediante `JWT_SECRET` y expiración configurada.
- Endpoint `/api/auth/me` para recuperar el usuario de la sesión.
- JWT almacenado en Android mediante `expo-secure-store`.
- Recuperación automática de sesión al iniciar la aplicación.
- Logout que elimina el token local.
- Token inválido o expirado elimina la sesión local.
- Rutas de tareas protegidas mediante `Authorization: Bearer <token>`.

El formulario actual de registro no incluye confirmación separada de contraseña; valida la contraseña enviada al backend.

### Tareas

- Crear, listar y consultar tareas.
- Editar título y descripción.
- Completar y descompletar tareas.
- Eliminar tareas.
- Asociar ubicación actual durante la creación o edición.
- Abrir el detalle de una tarea.
- Crear estados de carga, error, retry y estados vacíos diferenciados por filtro.
- Persistir filtro `all`/`active`/`completed` en AsyncStorage; solo se almacenan preferencias no sensibles.
- Bloquear submits, uploads, eliminaciones y cambios repetidos mientras están en curso.
- Confirmar eliminaciones y mostrar feedback de guardado, eliminación y adjuntos.
- Las preferencias usan valor `all` como fallback si AsyncStorage falla.

La edición funciona desde el formulario de la pantalla principal. El botón `Edit` de la pantalla de detalle actualmente vuelve a la pantalla anterior; no abre un formulario de edición propio.

### Periféricos y adjuntos

- Cámara mediante `expo-image-picker` con permiso solicitado al ejecutar la acción.
- Preview local de la fotografía recién capturada.
- Asociación de imagen a una tarea mediante upload multipart.
- Ubicación foreground mediante `expo-location`.
- Registro de `latitude`, `longitude`, `accuracy` y `timestamp`.
- Grabación de notas de voz mediante `expo-audio`.
- Duración de la grabación, detención y upload asociado a una tarea.
- La captura de imagen conserva preview local. Las notas de voz usan preview local, reproducción con URL protegida y header Bearer, upload posterior a confirmación y cleanup de recursos nativos; los flujos fueron validados en Android físico/emulado.
- Acceso backend a archivos mediante endpoints autenticados, no mediante `express.static` público.

La captura de imagen conserva preview local. Las notas de voz usan preview local, reproducción con URL protegida y header Bearer, upload posterior a confirmación y cleanup de recursos nativos; la validación física Android de este flujo aún está pendiente.

### Audio y notas de voz

- `expo-audio` solicita micrófono únicamente al iniciar una grabación.
- Flujo `recording → stop → preview → save` con cancelación.
- `TaskAudio.duration` se almacena en segundos y admite decimales.
- Audios se guardan físicamente bajo `uploads/audios/`; PostgreSQL conserva metadata.
- Reproducción persistida utiliza `/api/tasks/:id/audios/:audioId/file` con Bearer JWT.
- Límite de audio: 10 MB y 3.600 segundos.
- MIME soportados: `audio/mp4`, `audio/mpeg`, `audio/aac`, `audio/wav`, `audio/x-m4a`.
- Cleanup detiene recording/playback y descarta previews temporales.

## Arquitectura

```text
┌────────────────────────────────────────────┐
│ Mobile                                      │
│ React Native + Expo + Expo Router           │
│ Screens → servicios HTTP/native APIs        │
└──────────────────┬─────────────────────────┘
                   │ HTTP/HTTPS + Bearer JWT
                   ▼
┌────────────────────────────────────────────┐
│ Backend                                     │
│ Express → routes → controllers → services   │
│ Zod → validación                            │
└──────────────────┬─────────────────────────┘
                   │ Prisma
                   ▼
┌────────────────────────────────────────────┐
│ PostgreSQL                                  │
│ Usuarios, tareas y metadata de adjuntos     │
└────────────────────────────────────────────┘

Archivos binarios: almacenamiento local bajo uploads/
Base de datos: relaciones, URLs y metadata
```

El frontend separa pantallas de servicios de API y capacidades nativas. El backend separa rutas, controladores, servicios, middleware y schemas.

## Tecnologías

### Mobile

Versiones declaradas en `mobile/package.json`:

- React Native `0.81.5`.
- Expo `~54.0.0`.
- TypeScript `~5.9.2`.
- `@react-native-async-storage/async-storage` `^2.2.0` para el filtro local no sensible.
- Expo Router `~6.0.0`.
- React `19.1.0`.
- `expo-dev-client` `~6.0.0`.
- `expo-secure-store` `~15.0.8`.
- `expo-image-picker` `~17.0.11`.
- `expo-camera` `~17.0.10`.
- `expo-location` `~19.0.8`.
- `expo-audio` `~1.1.1`.
- `expo-file-system` `~19.0.23` para eliminar previews temporales.

La implementación actual de captura usa `expo-image-picker.launchCameraAsync`; `expo-camera` también está declarado y configurado en el proyecto nativo.

### Backend

Versiones declaradas en `backend/package.json`:

- Node.js con Express `^5.1.0`.
- TypeScript `^5.9.2`.
- Prisma y `@prisma/client` `^6.14.0`.
- PostgreSQL.
- Zod `^4.0.17`.
- `bcryptjs` `^3.0.3`.
- `jsonwebtoken` `^9.0.3`.
- Multer `^2.2.0`.
- Jest `^30.0.5`.
- Supertest `^7.1.4`.
- Nodemon, `tsx` y `ts-jest` para desarrollo y pruebas.

## Estructura del proyecto

```text
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── tests/
│   ├── uploads/
│   ├── .env.example
│   ├── jest.config.cjs
│   ├── package.json
│   └── tsconfig.json
├── mobile/
│   ├── app/
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── src/
│   │   ├── auth/
│   │   └── services/
│   ├── android/
│   ├── .env.example
│   ├── app.json
│   ├── eas.json
│   ├── package.json
│   └── tsconfig.json
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── package-lock.json
├── package.json
├── tsconfig.json
└── README.md
```

`mobile/android/` es el proyecto nativo generado mediante Expo Prebuild. El paquete Android configurado es `com.taskmanager.mobile`.

## Requisitos

- Node.js y npm.
- PostgreSQL accesible.
- Android SDK para compilar el Development Build local.
- Emulador Android o dispositivo físico para probar periféricos.
- Yarn disponible si se desea usar exactamente `yarn dev` dentro de `backend/`.

## Instalación y configuración

### 1. Clonar e instalar

```bash
git clone <URL_DEL_REPOSITORIO>
cd to-do-list
npm install
```

El `package.json` raíz declara los workspaces `mobile` y `backend`.

### 2. Configurar PostgreSQL

Crear una base de datos PostgreSQL para el proyecto y preparar una URL de conexión. No se incluyen credenciales reales en este README.

### 3. Configurar backend

Crear `backend/.env` a partir de `backend/.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/task_manager
JWT_SECRET=reemplazar-por-un-secreto-local-largo
```

Variables utilizadas por el backend:

| Variable | Requerida | Uso |
|---|---:|---|
| `PORT` | No | Puerto HTTP; usa `3000` si no se define. |
| `DATABASE_URL` | Sí | Conexión PostgreSQL consumida por Prisma. |
| `JWT_SECRET` | Sí | Firma y validación de JWT. |
| `UPLOAD_DIR` | No | Directorio raíz opcional para archivos; por defecto usa `uploads`. |

`UPLOAD_DIR` es leído por el servicio de almacenamiento, aunque no aparece en el `.env.example` actual.
La plantilla `.env.example` de la raíz también contiene `EXPO_PUBLIC_API_URL`; la configuración efectiva de la aplicación se realiza en `mobile/.env`.

### 4. Configurar mobile

Crear `mobile/.env` a partir de `mobile/.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

En un dispositivo Android físico, `localhost` apunta al dispositivo. Usar la dirección LAN del equipo donde corre el backend, por ejemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

Los servicios mobile tienen además un fallback de desarrollo definido en código si la variable no está disponible. Se recomienda configurar siempre `EXPO_PUBLIC_API_URL` explícitamente.

### 5. Generar Prisma Client y aplicar migraciones

Desde la raíz:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Estos scripts ejecutan, respectivamente, `prisma generate` y `prisma migrate dev` dentro del workspace `backend`. `prisma:migrate` es un comando de desarrollo y puede modificar la base configurada.

### 6. Preparar el Development Build

Desde `mobile/`:

```bash
npm run android
```

El comando ejecuta `expo run:android`. Debe reconstruirse el Development Build cuando se incorporan o cambian módulos nativos.

## Desarrollo

### Backend

Desde `backend/`:

```bash
yarn dev
```

El script real es `nodemon --exec tsx src/server.ts`. Alternativas definidas por el proyecto:

```bash
# Desde backend/
npm run dev

# Desde la raíz
npm run backend
```

El servidor usa el puerto `3000` por defecto:

```text
http://localhost:3000
```

Health check:

```bash
curl -i http://localhost:3000/health
```

### Mobile

Con el backend ejecutándose y `EXPO_PUBLIC_API_URL` configurada:

```bash
cd mobile
npx expo start --dev-client
```

Alternativa desde la raíz:

```bash
npm run mobile:dev-client
```

El proyecto utiliza Expo Development Build. Expo Go no es el entorno principal porque cámara, audio, SecureStore y demás módulos nativos se integran en el build de desarrollo.

### Scripts disponibles en la raíz

| Comando | Acción |
|---|---|
| `npm run mobile` | Ejecuta `expo start` en `mobile`. |
| `npm run mobile:dev-client` | Ejecuta Expo con `--dev-client`. |
| `npm run backend` | Inicia Nodemon en `backend`. |
| `npm run backend:start` | Inicia el servidor backend sin Nodemon. |
| `npm run typecheck` | Comprueba TypeScript de mobile y backend. |
| `npm run prisma:generate` | Genera Prisma Client. |
| `npm run prisma:migrate` | Ejecuta `prisma migrate dev`. |
| `npm test` | Ejecuta Jest en backend. |
| `npm run lint` | Ejecuta ESLint en el repositorio. |

Scripts adicionales de `mobile/`:

```bash
npm run start
npm run start:dev-client
npm run android
npm run typecheck
```

Scripts adicionales de `backend/`:

```bash
yarn start
yarn typecheck
yarn prisma:generate
yarn prisma:migrate
yarn test
```

## Base de datos y Prisma

PostgreSQL almacena los datos relacionales. Prisma usa `DATABASE_URL` y genera el cliente desde `backend/prisma/schema.prisma`.

Modelos actuales:

- `User`: `id`, `name`, `email`, `passwordHash`, `createdAt`, `updatedAt`.
- `Task`: `id`, `userId`, `title`, `description`, `completed`, `latitude`, `longitude`, `locationAccuracy`, `locationTimestamp`, `createdAt`, `updatedAt`.
- `TaskImage`: `id`, `taskId`, `url`, `filename`, `mimeType`, `size`, `createdAt`.
- `TaskAudio`: `id`, `taskId`, `url`, `duration` (segundos decimales), `mimeType`, `size`, `createdAt`.

Relaciones:

```text
User 1 ─── N Task
Task 1 ─── N TaskImage
Task 1 ─── N TaskAudio
```

Las relaciones de adjuntos tienen borrado en cascada desde `Task`. La eliminación de una imagen o audio también intenta eliminar su archivo físico.

Las migraciones existentes se encuentran en `backend/prisma/migrations/`. PostgreSQL es la base requerida; no se utiliza una base NoSQL alternativa.
La migración `20260814190000_add_task_location_constraints` mantiene ubicación opcional y evita nuevos registros con ubicación parcial o coordenadas fuera de rango.

## API REST

Base local:

```text
http://localhost:3000
```

Las rutas autenticadas requieren:

```http
Authorization: Bearer <token>
```

### Health y rutas públicas

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `GET` | `/health` | No | Devuelve `{ "status": "ok" }`. |
| `POST` | `/api/auth/register` | No | Crea usuario y devuelve usuario público más JWT. |
| `POST` | `/api/auth/login` | No | Verifica credenciales y emite JWT. |

### Sesión autenticada

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `GET` | `/api/auth/me` | Sí | Devuelve el usuario identificado por el JWT. |
| `POST` | `/api/auth/logout` | Sí | Responde `204`; el cliente elimina el token de SecureStore. |

El logout backend es stateless: no existe una lista de revocación de tokens en el servidor.

### Tasks

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/tasks` | Sí | Crea una tarea propiedad del usuario autenticado. |
| `GET` | `/api/tasks` | Sí | Lista las tareas propias. Admite `completed=true` o `completed=false`. |
| `GET` | `/api/tasks/:id` | Sí | Consulta una tarea propia. |
| `PATCH` | `/api/tasks/:id` | Sí | Actualiza uno o más campos de una tarea propia. |
| `DELETE` | `/api/tasks/:id` | Sí | Elimina una tarea propia; Prisma elimina en cascada su metadata relacionada. |

Validaciones principales:

- `title` obligatorio, trim, entre 1 y 200 caracteres.
- `description` opcional, hasta 2.000 caracteres.
- `completed` booleano.
- ID de tarea con formato UUID.
- Coordenadas dentro de sus rangos geográficos.
- `locationAccuracy` finita, no negativa y hasta `100` metros; el valor es una política de precisión configurable en backend.
- `locationTimestamp` convertido a fecha válida.
- Schemas de creación estrictos; campos inesperados producen error de validación.

El backend obtiene `userId` del JWT. No acepta un `userId` arbitrario desde el body.

### Imágenes

Todas las rutas requieren autenticación y ownership de la cadena usuario → tarea → imagen.

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/tasks/:id/images` | Sí | Sube multipart en el campo `file`. |
| `GET` | `/api/tasks/:id/images` | Sí | Lista metadata de imágenes propias. |
| `DELETE` | `/api/tasks/:id/images/:imageId` | Sí | Elimina metadata y archivo físico. |
| `GET` | `/api/tasks/:id/images/:imageId/file` | Sí | Sirve el archivo después de validar ownership. |

MIME permitido: `image/jpeg`, `image/png`, `image/webp`. Tamaño máximo: 10 MB.

### Audios

Todas las rutas requieren autenticación y ownership de la cadena usuario → tarea → audio.

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/tasks/:id/audios` | Sí | Sube multipart en `file` y recibe `duration`. |
| `GET` | `/api/tasks/:id/audios` | Sí | Lista metadata de audios propios. |
| `DELETE` | `/api/tasks/:id/audios/:audioId` | Sí | Elimina metadata y archivo físico. |
| `GET` | `/api/tasks/:id/audios/:audioId/file` | Sí | Sirve el archivo después de validar ownership. |

MIME permitido: `audio/mp4`, `audio/mpeg`, `audio/aac`, `audio/wav`, `audio/x-m4a`. Tamaño máximo: 10 MB. La duración aceptada está entre `0` y `3600`.

### Respuestas y códigos HTTP

La API usa respuestas JSON de error con esta forma:

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found."
  }
}
```

Códigos observables en las rutas actuales:

- `200`: lecturas, login y actualizaciones.
- `201`: registro y creación de tareas/adjuntos.
- `204`: logout, eliminaciones.
- `400`: validación de body, params, IDs, coordenadas o duración.
- `401`: token ausente, inválido, expirado o credenciales incorrectas.
- `404`: recurso o ruta inexistente; una tarea de otro usuario se comporta como inexistente.
- `409`: email duplicado.
- `500`: errores no normalizados del servidor, incluidos algunos errores de upload de Multer.
- `403` y `422` no se utilizan actualmente: ownership se responde como `404` y validación como `400`, según contrato implementado.

## Autenticación, autorización y seguridad

- `bcryptjs` genera el `passwordHash`; nunca se almacena la contraseña en texto plano.
- `passwordHash` se excluye de las respuestas HTTP mediante el usuario público.
- JWT se firma y verifica con `JWT_SECRET` y expiración configurada.
- `requireAuth` exige el esquema `Bearer`.
- El cliente guarda el JWT exclusivamente con `expo-secure-store`, no con AsyncStorage.
- Las tareas se consultan, actualizan y eliminan filtrando por `userId` del JWT.
- Los adjuntos validan ownership mediante su tarea propietaria.
- IDs y payloads se validan con Zod.
- Imágenes y audios se reciben en memoria con límite de 10 MB.
- MIME permitido se restringe explícitamente.
- Los nombres físicos incluyen UUID y sanitización del nombre original.
- El servicio de archivos rechaza rutas absolutas y segmentos `..` al resolver archivos.
- Los archivos no se publican mediante `express.static`.
- Los secretos se configuran por variables de entorno y no deben subirse al repositorio.

## Periféricos y permisos

### Cámara

`takePhoto()` solicita permiso de cámara solo cuando el usuario pulsa una acción de fotografía. Si el permiso se deniega, la acción muestra un error y la pantalla continúa disponible. Una captura no cancelada produce una preview local y puede subirse asociada a una tarea.

### GPS

`getCurrentLocation()` solicita permiso foreground bajo demanda y obtiene la posición actual con precisión alta solicitada. La tarea puede conservar:

- `latitude` entre `-90` y `90`.
- `longitude` entre `-180` y `180`.
- `accuracy` finita, no negativa y dentro del límite backend.
- `timestamp` válido.

La aplicación rechaza ubicaciones con precisión superior a `100` metros y permite reintentar. No existe tracking en segundo plano.
### Micrófono y audio

La pantalla de detalle solicita permiso de grabación al iniciar una nota de voz. Permite iniciar, detener, mostrar duración, subir el archivo, listar metadata, reproducir mediante el reproductor configurado y eliminar la metadata. La reproducción persistida protegida y el cleanup fueron validados en Android.

## Testing

Ejecutar la suite backend desde la raíz:

```bash
npm test
```

El comando real ejecuta `jest --runInBand` en el workspace `backend`.

Comprobaciones estáticas:

```bash
npm run typecheck
npm run lint
```

Colección Postman versionada:

```text
postman/task-manager.postman_collection.json
```

Resultado de la auditoría final:

```text
Test Suites: 7 passed, 7 total
Tests:       61 passed, 61 total
Failures:    0
Warnings:    0 relevantes
TypeScript mobile/backend: aprobado
ESLint: aprobado
Prisma schema/migrations: aprobado
Android debug build: aprobado
Physical Android validation: aprobada
```

- autenticación: registro, validación, duplicado, login, JWT ausente/inválido/manipulado;
- autorización y ownership de tareas y adjuntos;
- CRUD de tareas, IDs inexistentes y payloads inválidos;
- upload/listado/eliminación de imágenes y audios;
- MIME inválido, tamaño máximo y duración de audio;
- validación de latitude, longitude, accuracy y timestamp;
- permisos, proveedor GPS, error de obtención y precisión insuficiente mediante mocks;
- persistencia de preferencias AsyncStorage y fallback ante error de storage;
- health check y rutas desconocidas.

Los tests no cubren completamente:

- hardware físico real dentro de Jest;
- persistencia real de archivos en disco, porque los tests de adjuntos mockean Prisma.

## Verificación manual Android

La verificación manual debe ejecutarse en un Development Build generado con `npm run android` y cubrir:

1. Registro, login, recuperación de sesión y logout.
2. CRUD de tareas con un usuario autenticado.
3. Acceso rechazado a tareas de otro usuario.
4. Cámara con permiso concedido, cancelación y permiso denegado.
5. GPS con permiso concedido, denegado y ubicación no disponible.
6. Audio con permiso concedido, grabación, detención, cancelación y error.
7. Upload y eliminación de imágenes y audios.
8. Reapertura de una tarea y comportamiento de sus adjuntos persistidos.
9. Funcionamiento con backend accesible desde el dispositivo mediante la URL configurada.

## Limitaciones actuales

- La validación física Android fue completada; los tests automatizados mantienen mocks para APIs nativas y Prisma.
- El MIME recibido desde multipart es declarado por el cliente; no existe inspección magic-byte del contenido real.
- El filtro MIME de Multer y algunos errores de upload se normalizan como errores de upload `400` genéricos.
- Las URLs de archivos son protegidas y relativas; la UI conserva metadata de adjuntos y utiliza reproducción autenticada de audio, pero no renderiza todas las imágenes persistidas como preview remoto.
- La UI móvil cubre retry manual, filtros persistentes, confirmaciones destructivas y bloqueo de operaciones duplicadas.
- El almacenamiento local bajo `uploads/` es adecuado para desarrollo académico, no para alta disponibilidad ni despliegue distribuido.
- Al eliminar una tarea, la cascada de Prisma elimina metadata de imágenes y audios y el servicio intenta eliminar sus archivos físicos; fallos de limpieza física se manejan best-effort.
- `mobile/android/` convive con configuración nativa en `mobile/app.json`. Expo Doctor puede mostrar un warning sobre este workflow híbrido; no es por sí mismo un error fatal, pero los cambios futuros pueden requerir sincronización o regeneración controlada.
- El logout no revoca tokens en servidor; elimina el token del dispositivo y la API no mantiene una blacklist.

## Próximas mejoras

Estas mejoras quedan fuera del alcance de esta entrega:

- Inspección de contenido por magic bytes.
- Almacenamiento de objetos para un entorno de producción.
- Vista dedicada de tareas cercanas/mapa.


## Cumplimiento de la rúbrica

### Indicador 1 — Periféricos
- **Funcionalidad:** cámara para evidencia, GPS asociado y notas de voz.
- **Implementación:** Expo Image Picker, Expo Location y Expo Audio; metadata en API/Prisma.
- **Pruebas:** Jest/Supertest para adjuntos y GPS; validación física Android para cámara, GPS y audio.
- **Evidencia:** 61 tests aprobados, Android smoke test aprobado.

### Indicador 2 — Permisos
- **Funcionalidad:** permisos contextuales de cámara, ubicación y micrófono.
- **Implementación:** solicitud bajo demanda y continuidad de la app ante denegación.
- **Pruebas:** mocks de permisos y validación física Android.
- **Evidencia:** `peripherals.test.ts` y validación física aprobada.

### Indicador 3 — Pruebas de periféricos
- **Funcionalidad:** casos de éxito, denegación, cancelación, error, accuracy y cleanup.
- **Implementación:** servicios nativos aislados y cleanup en ciclo de vida.
- **Pruebas:** Jest para GPS/micrófono y pruebas manuales Android para hardware.
- **Evidencia:** suite 7/7, 61/61 y checklist físico aprobado.

### Indicador 4 — Servicios web y APIs
- **Funcionalidad:** auth, CRUD, ownership, imágenes, audios y ubicación.
- **Implementación:** Express, JWT, bcryptjs, Zod, Prisma y PostgreSQL.
- **Pruebas:** Supertest, validación de schemas y migraciones Prisma al día.
- **Evidencia:** API tests aprobados; PostgreSQL conectado; `prisma validate` correcto.

### Indicador 5 — Pruebas de APIs
- **Funcionalidad:** respuestas 2xx/4xx, validación, JWT inválido, recursos inexistentes y ownership.
- **Implementación:** Jest + Supertest y colección Postman versionada en `postman/task-manager.postman_collection.json`.
- **Pruebas:** auth, tasks, attachments, GPS, audio, errores y seguridad.
- **Evidencia:** 7 suites, 61 tests; colección versionada sin secretos; Newman ejecutó 16 requests Auth/Tasks sin fallos de transporte.

## Licencia y uso académico

Proyecto desarrollado con fines académicos para la asignatura de Desarrollo de Aplicaciones Móviles. No contiene credenciales reales en la documentación; cada entorno debe usar sus propios valores de PostgreSQL y `JWT_SECRET`.
