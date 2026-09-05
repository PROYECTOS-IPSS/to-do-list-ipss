# P5 — Bloque F.1: documentación final y colección Postman

## 1. Línea base

- Rama autorizada: `docs/update`.
- HEAD: `1418d63 auditoria final ui`.
- Historial visible: `209f144 fix(ui): mejorar experiencia de importación`, `2f7a4ef feat(ui): rediseñar importación y estados`.
- Working tree inicial: limpio.
- `git diff --check` inicial: correcto.
- Node.js: `v24.15.0`.
- Yarn Classic: `1.22.22`.
- Docker: `29.7.2`.
- Docker Compose: `5.5.0`.
- Stash protegido confirmado por `git stash list`: `stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable`.
- Stash no aplicado, inspeccionado, eliminado ni renombrado.

Gates iniciales:

- `yarn typecheck`: pasa.
- `yarn typecheck:tests`: pasa.
- `yarn lint`: pasa.
- backend: 8 suites, 80 tests, pasa.
- mobile: 14 suites, 127 tests, pasa.
- total: 22 suites, 207 tests, 0 snapshots.
- Output conocido: tests mobile imprimen trazas `console.info` de requests auth; no fallan y no son warnings de Jest.

## 2. Archivos auditados

Fuentes principales:

- `README.md`, `AGENTS.md`, `.env.example`, `.gitignore`, `.dockerignore`;
- `package.json`, `mobile/package.json`, `backend/package.json`;
- `docker-compose.yml`, `backend/Dockerfile`;
- `scripts/setup.cjs`, `scripts/dev-docker.cjs`;
- `mobile/app.json`, `mobile/eas.json`;
- `mobile/app/`, `mobile/src/auth/`, `mobile/src/services/`, `mobile/src/ui/`;
- `backend/src/server.ts`, routes, middleware, controllers, schemas y services;
- `backend/prisma/schema.prisma` y migraciones;
- ocho suites backend y catorce suites mobile;
- `postman/task-manager.postman_collection.json`;
- guías recientes de Docker, sincronización, importación, audio local y UI E.1–E.7.

Documentación externa consultada solo para formato Postman: Postman Collection SDK actual, variables, descriptions, scripts y `FormParam` (`src`, `contentType`, `fileName`). Contrato del producto se obtuvo exclusivamente del repositorio.

## 3. Contradicciones encontradas

| Afirmación anterior | Evidencia vigente | Corrección |
|---|---|---|
| Monorepo npm y comandos npm | `packageManager: yarn@1.22.22`, workspaces y scripts Yarn | README y AGENTS usan Yarn Classic |
| `.env` separado en backend/mobile | setup y Compose consumen único `.env` raíz | Documentado único archivo raíz |
| Node `>=20.19.4` | Dockerfile fija `node:24.15.0`; guía vigente usa v24.15.0 | Requisito reproducible exacto 24.15.0 |
| No existe cola ni resolución de conflictos | SQLite contiene `sync_operations`; P3/P3.1 y código ejecutan idempotencia/versionado | Arquitectura offline-first y conflictos documentados |
| Audio móvil se sube y reproduce remoto | pantalla estable usa `saveLocalAudio`, `listLocalAudios`, `deleteLocalAudio`; no llama API audio | Audio móvil documentado local; backend audio separado |
| Procedencia importada llega al backend | cola mobile serializa solo title/description/completed | README limita procedencia a SQLite; backend solo la conserva si cliente la envía |
| Test counts 7/61 o 1/48 | ejecución F.1: backend 8/80, mobile 14/127 | Conteos actualizados |
| Prisma raíz mediante `yarn run prisma:generate` | script existe solo en workspace backend | Comando corregido a workspace |
| Newman ejecutable sugerido | no existe dependencia Newman | Sugerencia retirada; no se instaló dependencia |
| Android export/assemble aprobado | informes posteriores no sostienen cierre uniforme; F.1 no ejecuta Android | README distingue gates automáticos y validación física |
| `/ready` ausente de resumen API | `server.ts` implementa y consulta PostgreSQL | Incluido junto a `/health` |
| Colección sin descargas protegidas, versiones o scripts | rutas/tests vigentes sí cubren esos contratos | Colección reconstruida |
| `ExampleBox` genérico/escalable | implementación acotada `maxHeight=360`, máximo importación 200 | Límite explícito |

