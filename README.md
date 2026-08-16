# Task Manager Mobile

Aplicación móvil académica para gestionar tareas con autenticación, fotografías, ubicación GPS y notas de voz.

Repositorio monorepo npm:

- `mobile/`: React Native + Expo + Expo Router + TypeScript.
- `backend/`: API REST Express + TypeScript.
- PostgreSQL: persistencia relacional mediante Prisma.
- `postman/`: colección de pruebas manuales de la API.

## Funcionalidades actuales

- Registro e inicio de sesión.
- JWT con sesión persistente.
- JWT almacenado exclusivamente en `expo-secure-store`.
- CRUD de tareas.
- Completar y reabrir tareas.
- Eliminación con confirmación visual propia.
- Filtros `Todas`, `Pendientes` y `Completadas` persistidos en AsyncStorage.
- Estados de carga, error, retry, éxito y vacío.
- Feedback visual para operaciones importantes.
- Cámara contextual para fotografías de tareas.
- Imágenes asociadas con previews locales y previews protegidas desde API.
- GPS contextual con latitude, longitude, accuracy y timestamp.
- Notas de voz con grabación, preview, reproducción, duración y eliminación.
- Archivos de imágenes y audios protegidos mediante Bearer JWT.
- UI en español.
- Design System dark basado en NativeWind/TailwindCSS.
- Safe Area y Status Bar configuradas para Android.
- Modales visuales para confirmaciones destructivas.

## Arquitectura

```text
React Native + Expo
        │
        │ Bearer JWT / HTTP
        ▼
Express API REST
        │
        │ Prisma
        ▼
PostgreSQL
```

### Mobile

Expo Router monta las pantallas. `AuthProvider` recupera la sesión desde SecureStore y protege el acceso funcional a Home.

La UI se separa en:

- `mobile/app/`: pantallas y navegación.
- `mobile/src/auth/`: estado de sesión.
- `mobile/src/services/`: API y capacidades nativas.
- `mobile/src/ui/`: tokens, componentes y composición visual.

### Backend

El backend separa:

- routes;
- middleware de auth y validación;
- controllers;
- services;
- schemas Zod;
- Prisma;
- almacenamiento local de archivos.

Cada tarea y attachment se consulta usando el `userId` extraído del JWT. El cliente nunca controla ownership enviando un `userId` propio.

## Almacenamiento

| Dato | Ubicación |
|---|---|
| JWT | `expo-secure-store` |
| Preferencias de UI/filtro | AsyncStorage |
| Usuarios | PostgreSQL vía Prisma |
| Tareas | PostgreSQL vía Prisma |
| Ubicación de tarea | PostgreSQL vía Prisma |
| Metadata de imágenes | PostgreSQL vía Prisma |
| Metadata de audios | PostgreSQL vía Prisma |
| Archivo de imagen | `backend/uploads/images/` en desarrollo |
| Archivo de audio | `backend/uploads/audios/` en desarrollo |

Los archivos privados no se exponen mediante `express.static`. Se sirven mediante endpoints autenticados que validan ownership.

## Stack real

### Mobile

Versiones declaradas en `mobile/package.json`:

- React Native `0.81.5`.
- Expo `~54.0.0`.
- Expo Router `~6.0.0`.
- React `19.1.0`.
- TypeScript `~5.9.2`.
- NativeWind `^4.1.23`.
- TailwindCSS `^3.4.17`.
- `react-native-css-interop` `^0.1.22`.
- `react-native-reanimated` `^3.19.4`.
- `react-native-safe-area-context` `~5.6.0`.
- `@react-native-async-storage/async-storage` `^2.2.0`.
- `react-native-screens` `~4.16.0`.
- `expo-secure-store` `~15.0.8`.
- `expo-image-picker` `~17.0.11`.
- `expo-camera` `~17.0.10`.
- `expo-location` `~19.0.8`.
- `expo-audio` `~1.1.1`.
- `expo-file-system` `~19.0.23`.
- `expo-asset` `~12.0.13`.
- `expo-dev-client` `~6.0.0`.
- `expo-status-bar` `~3.0.0`.
- Zod `^4.4.3`.
- Jest `^30.4.2` y ts-jest `^29.4.12` para tests móviles.

### Backend

Versiones declaradas en `backend/package.json`:

- Express `^5.1.0`.
- TypeScript `^5.9.2`.
- Prisma y `@prisma/client` `^6.14.0`.
- PostgreSQL.
- Zod `^4.0.17`.
- bcryptjs `^3.0.3`.
- jsonwebtoken `^9.0.3`.
- Multer `^2.2.0`.
- Jest `^30.0.5`.
- Supertest `^7.1.4`.
- Nodemon, tsx y ts-jest.

## Estructura actual

