# Task Manager

Aplicación académica móvil de gestión de tareas. Integra autenticación, autorización por usuario, CRUD de tareas, cámara, GPS, notas de voz y almacenamiento local de adjuntos.

## Estado del proyecto

- ETAPA1: completada.
- ETAPA2: aprobada.
- ETAPA3: implementada y verificada automáticamente.
- ETAPA4: implementación en curso de validación manual Android.
- ETAPA5: no iniciada.

La suite actual contiene **5 suites y 29 tests**, todos pasando en la última verificación disponible. Los tests de adjuntos usan mocks de Prisma; no sustituyen una prueba completa de almacenamiento físico ni la prueba manual en hardware.

## Características

### Autenticación

- Registro con email único.
- Login con bcrypt y JWT.
- Sesión persistente mediante `expo-secure-store`.
- Recuperación mediante `/api/auth/me`.
- Logout y eliminación del token.
- Rutas de tareas protegidas.
- Aislamiento de datos por usuario.

### Tareas

- Crear, listar, consultar y editar tareas.
- Completar/descompletar.
- Eliminar tareas.
- Ubicación opcional con latitude, longitude, accuracy y timestamp.

### Periféricos y adjuntos

- Cámara mediante `expo-image-picker`.
- Ubicación foreground mediante `expo-location`.
- Grabación/reproducción mediante `expo-audio`.
- Imágenes y audios almacenados en disco local.
- Metadata almacenada en PostgreSQL mediante Prisma.
- Ownership validado mediante JWT → usuario → tarea → adjunto.
- La pantalla de detalle carga metadata de imágenes y audios y permite eliminarlos.
- La captura de imagen y grabación de audio están conectadas al flujo de tareas.

La visualización persistente todavía es parcial: la pantalla muestra preview local de la foto recién capturada y nombres de adjuntos cargados; no transforma automáticamente las URLs protegidas en una fuente autenticada para mostrar todas las imágenes persistidas ni para reproducir todos los audios tras reabrir la tarea.

La integración de periféricos requiere validación física en un Development Build Android. El código y el bundle están preparados, pero esta documentación no sustituye esa prueba.

## Arquitectura

```text
React Native + Expo + Expo Router
              │
              │ HTTP/HTTPS + Bearer JWT
              ▼
Express + TypeScript + Zod
              │
              ▼
Prisma ORM
              │
              ▼
PostgreSQL

Archivos físicos: almacenamiento local
PostgreSQL: metadata y relaciones
```

Flujo backend:

```text
route → controller → service → Prisma → PostgreSQL
```

La lógica de negocio no se coloca en las rutas.

## Tecnologías

### Mobile

- React Native `0.81.5`.
- Expo SDK `54`.
- TypeScript `5.9`.
- Expo Router `6`.
- Expo Development Client.
- `expo-secure-store` `~15.0.8`.
- `expo-camera` `~17.0.10`.
- `expo-image-picker` `~17.0.11`.
- `expo-location` `~19.0.8`.
- `expo-audio` `~1.1.1`.

### Backend

- Express `5.1`.
- TypeScript `5.9`.
- Nodemon.
- Prisma `6`.
- PostgreSQL.
- Zod `4`.
- bcryptjs `3`.
- jsonwebtoken `9`.
- Multer `2`.
- Jest `30`.
- Supertest `7`.

## Estructura

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
│   └── tests/
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
│   ├── app.json
│   ├── eas.json
│   └── package.json
├── .env.example
├── package.json
├── package-lock.json
└── README.md
```

## Requisitos

- Node.js y npm.
- Yarn 1 disponible para el comando `yarn dev` del backend.
- PostgreSQL local o accesible.
- Android SDK para Development Build local.
- Android Emulator o dispositivo físico para pruebas de periféricos.

## Instalación

### 1. Instalar dependencias

Desde raíz:

```bash
npm install
```

El proyecto usa npm workspaces para `mobile/` y `backend/`. `yarn dev` se ejecuta dentro de `backend/` porque es el comando utilizado por el proyecto para iniciar Nodemon.

### 2. Configurar backend

Crear `backend/.env` a partir de `backend/.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/task_manager
JWT_SECRET=un-secreto-local-largo
```

No subir `backend/.env` al repositorio.

### 3. Configurar mobile

Crear `mobile/.env` a partir de `mobile/.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

En un dispositivo Android físico, `localhost` apunta al propio teléfono. Usar la IP LAN del equipo que ejecuta el backend, por ejemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