No se reescribieron informes históricos: resultados de su momento siguen siendo históricos. README y AGENTS dejan de presentarlos como estado actual.

## 4. Decisiones documentales

- README se reemplazó por guía vigente, sin badges, métricas promocionales o capturas inexistentes.
- Arquitectura separa almacenamiento local inmediato de persistencia remota.
- Audio backend permanece documentado como contrato API; no se confunde con funcionalidad móvil estable.
- Setup se describe según control flow real, incluida precedencia y caso del placeholder de `.env.example`.
- Comandos provienen de manifests vigentes.
- AGENTS se redujo a reglas operativas e invariantes, sin duplicar tutorial completo.
- Postman usa flujos manuales visibles; scripts solo validan/capturan variables y nunca ejecutan deletes ocultos.

## 5. README final

Incluye:

- objetivo académico y funciones;
- stack y versiones;
- tabla local/remoto/estado;
- SQLite, PostgreSQL, SecureStore, filesystem y volúmenes;
- `localId`, `remoteId`, `remoteVersion`, cola, idempotencia y conflictos;
- instalación/setup/Compose/Metro;
- único `.env` y seguridad de variables;
- comandos existentes;
- dispositivo físico y diferencia localhost/IP LAN;
- gates y conteos actuales;
- Postman y orden manual;
- limitaciones reales.

## 6. AGENTS final

Reglas operativas añadidas o corregidas:

- jerarquía de fuentes de verdad;
- Yarn Classic y lockfile;
- responsabilidades de rutas;
- Mulberry Night y `tokens.json` autoritativo;
- `localId` como identidad UI;
- SQLite no reemplazable por PostgreSQL;
- secretos fuera de bundle/URLs/logs;
- Bearer solo en headers y archivos vía endpoints protegidos;
- audio móvil local, sin B.2.2;
- estabilidad de operation IDs, idempotencia y `If-Match`;
- borrado seguro de archivos;
- keys estables y warnings no silenciados;
- spies locales con `try/finally`;
- volúmenes y stash protegidos;
- matriz de verificación por tipo de cambio.

## 7. Matriz real de endpoints

Todos los errores usan `{ success: false, error: { code, message } }`, salvo `/ready` no listo, que devuelve `{ status: "not-ready" }`.

| Método | Ruta | Auth | Headers/query | Body | Respuestas principales |
|---|---|---|---|---|---|
| GET | `/health` | No | — | — | 200 `status=ok` |
| GET | `/ready` | No | — | — | 200 `ready`; 503 `not-ready` |
| POST | `/api/auth/register` | No | JSON | `name`, `email`, `password` | 201 usuario+token; 400; 409 email |
| POST | `/api/auth/login` | No | JSON | `email`, `password` | 200 usuario+token; 400; 401 |
| GET | `/api/auth/me` | Bearer | Authorization | — | 200 usuario; 401 |
| POST | `/api/auth/logout` | Bearer | Authorization | — | 204; 401 |
| POST | `/api/tasks` | Bearer | `Idempotency-Key` opcional | tarea estricta; ubicación/procedencia completas | 201; 400; 401; 409 replay mismatch/provenance |
| GET | `/api/tasks` | Bearer | `completed=true|false` opcional | — | 200; 400; 401 |
| GET | `/api/tasks/:id` | Bearer | UUID | — | 200; 400; 401; 404 |
| PATCH | `/api/tasks/:id` | Bearer | `If-Match`, `Idempotency-Key` opcionales | al menos un campo; ubicación completa o toda null | 200; 400; 401; 404; 409 |
| DELETE | `/api/tasks/:id` | Bearer | `If-Match`, `Idempotency-Key` opcionales | — | 204; 400; 401; 404; 409 |
| POST | `/api/tasks/:id/images` | Bearer | `Idempotency-Key` opcional; multipart | `file` | 201; 400; 401; 404; 409; 500 integridad |
| GET | `/api/tasks/:id/images` | Bearer | UUID | — | 200 arreglo; 400; 401; 404 |
| GET | `/api/tasks/:id/images/:imageId/file` | Bearer | UUIDs | — | 200 binario; 400; 401; 404 |
| DELETE | `/api/tasks/:id/images/:imageId` | Bearer | UUIDs | — | 204; 400; 401; 404 |
| POST | `/api/tasks/:id/audios` | Bearer | multipart | `file`, `duration` | 201; 400; 401; 404 |
| GET | `/api/tasks/:id/audios` | Bearer | UUID | — | 200 arreglo; 400; 401; 404 |
| GET | `/api/tasks/:id/audios/:audioId/file` | Bearer | UUIDs | — | 200 binario; 400; 401; 404 |
| DELETE | `/api/tasks/:id/audios/:audioId` | Bearer | UUIDs | — | 204; 400; 401; 404 |