```text
.
├── mobile/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   └── tasks/
│   │       └── [id].tsx
│   ├── src/
│   │   ├── auth/
│   │   ├── services/
│   │   └── ui/
│   ├── android/
│   ├── app.json
│   ├── babel.config.js
│   ├── global.css
│   ├── metro.config.js
│   ├── nativewind-env.d.ts
│   ├── tailwind.config.js
│   ├── eas.json
│   └── package.json
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── tests/
│   ├── uploads/
│   ├── .env.example
│   └── package.json
├── postman/
│   └── task-manager.postman_collection.json
├── AGENTS.md
├── ARQUITECTURA.md
├── package.json
└── README.md
```

## Requisitos

- Node.js y npm.
- PostgreSQL accesible.
- Android SDK para `expo run:android`.
- Emulador o dispositivo Android para validación física.
- Cuenta EAS únicamente si se requiere construir en EAS.

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO>
cd to-do-list
npm install
```

Los workspaces raíz son `mobile` y `backend`.

## Variables de entorno

### Backend: `backend/.env`

Copiar `backend/.env.example`:

```env
PORT=3000
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/task_manager
JWT_SECRET=reemplazar-por-un-secreto-local-largo
```

- `PORT`: puerto HTTP; por defecto `3000`.
- `DATABASE_URL`: conexión PostgreSQL requerida por Prisma.
- `JWT_SECRET`: secreto local para firmar/verificar JWT.
- `UPLOAD_DIR`: variable opcional consumida por el servicio de archivos; si no se define, usa `uploads`. No está incluida en la plantilla actual.

### Mobile: `mobile/.env`

Copiar `mobile/.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

En un dispositivo Android físico, usar la IP LAN del equipo donde corre el backend, por ejemplo `http://192.168.x.x:3000`.

Los archivos `.env` están ignorados por Git. Las plantillas no contienen secretos reales.

## PostgreSQL y Prisma

Crear la base PostgreSQL indicada por `DATABASE_URL` y ejecutar desde la raíz:

```bash
npm run prisma:generate
npm run prisma:migrate
```

Comprobar el estado desde el workspace backend:

```bash
npm --workspace backend exec prisma validate
npm --workspace backend exec prisma migrate status
```

El esquema actual contiene:

- `User`;
- `Task`;
- `TaskImage`;
- `TaskAudio`.

Las relaciones usan ownership por usuario y borrado en cascada de metadata. La eliminación física de archivos se intenta desde el servicio de almacenamiento.

No existe seed configurado.

## Ejecución local

### Backend

Desde la raíz:

```bash
npm run backend
```

Equivalentes definidos:

```bash
npm run backend:start
npm --workspace backend run dev
npm --workspace backend start
```

Health check:

```text
GET http://localhost:3000/health
```

### Mobile y Metro

Desde la raíz:

```bash
npm run mobile
npm run mobile:dev-client
```

Desde `mobile/`:

```bash
npm start
npm run start:dev-client
```

### Development Build Android

```bash
npm run android --workspace mobile
```

También puede ejecutarse desde `mobile/`:

```bash
npm run android
```

Usar Development Build porque la aplicación utiliza módulos nativos como SecureStore, cámara, ubicación y audio.

## API REST actual

### Auth

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Tasks

