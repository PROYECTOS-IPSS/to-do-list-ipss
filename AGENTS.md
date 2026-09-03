# AGENTS.md — Task Manager Mobile

## Contexto del proyecto

Task Manager Mobile es una aplicación académica de gestión de tareas.

Permite:

- registro, login, logout y sesión persistente;
- CRUD de tareas;
- completar y reabrir tareas;
- fotografías asociadas;
- ubicación GPS asociada;
- notas de voz, preview y reproducción;
- filtros locales no sensibles;
- validación, loading, error, retry, empty y feedback visual.

## Arquitectura actual

```text
mobile/ React Native + Expo + Expo Router + TypeScript
                  │ HTTP + Bearer JWT
                  ▼
backend/ Express + TypeScript + Zod
                  │ Prisma
                  ▼
PostgreSQL
```

Mobile y backend son workspaces npm del monorepo raíz. No mezclar responsabilidades entre ambos.

## Stack actual

### Mobile

- React Native `0.86.3`.
- Expo `~57.0.17`.
- Expo Router `~57.0.18`.
- React `19.2.3`.
- TypeScript `~6.0.3`.
- NativeWind `4.2.6`.
- TailwindCSS `^3.4.17`.
- `react-native-css-interop` `0.2.6`.
- `react-native-reanimated` `4.5.1`.
- `react-native-worklets` `0.10.1`.
- `react-native-safe-area-context` `~5.7.0`.
- `@react-native-async-storage/async-storage` `^2.2.0`.
- `react-native-screens` `~4.26.0`.
- `expo-secure-store` `~57.0.3`.
- `expo-image-picker` `~57.0.15`.
- `expo-camera` `~57.0.4`.
- `expo-location` `~57.0.15`.
- `expo-audio` `~57.0.4`.
- `expo-file-system` `~57.0.6`.
- `expo-asset` `~57.0.16`.
- `expo-dev-client` `~57.0.18`.
- `expo-status-bar` `~57.0.1`.
- `expo-system-ui` `~57.0.3`.
- Zod `^4.4.3`.
- Jest `~29.7.0` y ts-jest `^29.4.12` para tests móviles.

### Backend

- Express `^5.1.0`.
- TypeScript `^5.9.2`.
- Prisma/@prisma-client `^6.14.0`.
- PostgreSQL.
- Zod `^4.0.17`.
- bcryptjs `^3.0.3`.
- jsonwebtoken `^9.0.3`.
- Multer `^2.2.0`.
- Jest `^30.0.5`.
- Supertest `^7.1.4`.
- Nodemon, tsx y ts-jest.

## Estructura importante

```text
mobile/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── auth/login.tsx
│   ├── auth/register.tsx
│   └── tasks/[id].tsx
├── src/
│   ├── auth/AuthProvider.tsx
│   ├── services/
│   └── ui/
├── android/
├── app.json
├── eas.json
├── babel.config.js
├── expo-env.d.ts
├── global.css
├── jest.config.cjs
├── metro.config.js
├── nativewind-env.d.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json

backend/
├── prisma/schema.prisma
├── prisma/migrations/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── types/
│   └── utils/
├── tests/
├── uploads/
└── package.json

postman/task-manager.postman_collection.json
```

## Mobile UI rules

- NativeWind/TailwindCSS es sistema principal de estilos.
- Reutilizar `mobile/src/ui/tokens.json` y componentes existentes.
- Componentes UI actuales incluyen `AppLogo`, `AppImage`, `AppHeader`, `AppBadge`, `AppFeedback`, `AppConfirmModal`, `AppText`, `AppButton`, `AppInput`, `Screen`, `AuthScreen`, `Card`, `TaskCard` y `StateMessage`.
- Usar `className` y tokens.
- Evitar `StyleSheet.create` y `style={{}}`; solo permitirlos por limitación técnica documentada.
- Respetar Safe Area mediante `SafeAreaProvider` root y `SafeAreaView` de `react-native-safe-area-context` en `Screen`.
- Mantener Status Bar coherente con tokens.
- Mantener textos visibles en español.
- Mantener loading, success, error, empty, retry y disabled.
- Mantener labels, roles, feedback y touch targets accesibles.
- No duplicar cards, botones, badges, modales ni feedback.
- No introducir otro sistema de estilos o librería UI.

## Reglas de desarrollo