Detalles Zod:

- title 1..200; description hasta 2000 nullable;
- latitude `[-90,90]`, longitude `[-180,180]`, accuracy `[0,100]`;
- cuatro campos location juntos, o cuatro `null` para limpiar;
- provenance requiere `externalProvider` + `externalId` juntos;
- UUID inválido y payload estricto inválido: 400 `VALIDATION_ERROR`;
- ownership ajeno: 404, no 403;
- `If-Match`: entero no negativo, directo o entre comillas; versión stale: 409;
- Idempotency-Key: 1..255 tras trim;
- imagen: JPEG, PNG, WebP, máximo 10 MiB;
- audio: MP4, MPEG, AAC, WAV, x-m4a, máximo 10 MiB, duración `(0,3600]`.

## 8. Colección Postman

Schema: Postman Collection v2.1.

Carpetas y orden:

1. Health;
2. Auth;
3. Tasks;
4. Images;
5. Audio;
6. Authorization and ownership;
7. Validation and errors;
8. Cleanup.

Total: 32 requests manuales. Cleanup contiene todos los DELETE y Logout al final. Archivo existente ya tenía nombre correcto; no hubo rename ni duplicado.

## 9. Variables

- `baseUrl`;
- `email`, `password`;
- `token`;
- `otherEmail`, `otherPassword`, `otherToken`;
- `taskId`, `taskVersion`;
- `imageId`, `audioId`;
- `createIdempotencyKey`, `imageIdempotencyKey`.

`baseUrl` usa `http://localhost:3000` para Postman en host. Emails/passwords son valores ficticios `.test`; tokens e IDs empiezan vacíos. No existe IP LAN personal ni ruta local de archivo.

## 10. Scripts

Scripts transparentes:

- Login guarda `token` solo tras 200 y token string no vacío.
- Login secundario guarda `otherToken` sin reemplazar token principal.
- Create guarda `taskId` y `taskVersion`.
- Update refresca `taskVersion`.
- Upload image/audio guarda ID correspondiente.
- Create/image genera GUID solo cuando clave de colección está vacía.
- Caso stale calcula `staleVersion` local sin modificar versión vigente.
- Tests comprueban status y contrato mínimo.

Ningún script imprime token, cambia identidad activa silenciosamente o dispara DELETE.

## 11. Auth

Register y Login usan credenciales ficticias configurables. Rutas privadas declaran Bearer explícito. Me sin token valida 401. Logout queda en Cleanup. Backend logout es stateless; no invalida JWT mediante blacklist.

## 12. Idempotencia

Código admite `Idempotency-Key` opcional en create/update/delete task y upload image. Colección demuestra:

- create original;
- replay con misma clave/payload y mismo ID;
- conflicto con misma clave/payload distinto, 409 `IDEMPOTENCY_KEY_REUSED`;
- upload image con clave estable para replay manual.

Claves son por usuario y globales entre operaciones; colección separa clave create e image para evitar colisión accidental. Para nueva creación lógica debe vaciarse `createIdempotencyKey`; replay no la regenera.

## 13. Ownership

Segundo usuario se registra e inicia sesión en requests explícitas. `otherToken` se usa directamente para intentar leer `taskId` principal. Resultado esperado: 404 `TASK_NOT_FOUND`. `token` principal nunca se reemplaza.

## 14. Multipart

- Campo binario exacto: `file`.
- Audio añade `duration` texto coercionado a número.
- No se fija `Content-Type: multipart/form-data`; Postman genera boundary.
- Usuario selecciona archivo local manualmente.
- Colección no contiene binarios ni paths.
- MIME y límites documentados desde schemas/routes.

## 15. Descargas