```text
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

### Images

```text
POST   /api/tasks/:id/images
GET    /api/tasks/:id/images
DELETE /api/tasks/:id/images/:imageId
GET    /api/tasks/:id/images/:imageId/file
```

### Audio

```text
POST   /api/tasks/:id/audios
GET    /api/tasks/:id/audios
DELETE /api/tasks/:id/audios/:audioId
GET    /api/tasks/:id/audios/:audioId/file
```

Las rutas privadas requieren `Authorization: Bearer <token>`. Ownership se valida con el JWT.

Códigos utilizados por el contrato actual:

- `200`: lecturas, login y actualizaciones.
- `201`: registro y creación.
- `204`: logout y eliminaciones.
- `400`: payload, parámetros, coordenadas, archivos o duración inválidos.
- `401`: sesión ausente/inválida o credenciales incorrectas.
- `404`: ruta, tarea o attachment inexistente; recursos de otro usuario no se revelan.
- `409`: email duplicado.
- `500`: error interno.

`403` y `422` no son utilizados por el contrato actual.

## Design System y UI

NativeWind/TailwindCSS es el sistema de estilos principal.

Configuración:

- `mobile/tailwind.config.js`.
- `mobile/metro.config.js`.
- `mobile/global.css`.
- `mobile/src/ui/tokens.json`.
- `mobile/src/ui/tokens.ts`.

Componentes compartidos:

- `AppLogo`;
- `AppHeader`;
- `AppText`;
- `AppButton`;
- `AppInput`;
- `AppImage`;
- `AppBadge`;
- `AppFeedback`;
- `AppConfirmModal`;
- `Screen`;
- `AuthScreen`;
- `Card`;
- `TaskCard`;
- `StateMessage`.

La UI actual utiliza identidad dark, safe area, status bar coherente, textos en español, estados de carga/error/vacío y modales visuales para acciones destructivas.

## Testing

Suite backend/API:

```bash
npm test
```

El comando ejecuta `jest --runInBand` en `backend/`.

Comprobaciones TypeScript:

```bash
npm run typecheck
```

Comprueba mobile y backend.

Lint:

```bash
npm run lint
```

Prisma:

```bash
npm run prisma:generate
npm --workspace backend exec prisma validate
npm --workspace backend exec prisma migrate status
```

Android:

```bash
npm run android --workspace mobile
```

Resultado comprobado de la suite actual: 7 suites y 61 tests aprobados.

## Postman

Colección:

```text
postman/task-manager.postman_collection.json
```

Grupos incluidos:

- Auth;
- Tasks;
- Images;
- Audio.

Variables de colección:

- `baseUrl`;
- `token`;
- `taskId`;
- `otherTaskId`;
- `imageId`;
- `audioId`.

Importar la colección en Postman y configurar las variables del entorno local. Las solicitudes multipart de imágenes y audio requieren seleccionar manualmente archivos locales en Postman. No se guardan tokens ni secretos en el repositorio.

Si Newman está instalado, puede ejecutarse:

```bash
newman run postman/task-manager.postman_collection.json --env-var baseUrl=http://127.0.0.1:3000
```

## Seguridad

- Contraseñas hasheadas con bcryptjs en backend.
- PasswordHash nunca se devuelve al cliente.
- JWT firmado con `JWT_SECRET` y almacenado únicamente en SecureStore en mobile.
- AsyncStorage reservado para preferencias no sensibles.
- Zod valida cuerpos, parámetros y queries.
- Ownership se obtiene exclusivamente del JWT.
- Endpoints privados requieren Bearer JWT.
- Archivos privados no se sirven mediante `express.static`.
- MIME y tamaño de uploads tienen límites.
- Duración de audio limitada a 3.600 segundos.
- `.env` y uploads locales están ignorados por Git.
- Errores de producción no exponen stack traces.

## Deployment

### Backend

Actualmente no existe proveedor ni infraestructura de producción configurada en el repositorio.

Procedimiento reproducible para un entorno que proporcione Node.js y PostgreSQL:

```bash
npm install
npm run prisma:generate
npm --workspace backend exec prisma migrate status
npm --workspace backend exec prisma migrate deploy
npm --workspace backend start
```

Configurar en el entorno de deployment:

- `PORT`;
- `DATABASE_URL`;
- `JWT_SECRET`;
- `UPLOAD_DIR`.

El almacenamiento local `uploads/` es apropiado para desarrollo académico. Producción requiere almacenamiento persistente/objetos externo, que no está configurado aquí.

### Mobile Android

Configuración comprobada:

- package: `com.taskmanager.mobile`;
- owner EAS: `wuanpack`;
- projectId EAS presente en `mobile/app.json`;
- `mobile/eas.json` define únicamente `development`;
- `developmentClient: true`;
- `distribution: internal`.

Development Build local:

```bash
npm run android --workspace mobile
```

EAS Development Build, usando el perfil existente:

```bash
npx eas-cli login
npx eas-cli build --profile development --platform android
```

No existe perfil `production` en `mobile/eas.json`; no se documenta un comando de producción inexistente.

## Actualizar el proyecto

1. Actualizar el código.
2. Ejecutar `npm install`.
3. Revisar cambios de dependencias.
4. Ejecutar `npm run prisma:generate` si cambió Prisma o se reinstalaron dependencias.
5. Ejecutar migraciones solo si existen migraciones pendientes.
6. Ejecutar `npm test`.
7. Ejecutar `npm run typecheck`.
8. Ejecutar `npm run lint`.
9. Ejecutar el Android debug build.
10. Probar la aplicación en Development Build.

Cambios JS/TS/UI normalmente requieren Metro o recarga del Development Build existente. Cambios de dependencias nativas, permisos, Expo plugins o configuración Android requieren reconstruir Development Build con `npm run android --workspace mobile` o el perfil EAS `development`.

## Limitaciones conocidas

- `uploads/` local es almacenamiento de desarrollo académico.
- El MIME multipart es declarado por el cliente; no hay inspección magic-byte.
- Los tests de attachments mockean Prisma y no sustituyen una prueba completa de disco.
- Logout backend es stateless; el servidor no mantiene blacklist de JWT.
- Home obtiene metadata de imágenes por tarea usando servicios existentes; un backend futuro podría incluir previews resumidas en la lista para evitar N+1.
- No existe sincronización offline, queue de requests ni resolución de conflictos.
- No existe tracking GPS en background ni grabación de audio en background.

## Cumplimiento de la rúbrica

- Periféricos: cámara para imágenes, GPS asociado y audio asociado a tareas.
- Permisos: solicitudes contextuales de cámara, ubicación y micrófono.
- Tests de periféricos: mocks de GPS/audio y validación Android.
- API: Express, JWT, Zod, Prisma, PostgreSQL, CRUD y attachments.
- Tests API: Jest, Supertest, validación, ownership, JWT y uploads.

## Licencia y uso académico

Proyecto académico para Desarrollo de Aplicaciones Móviles. No contiene secretos reales en documentación; cada entorno debe usar sus propias credenciales locales.