### 4. Generar Prisma Client

Desde raíz:

```bash
npm run prisma:generate
```

### 5. Aplicar/verificar migraciones

Desde raíz:

```bash
npm run prisma:migrate
```

`prisma:migrate` ejecuta `prisma migrate dev` en `backend/`.

## Ejecución

### Backend

```bash
cd backend
yarn dev
```

Alternativamente, desde raíz:

```bash
npm run backend
```

API por defecto:

```text
http://localhost:3000
```

Health check:

```bash
curl -i http://localhost:3000/health
```

### Mobile

Usar Development Build, no Expo Go como entorno principal:

```bash
npx expo start --dev-client
```

Desde raíz también existe:

```bash
npm run mobile:dev-client
```

Ejecutar Android localmente:

```bash
cd mobile
npx expo run:android
```

El paquete Android configurado es:

```text
com.taskmanager.mobile
```

El proyecto contiene `mobile/android/`, generado mediante Expo Prebuild. Expo Doctor puede mostrar un warning preventivo sobre carpetas nativas presentes junto con propiedades nativas en `app.json`. Ese warning refleja un workflow híbrido y posible sincronización futura; no implica por sí mismo que el bundle actual sea inválido.

## Variables de entorno

### Backend

| Variable | Uso |
|---|---|
| `PORT` | Puerto HTTP de Express. |
| `DATABASE_URL` | Conexión PostgreSQL usada por Prisma. |
| `JWT_SECRET` | Firma y validación de JWT. |

### Mobile

| Variable | Uso |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base de la API. |

Los archivos `.env` están ignorados por Git. Los archivos `.env.example` contienen placeholders y no deben incluir credenciales reales.

## Modelo de datos

### User

- `id`
- `name`
- `email` unique
- `passwordHash`
- `createdAt`
- `updatedAt`

### Task

- `id`
- `userId`
- `title`
- `description`
- `completed`
- `latitude`
- `longitude`
- `locationAccuracy`
- `locationTimestamp`
- `createdAt`
- `updatedAt`

### TaskImage

- `id`
- `taskId`
- `url`
- `filename`
- `mimeType`
- `size`
- `createdAt`

### TaskAudio

- `id`
- `taskId`
- `url`
- `duration`
- `mimeType`
- `size`
- `createdAt`

Relaciones:

```text
User 1 ─── N Task
Task 1 ─── N TaskImage
Task 1 ─── N TaskAudio
```

## API REST

Todas las respuestas de rutas privadas requieren:

```http
Authorization: Bearer <token>
```

### Health

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `GET` | `/health` | No | Comprobar disponibilidad de la API. |

### Auth

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/auth/register` | No | Crear usuario y devolver sesión inicial. |
| `POST` | `/api/auth/login` | No | Verificar credenciales y emitir JWT. |
| `GET` | `/api/auth/me` | Sí | Obtener usuario del JWT. |
| `POST` | `/api/auth/logout` | Sí | Cerrar sesión HTTP; el cliente elimina el token SecureStore. |

### Tasks

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/tasks` | Sí | Crear tarea propiedad del usuario autenticado. |
| `GET` | `/api/tasks` | Sí | Listar tareas propias. |
| `GET` | `/api/tasks/:id` | Sí | Consultar tarea propia. |
| `PATCH` | `/api/tasks/:id` | Sí | Editar tarea propia. |
| `DELETE` | `/api/tasks/:id` | Sí | Eliminar tarea propia. |

