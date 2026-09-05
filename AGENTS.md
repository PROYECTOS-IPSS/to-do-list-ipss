# AGENTS.md — Task Manager Mobile

## Propósito

Reglas operativas para cambios humanos o asistidos en este monorepo académico. README explica uso; este archivo protege arquitectura, datos, seguridad y verificación.

## Fuente de verdad

Resolver contradicciones en este orden:

1. código vigente;
2. configuración vigente;
3. Prisma y Zod;
4. rutas, controladores y servicios backend;
5. scripts `package.json`;
6. Compose, Dockerfiles y scripts de setup;
7. pruebas automatizadas;
8. documentación reciente;
9. informes históricos.

No convertir intentos históricos, stashes o planes descartados en funcionalidad vigente.

## Monorepo

Yarn Classic `1.22.22`, workspaces `mobile` y `backend`. No usar npm ni pnpm. No editar `yarn.lock` salvo cambio deliberado de dependencias.

```text
mobile/             Expo Router, UI, capacidades nativas, SQLite y sync
backend/            API Express, Zod, JWT, ownership y archivos privados
backend/prisma/     Schema y migraciones PostgreSQL
scripts/            Setup raíz y orquestación Docker/Metro
postman/            Colección manual del contrato backend
docs/               Guías vigentes e informes históricos
docker-compose.yml  db, migrate y backend; Metro queda en host
```

No mezclar responsabilidades: problema visual mobile no se resuelve cambiando backend; contrato backend no se duplica en UI.

## Arquitectura vigente

```text
mobile: React Native 0.86.3 + Expo SDK 57 + Expo Router + TypeScript
         SQLite + SecureStore + filesystem local
                           │ HTTP / Bearer JWT
backend: Express 5 + Zod + Prisma
                           │
PostgreSQL + volumen privado de uploads
```

- SQLite es fuente local inmediata para tareas, metadata multimedia y cola durable.
- PostgreSQL es persistencia remota; no reemplazar SQLite.
- `localId` es identidad UI y key estable. `remoteId` puede ser nulo hasta sincronización.
- Tareas y fotografías usan operaciones durables e idempotentes.
- Conflictos de versión quedan visibles; no sobrescribir ni resolver silenciosamente.
- Sincronización corre manualmente o al volver a foreground con sesión remota; no agregar background sync.
- Audio móvil estable es local. No conectar upload/list/download remoto ni implementar B.2.2 accidentalmente.
- Backend conserva endpoints de audio y Postman puede probarlos independientemente.

## Comandos

Desde raíz:

```bash
yarn install --frozen-lockfile
yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000
yarn dev:docker
yarn status:docker
yarn logs:docker
yarn stop:docker
yarn rebuild:docker

yarn typecheck
yarn typecheck:tests
yarn lint
yarn test
yarn test:backend
yarn test:mobile
```

Prisma:

```bash
yarn workspace task-manager-backend prisma:generate
yarn workspace task-manager-backend exec prisma validate
yarn workspace task-manager-backend exec prisma migrate status
```

Android:

```bash
yarn workspace task-manager-mobile android
```

Referencia operativa de Development Build Android:

- guía canónica: `README.md`, sección **Generar e instalar el Development Build**;
- local: `yarn workspace task-manager-mobile android` para emulador; añadir `--device` para teléfono físico;
- reconstruir tras cambios de código/configuración nativa, dependencias nativas, plugins, permisos, Expo SDK/React Native, package o scheme;
- no reconstruir por JSX/TypeScript, estilos, textos o `EXPO_PUBLIC_API_URL`; recargar/reiniciar Metro;
- EAS CLI no es dependencia: usar `npx eas-cli@latest build --platform android --profile development` desde `mobile/`;
- no declarar Android/Gradle/EAS validado sin build, instalación y ejercicio reales.

No inventar scripts. Docker no se instala ni inicia con `yarn setup`; setup valida herramientas y prepara único `.env` raíz.

## Reglas de edición

- TypeScript estricto. No `any` para ocultar errores, `@ts-ignore`, `@ts-nocheck` ni casts arbitrarios.
- Reutilizar helpers, servicios y componentes existentes antes de crear otra convención.
- Cambiar mínimo número de archivos; no añadir abstracciones para necesidades futuras.
- No cambiar endpoints, respuestas, códigos HTTP, Prisma o migraciones sin solicitud explícita.
- No eliminar funcionalidades vigentes.
- No dejar logs diagnósticos temporales ni silenciar warnings globalmente.
- No usar índices como keys; usar `localId`, ID de attachment, `externalId` u otra identidad estable.
- Antes de eliminar metadata o archivo, confirmar alcance y estado seguro. Filesystem/DB no son transacción única.
- No tocar, aplicar, inspeccionar, renombrar ni eliminar stashes del usuario.
- No ejecutar commit ni push salvo solicitud explícita.

## UI y accesibilidad

- `mobile/src/ui/tokens.json` es fuente visual autoritativa; `tokens.ts` exporta y Tailwind consume.
- Preservar Mulberry Night. No añadir segundo tema o sistema de estilos.
- NativeWind/TailwindCSS es sistema principal; usar `className` y tokens.
- Reutilizar componentes compartidos de `mobile/src/ui/components.tsx`; no duplicar cards, botones, badges, feedback o modales.
- Evitar `StyleSheet.create` y `style={{}}`; aceptar solo limitación técnica concreta y documentada.
- Mantener Safe Area, Status Bar, textos visibles en español, loading, success, error, empty, retry y disabled.
- Mantener labels, roles, live regions, estados no dependientes solo de color y touch targets accesibles.
- `ExampleBox` es colección acotada con scroll interno y máximo actual de 200 registros. No convertirla en lista masiva sin rediseño medido.
- Spies de consola deben ser locales, validar mensaje esperado y restaurarse con `try/finally`; nunca apagar `console` globalmente.