Incluidas:

- `GET /api/tasks/{{taskId}}/images/{{imageId}}/file`;
- `GET /api/tasks/{{taskId}}/audios/{{audioId}}/file`.

Ambas usan Bearer, validan ownership y permiten ver/guardar binario en Postman. No usan `/uploads` ni token en query.

## 16. Validaciones

Casos negativos representados:

- sin token: 401;
- payload tarea inválido: 400;
- tarea inexistente: 404;
- ownership ajeno: 404;
- versión stale: 409;
- misma idempotency key con payload distinto: 409;
- MIME imagen inválido: 400;
- duración audio inválida: 400;
- MIME audio inválido: 400.

Status y códigos provienen de routes/services/tests, no de intuición.

## 17. Archivos renombrados

Ninguno. Ruta existente ya era:

```text
postman/task-manager.postman_collection.json
```

No existe copia con nombre erróneo.

## 18. Pruebas

Línea base y cierre ejecutan:

```bash
yarn typecheck
yarn typecheck:tests
yarn lint
yarn test
```

Conteos: backend 8/80; mobile 14/127; total 22/207.

No se ejecutaron EAS, Gradle, emulador ni requests de escritura. Compose ya estaba activo; se hicieron solo comprobaciones permitidas:

- `docker compose -p task-manager-dev -f docker-compose.yml config --quiet`: pasa;
- `GET http://127.0.0.1:3000/health`: `{"status":"ok"}`;
- `GET http://127.0.0.1:3000/ready`: `{"status":"ready"}`.

## 19. Gates

Gates finales:

- `git diff --check`: pasa;
- diff productivo: vacío;
- JSON Postman: parse correcto;
- schema Postman v2.1, 32 nombres únicos, todas las URLs bajo `{{baseUrl}}`;
- variables usadas declaradas; `staleVersion` es local y se define antes de uso;
- cero headers multipart manuales, requests ocultas, logs de scripts, secretos o `/uploads` en URLs;
- cobertura de las 19 combinaciones método/ruta reales: completa, sin rutas desconocidas;
- fences Markdown: balanceados;
- `yarn typecheck`: pasa;
- `yarn typecheck:tests`: pasa;
- `yarn lint`: pasa;
- `yarn test`: backend 8/80 y mobile 14/127, pasa.

## 20. Limitaciones

- Audio remoto no conectado a flujo móvil estable.
- Sin sync con app cerrada/background.
- Sin transacción distribuida filesystem/PostgreSQL.
- MIME declarado por cliente, sin magic-byte.
- APIs nativas y gestos requieren Android físico/Development Build.
- JSONPlaceholder entrega datos ficticios y máximo local de 200 registros.
- `ExampleBox` está diseñado para catálogo acotado.
- Sin deployment productivo ni perfil EAS production.
- F.1 no valida EAS, Gradle, emulador, cámara, GPS o micrófono.

## 21. Checklist manual

1. Importar colección.
2. Iniciar backend.
3. Ejecutar Health.
4. Ejecutar Ready.
5. Registrar usuario ficticio.
6. Ejecutar Login.
7. Confirmar variable `token` sin imprimirla.
8. Ejecutar Me.
9. Crear tarea.
10. Ejecutar replay create.
11. Ejecutar conflicto de payload/idempotencia.
12. Listar tareas.
13. Obtener tarea.
14. Actualizar con versión.
15. Subir imagen seleccionada manualmente.
16. Listar imágenes.
17. Descargar imagen protegida.
18. Probar MIME imagen inválido.
19. Subir/listar/descargar audio backend si se desea validar API.
20. Probar duración/MIME audio inválidos.
21. Probar request sin token.
22. Probar tarea inexistente.
23. Registrar/login segundo usuario.
24. Probar ownership con `otherToken`.
25. Probar versión stale.
26. Ejecutar deletes solo al final.
27. Ejecutar Logout.
28. Confirmar que consola no imprimió secretos.

## 22. Estado final

Solo documentación y colección Postman modificadas. Producto, configuración, scripts, manifests, Compose, Prisma y lockfile quedan fuera del diff. Sin commit ni push. Stash protegido permanece intacto.

**LISTO PARA REVISIÓN MANUAL DE DOCUMENTACIÓN Y POSTMAN**