- TypeScript estricto.
- No usar `any` para ocultar errores.
- No usar `@ts-ignore`, `@ts-nocheck` ni casts arbitrarios para silenciar errores.
- No dejar logs de diagnóstico temporales.
- No crear funcionalidades fuera de la solicitud.
- Reutilizar servicios y componentes existentes.
- Cambiar el mínimo número de archivos.
- No eliminar funcionalidades existentes.
- Validar errores y estados de operaciones.
- No almacenar secretos en código ni documentación.
- Ejecutar formatter/lint/tests al final, no durante cada edición salvo que se esté diagnosticando un error.

## Autenticación y almacenamiento

- JWT se guarda únicamente en `expo-secure-store`.
- AsyncStorage se usa solamente para preferencias no sensibles, actualmente filtro de tareas.
- Nunca guardar password, JWT, refresh token, secreto o credencial en AsyncStorage.
- `AuthProvider` recupera token, valida `/api/auth/me` y limpia tokens inválidos.
- No cambiar contratos de auth ni endpoints sin solicitud explícita.

## Backend y API

No modificar backend durante una tarea exclusivamente mobile/UI.

Respetar:

- Express routes/controllers/services.
- Prisma y PostgreSQL.
- Zod en límites de confianza.
- `userId` derivado del JWT.
- Ownership usuario → tarea → attachment.
- Respuestas y códigos HTTP actuales.
- Archivos privados servidos solo por endpoints autenticados.

Endpoints actuales:

```text
GET  /health
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/tasks
GET  /api/tasks
GET  /api/tasks/:id
PATCH /api/tasks/:id
DELETE /api/tasks/:id
POST/GET/DELETE /api/tasks/:id/images
GET /api/tasks/:id/images/:imageId/file
POST/GET/DELETE /api/tasks/:id/audios
GET /api/tasks/:id/audios/:audioId/file
```

No agregar endpoints desde mobile.

## Multimedia

- Cámara se solicita bajo demanda para fotografías.
- Imágenes se almacenan físicamente en `backend/uploads/images/` durante desarrollo y su metadata en Prisma.
- Mobile usa URLs protegidas de imagen con header Bearer.
- Audio se graba con expo-audio, se previsualiza, se sube y se reproduce con URL protegida.
- GPS es foreground, opcional y valida accuracy/timestamp.
- Liberar recorder, player, previews y recursos nativos al desmontar o cancelar.
- No implementar background recording, tracking GPS, mapas, streaming, transcripción ni waveform.

## Variables de entorno

Backend `.env` usa:

- `PORT`;
- `DATABASE_URL`;
- `JWT_SECRET`;
- `UPLOAD_DIR` opcional.

Mobile `.env` usa:

- `EXPO_PUBLIC_API_URL`.

`.env` está ignorado por Git. `*.example` contiene únicamente valores seguros de ejemplo.

## Testing obligatorio

Desde la raíz:

```bash
npm test
npm run test:backend
npm run test:mobile
npm run typecheck
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

La suite de backend usa Jest + Supertest (7 suites, 61 tests) y cubre auth, ownership, CRUD, validación, attachments, GPS, audio y preferencias. Mobile tiene `mobile/jest.config.cjs` y tests de esquemas en `mobile/src/services/__tests__/`. Hardware real requiere Development Build Android.

## Deployment

No hay proveedor de producción configurado en repositorio.

Backend reproducible en infraestructura externa:

```bash
npm ci
npm run prisma:generate
npm --workspace backend exec prisma migrate deploy
npm --workspace backend start
```

Mobile local:

```bash
npm run android --workspace mobile
```

`mobile/eas.json` contiene únicamente perfil `development` con `developmentClient: true` y `distribution: internal`.

EAS Development Build:

```bash
npx eas-cli login
npx eas-cli build --profile development --platform android
```

No documentar perfil production porque no está configurado.

## Prohibiciones

No implementar:

- cambios de backend para resolver problemas visuales;
- JWT en AsyncStorage;
- secretos en código o documentación;
- `any`, `@ts-ignore` o `@ts-nocheck` para ocultar errores;
- APIs nuevas no solicitadas;
- cambios de esquema o migraciones sin autorización;
- offline-first, queues o conflict resolution;
- background location/recording;
- otra etapa automáticamente al terminar una tarea.