## Auth y secretos

- JWT e identidad validada: solo `expo-secure-store`.
- AsyncStorage: preferencias no sensibles, actualmente filtro.
- SQLite: tareas y metadata por `ownerId`; nunca credenciales.
- No guardar password, JWT, refresh token o secreto en AsyncStorage, SQLite, URL, query, logs, fixtures o documentación.
- Bearer va solo en header `Authorization`.
- Solo `EXPO_PUBLIC_API_URL` puede llegar al bundle público.
- Entorno local usa únicamente `.env` raíz. No crear `mobile/.env` ni `backend/.env`.
- `userId` y ownership siempre derivan de JWT, nunca de body/query del cliente.

## Multimedia

- Cámara, ubicación y micrófono se solicitan bajo demanda; no background location/recording.
- Fotografías se copian a filesystem local antes de persistir metadata; sincronización conserva archivo hasta respuesta válida.
- Imágenes remotas se muestran/descargan con Bearer desde endpoints protegidos.
- No exponer `/uploads` con `express.static`, no usar URL interna como API y no poner token en query.
- Audio móvil: archivo + metadata local, preview, reproducción y eliminación. Sin cola ni sincronización remota.
- Liberar recorder, player, previews y recursos nativos al desmontar o cancelar.
- No implementar mapas, tracking, streaming, transcripción o waveform sin solicitud.

## Sync e identidad

- Mantener `localId` aunque exista `remoteId`; navegación/listas no cambian a ID remoto.
- `operationId` debe permanecer estable durante replay y actuar como `Idempotency-Key`.
- Mismo usuario + misma clave + mismo payload devuelve mismo resultado lógico.
- Misma clave con payload distinto produce conflicto; no regenerar clave durante replay incierto.
- Update/delete conservan versión remota mediante `If-Match`; no omitirla para “resolver” 409.
- Imagen usa `remoteId` de tarea y operación estable; nunca enviar `localId` como UUID backend.
- 401 pausa flujo remoto; conflicto/review requiere acción explícita.
- No borrar archivo local antes de confirmación segura de metadata/sync.

## Backend y API

Rutas reales:

```text
GET  /health
GET  /ready
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
POST /api/tasks
GET  /api/tasks
GET  /api/tasks/:id
PATCH /api/tasks/:id
DELETE /api/tasks/:id
POST /api/tasks/:id/images
GET  /api/tasks/:id/images
GET  /api/tasks/:id/images/:imageId/file
DELETE /api/tasks/:id/images/:imageId
POST /api/tasks/:id/audios
GET  /api/tasks/:id/audios
GET  /api/tasks/:id/audios/:audioId/file
DELETE /api/tasks/:id/audios/:audioId
```

- Zod valida body, params y query.
- Rutas privadas requieren Bearer.
- Recursos ajenos devuelven 404 para ocultar existencia.
- `Idempotency-Key` opcional existe en create/update/delete task y upload image.
- `If-Match` opcional existe en update/delete task; número decimal directo o entre comillas.
- Uploads usan campo `file`; Postman/cliente deja generar boundary multipart.
- Imágenes: JPEG, PNG o WebP, máximo 10 MiB.
- Audio backend: MIME declarados en `attachment.schemas.ts`, máximo 10 MiB, duración `(0, 3600]` segundos.

## Docker y datos

- Compose contiene `db`, `migrate`, `backend`; Metro corre en host.
- `db:5432` solo funciona dentro de Compose.
- Teléfono usa `EXPO_PUBLIC_API_URL` con IP LAN y `BACKEND_PORT`; nunca `localhost`.
- Volúmenes `task-manager-dev-postgres` y `task-manager-dev-uploads` sobreviven `down`.
- No ejecutar `docker compose down -v`, prune, reset o borrado de volúmenes salvo orden destructiva explícita.
- No levantar, reconstruir ni destruir Compose para cambio puramente documental.

## Verificación mínima por cambio

| Cambio | Verificación mínima |
|---|---|
| UI | typecheck mobile, tests focalizados relevantes, lint |
| Servicio mobile | tests focalizados, suite mobile, typecheck |
| Backend | tests focalizados, suite backend, `typecheck:tests` |
| Prisma | `prisma validate`; `migrate status` o procedimiento documentado |
| Docker | `docker compose ... config --quiet`; health/readiness si entorno ya corre |
| Documentación/Postman | JSON parse, variables/rutas/scripts, links y comandos |

Toda entrega relevante termina con:

```bash
git diff --check
yarn typecheck
yarn typecheck:tests
yarn lint
yarn test
```

Además:

- Bug fix: reproducir, corregir causa y confirmar que reproducción desaparece.
- UI/nativo: Jest no prueba bridge; validar Development Build físico cuando cambio toca cámara, GPS, audio, gestos o accesibilidad nativa.
- Docker/EAS/Gradle no son obligatorios para documentación pura.
- Ejecutar formatter/lint/suites completas una vez al final, no después de cada edición.

## Documentación

- README y AGENTS describen presente; informes P0–P5 pueden conservar resultados históricos fechados.
- Corregir informe histórico solo cuando afirmación factual vigente induzca a error.
- No inventar badges, capturas, métricas, compatibilidad, comandos, deployment o estado físico.
- Colección Postman debe usar schema v2.1, `{{baseUrl}}`, variables declaradas, Bearer en headers y cero secretos/IP/rutas locales reales.
- Audio backend en Postman no implica audio remoto móvil.
- Cambios documentales no deben tocar `mobile/app`, `mobile/src`, `backend/src`, `backend/prisma`, scripts, manifests, Compose o lockfile.