### Imágenes

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/tasks/:id/images` | Sí | Subir imagen multipart en campo `file`. |
| `GET` | `/api/tasks/:id/images` | Sí | Listar imágenes de una tarea propia. |
| `DELETE` | `/api/tasks/:id/images/:imageId` | Sí | Eliminar imagen propia. |
| `GET` | `/api/tasks/:id/images/:imageId/file` | Sí | Servir archivo tras validar ownership. |

### Audios

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `POST` | `/api/tasks/:id/audios` | Sí | Subir audio multipart en campo `file`. |
| `GET` | `/api/tasks/:id/audios` | Sí | Listar audios de una tarea propia. |
| `DELETE` | `/api/tasks/:id/audios/:audioId` | Sí | Eliminar audio propio. |
| `GET` | `/api/tasks/:id/audios/:audioId/file` | Sí | Servir archivo tras validar ownership. |

Códigos utilizados incluyen `200`, `201`, `204`, `400`, `401`, `404`, `409` y `500`.

## Autenticación y seguridad

- Contraseñas con bcryptjs; nunca se almacenan en texto plano.
- JWT firmado con `JWT_SECRET` de entorno y expiración configurada.
- `requireAuth` valida `Authorization: Bearer`.
- `userId` se obtiene del JWT, nunca del body.
- Las consultas de tasks incluyen ownership por `userId`.
- `passwordHash` no se devuelve por HTTP.
- JWT mobile almacenado únicamente mediante `expo-secure-store`.
- Zod valida cuerpos, parámetros, IDs y coordenadas.
- Adjuntos tienen límites de 10 MB.
- MIME permitido explícitamente.
- Nombres físicos usan UUID y sanitización.
- Se bloquean rutas de archivo con traversal.
- Los archivos no se sirven mediante `express.static` público.
- El acceso a archivos pasa por JWT y ownership.

## Periféricos y almacenamiento

### Cámara

`mobile/src/services/peripherals.ts` solicita permiso solo al ejecutar la acción de cámara y usa `expo-image-picker` para abrir la cámara. La UI ofrece captura y preview, y luego envía la imagen asociada a una tarea mediante `attachmentsApi`.

### GPS

`expo-location` solicita permiso foreground bajo demanda. La tarea puede conservar:

- latitude entre `-90` y `90`;
- longitude entre `-180` y `180`;
- accuracy válida;
- timestamp válido.

No se implementa tracking en segundo plano.

### Audio

`expo-audio` permite solicitar micrófono, grabar, detener, medir duración y reproducir notas desde la pantalla de detalle.

### Archivos

Los archivos físicos se guardan localmente bajo `uploads/` por defecto. PostgreSQL conserva únicamente URL y metadata. La estrategia puede sustituirse posteriormente por object storage sin cambiar los endpoints públicos.

## Testing

Ejecutar toda la suite:

```bash
npm test
```

Ejecutar comprobaciones estáticas:

```bash
npm run typecheck
npm run lint
```

Prisma:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Estado documentado de la última verificación:

```text
5 test suites passed
29 tests passed
0 failures
```

La cobertura incluye:

- registro, login y JWT;
- `/me`;
- autorización entre usuarios;
- CRUD autenticado;
- uploads de imagen y audio;
- MIME inválido;
- duración inválida;
- tareas inexistentes;
- acceso no autenticado;
- validación GPS.

Los tests de adjuntos utilizan mocks de Prisma. La persistencia física completa, permisos nativos y hardware real requieren pruebas manuales en Android.

## Verificación Android

El APK de Development Build debe probarse en dispositivo o emulador con:

- registro y login;
- recuperación de sesión;
- CRUD autenticado;
- cámara con permiso concedido y rechazado;
- GPS con permiso concedido y rechazado;
- audio con permiso concedido y rechazado;
- persistencia de adjuntos al cerrar/reabrir;
- eliminación de adjuntos;
- aislamiento entre dos usuarios.

El bundle Android se puede generar con:

```bash
cd mobile
npx expo export --platform android
```

`npx expo-doctor` debe ejecutarse desde `mobile/`. Su resultado puede incluir el warning del workflow híbrido descrito anteriormente.

## Limitaciones actuales

- Las pruebas físicas de cámara, GPS y audio dependen de un Development Build y hardware Android.
- Los tests de archivos no sustituyen validación completa del disco real.
- La validación MIME utiliza el MIME declarado por multipart; no equivale necesariamente a inspección magic-byte del contenido.
- El proyecto contiene `android/` generado y configuración nativa en `app.json`; cambios futuros pueden requerir regeneración controlada.
- `yarn dev` debe ejecutarse dentro de `backend/`; el workspace raíz usa scripts npm.
- El almacenamiento local no es object storage y está pensado para desarrollo académico.

## Estado y próximos pasos

ETAPA4 es la etapa actual. No se declara aprobada únicamente por compilación o tests: la aprobación requiere validación manual Android de los tres periféricos, permisos, persistencia, eliminación y ownership entre usuarios.

Próximas mejoras razonables, sin constituir una nueva etapa implementada:

- añadir inspección magic-byte para archivos;
- añadir tests de almacenamiento físico real;
- ampliar la UI con estados de carga y errores específicos por adjunto;
- documentar evidencia de pruebas Android;
- evaluar object storage para un entorno de producción.

No se documentan funcionalidades de ETAPA5 porque todavía no existe una especificación implementada en este repositorio.
