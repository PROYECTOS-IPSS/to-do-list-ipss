# P5 — Bloque D.1: auditoría funcional final

## 1. Resumen ejecutivo

El checkout actual corresponde a `fix/ui`, HEAD `2e51b9c`, sobre el commit estable de audio local `50d2774`. Los gates automatizados pasan y Docker está operativo: backend `Up`, PostgreSQL `healthy`, `/health` y `/ready` responden HTTP 200.

La arquitectura funcional está completa para el alcance declarado: autenticación, tareas offline-first, sincronización de tareas e imágenes, GPS, importación externa, fotografías locales/remotas protegidas, audio local B.2.1, safe area y feedback. La sincronización/descarga/reproducción remota de audio B.2.2 permanece deliberadamente fuera de alcance y no se clasifica como regresión.

Persisten límites de validación física Android, principalmente audio local, cámara, GPS, filesystem persistente, multipart nativo y layout con tamaño de fuente/rotación. También existe deuda técnica P3 por warning TS151002 de ts-jest y por logs `console.info` de autenticación en desarrollo. No se observó P0 ni P1 bloqueante en inspección o gates.

**Decisión: LISTO PARA REDISEÑO CON DEUDAS NO BLOQUEANTES.**

## 2. Estado Git

| Campo | Evidencia |
|---|---|
| Rama | `fix/ui` |
| HEAD | `2e51b9c fix(ui): mejorar safe area filtros y mensajes` |
| Working tree | Cambios sin commit presentes, correspondientes al trabajo C.1 y este informe no creado al inicio; no se sobrescribieron |
| Commit estable de imágenes | `d444719 fix(attachments): corregir persistencia y sincronización de imágenes` |
| Commit de audio local | `50d2774 feat(audio): añadir persistencia local de notas de voz` |
| Commit de usabilidad C.1 | `2e51b9c fix(ui): mejorar safe area filtros y mensajes` |
| Stash | `stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable` |
| Diff whitespace | `git diff --check`: correcto |

No se inspeccionó contenido sensible del stash. No se ejecutaron `stash pop`, `stash apply`, `reset`, rebase, comandos destructivos, commit ni push.

## 3. Alcance actual

- Monorepo Yarn Classic con workspaces `mobile` y `backend`.
- Mobile: Expo SDK 57, React Native, Expo Router, SQLite, SecureStore, cámara, ubicación y audio.
- Backend: Express, Zod, Prisma, PostgreSQL, JWT y Multer.
- Persistencia local: SQLite por `ownerId`; archivos multimedia en Documents del dispositivo.
- Persistencia remota: PostgreSQL y volumen Docker privado para uploads.
- Sincronización: manual y al volver a foreground; operaciones durables con idempotencia, reintentos y resolución de conflictos.
- Audio: B.2.1 local únicamente.

## 4. Matriz funcional

| Funcionalidad | Implementación | Fuente de datos | Offline | Remoto | Pruebas | Validación física conocida | Estado | Riesgo |
|---|---|---|---|---|---|---|---|---|
| Registro/login/restauración/logout | `AuthProvider`, `auth.ts`, rutas auth, SecureStore | SecureStore + API/JWT | Acceso local con identidad validada | JWT + `/me` | Auth mobile/backend, 80 backend y 122 mobile totales | No Android físico actual | completo con validación física pendiente | Bajo |
| CRUD de tareas | `TaskStore`, `LocalTaskRepository`, rutas task | SQLite + PostgreSQL | Crear/editar/completar/eliminar | API protegida | task repository, task backend, sync | No flujo completo físico | completo con validación física pendiente | Bajo |
| Persistencia local | SQLite migrations y filesystem Documents | SQLite + Documents | Sí | N/A | repository/photo/audio | Reinicio Android pendiente | completo con validación física pendiente | Medio |
| Sincronización de tareas | `sync-service.ts` | `sync_operations` + API | Encola cambios | Create/update/delete | sync-service, backend | No red intermitente física | completo con validación física pendiente | Medio |
| Filtros | `preferences.ts`, Home | AsyncStorage + tareas SQLite | Sí | N/A | preferences y mobile total | No físico | completo con validación física pendiente | Bajo |
| GPS | `peripherals.ts`, validación y campos de tarea | SQLite + API | Guarda ubicación local | Sincroniza con tarea | location backend/mobile | Permisos/GPS real pendiente | completo con validación física pendiente | Medio |
| Fotografías locales | `photo-persistence`, `local-media`, SQLite | Documents + SQLite | Sí | Pendiente si no hay remoto | photo/repository/image tests | Cámara/filesystem Android pendiente | completo con validación física pendiente | Medio |
| Fotografías sincronizadas | `attachments`, `sync-service`, backend protegido | SQLite + PostgreSQL/uploads | Conserva copia local | Upload idempotente y descarga Bearer | attachment/image-file/sync tests | Multipart Android pendiente | completo con validación física pendiente | Medio |
| Importación externa | JSONPlaceholder adapter + `import.tsx` | API externa + SQLite | Importación queda local | Pendiente por sync de tarea | adapter tests | Red externa y UI física pendiente | completo con validación física pendiente | Bajo |
| Audio local B.2.1 | detalle, `local-media`, SQLite, expo-audio | Documents + SQLite | Grabación y reproducción local | No aplica | typecheck; parte del mobile total | Desarrollo Android requerido | completo con validación física pendiente | Medio |
| Audio remoto B.2.2 | No implementado por decisión | N/A | N/A | N/A | No requerido | No requerido | fuera de alcance | Informativo |
| Safe area/feedback | `Screen`, `AppFeedback`, Home | Estado React Native | Sí | Sí | mobile total + preferencias | Tamaño fuente/rotación pendientes | completo con validación física pendiente | Bajo |

## 5. Autenticación

### Evidencia

- Registro y login llaman API con body JSON validado mediante esquemas Zod en cliente y backend.
- JWT se almacena mediante `expo-secure-store`; AsyncStorage queda reservado para preferencias.
- Restauración consulta token y `/api/auth/me`; una respuesta 401 limpia el token.
- Error de red/timeout no se transforma automáticamente en credenciales inválidas. Si existe identidad local validada, se permite `accessMode = local`.
- `logout` limpia token e identidad local mediante `Promise.allSettled`; falla si alguna limpieza falla.
- Bearer viaja en headers, no en URLs.
- No se encontraron passwords en logs ni persistencia local.
- Backend deriva `userId` del JWT y filtra tareas/adjuntos por ownership.

### Evaluación

**Estado: completo con validación física pendiente.** Cambio de cuenta está protegido por `operation` y por `ownerId` en SQLite. No se observó mezcla lógica entre identidades. Falta confirmar físicamente cambio de cuenta con dos usuarios y datos persistidos en Development Build.

## 6. Tareas offline-first

### Evidencia

- `LocalTask` conserva `localId`, `remoteId`, `ownerId`, `syncState`, `remoteOutcome`, versión y `deletedAt`.
- Crear siempre persiste primero y encola operación; remoto exitoso confirma la tarea.
- Editar persiste localmente antes de red; compara `remoteVersion` y usa `saveRemoteIfUnchanged`.
- Eliminar usa tombstone/operación durable hasta confirmación remota.
- Errores 401 mantienen cambio local y marcan requisito de autenticación.
- Errores de red marcan resultado remoto incierto y fuerzan revisión manual, evitando reenvío inseguro.
- Sync aplica backoff, Retry-After, máximo de intentos, idempotency key y estados `conflict`, `failed`, `review`.
- Operaciones huérfanas se marcan `review` en vez de eliminarse silenciosamente.
- Identificadores locales usan timestamp + sufijo aleatorio; es una simplificación razonable, con riesgo residual teórico muy bajo.

### Evaluación

**Estado: completo con validación física pendiente.** No se observaron promesas productivas sin `await` en las ramas auditadas ni pérdida silenciosa de cambios locales. Deben validarse en dispositivo reinicio, modo avión, reintento y doble cuenta.

## 7. Sincronización

La sincronización solo procesa tareas e imágenes. En Home se inicia manualmente y al volver a foreground. El lock singleton evita ejecuciones simultáneas del mismo contexto. La rama de imagen espera upload, confirmación SQLite y marcado `confirmed` antes de terminar.

- 401: detiene el lote y conserva operación para revisión/autenticación.
- 409: conflicto explícito.
- 429/5xx/red: pending con retry; después de máximo de intentos, failed.
- Resultado remoto incierto: review; no reenvío automático inseguro.
- No existe rama de audio remoto: esperado por B.2.2 fuera de alcance.

**Estado: completo con validación física pendiente.** Riesgo medio por dependencia de bridge nativo y red real; lógica automatizada pasa.

## 8. Imágenes

Se confirmó en código y pruebas:

- captura con permiso bajo demanda;
- copia previa a Documents por propietario/tarea;
- metadata SQLite durable;
- múltiples imágenes sin restricción artificial;
- claves de render derivadas de identidad de imagen;
- upload multipart con `expo/fetch`, `File`, MIME/nombre e `Idempotency-Key`;
- copia local conservada hasta confirmación;
- reconciliación local/remota;
- descarga mediante endpoint autenticado, sin token en URL;
- ownership en backend;
- `/uploads` no se sirve públicamente;
- eliminación individual;
- protección frente a traversal y symlink escape;
- validación MIME y límite Multer;
- recuperación de metadata/replay idempotente en backend.

**Estado: completo con validación física pendiente.** Riesgo medio: documentación B.1 registra expresamente que Jest no sustituye Android físico, volumen real ni bridge multipart.

## 9. Audio local

**Audio local: incluido.**

El flujo B.2.1 es:

`permiso → grabación → stop → preview → copia a Documents → metadata SQLite → reproducción local`.

Se observó:

- permiso de micrófono;
- estados que bloquean doble operación;
- preview y reproducción desde URI local;
- múltiples audios por tarea;
- eliminación por `ownerId`, `taskLocalId` e ID;
- pausa y cleanup al desmontar;
- eliminación de preview temporal;
- reproducción sin conexión prevista por diseño.

**Estado: completo con validación física pendiente.** La documentación B.2.1 declara correctamente que permisos reales, formato Android, reinicio y bridge requieren Development Build.

**Audio remoto/sincronizado: fuera de alcance por decisión.** No es regresión ni requisito para congelar el comportamiento actual.

## 10. GPS

`getCurrentLocation` solicita permiso foreground, verifica servicios activos/proveedor, obtiene posición de alta precisión y valida latitud, longitud, accuracy máxima de 100 m y timestamp. La tarea puede guardar o eliminar ubicación localmente y sincronizarla como campos escalares.

**Estado: completo con validación física pendiente.** No se implementa background location, conforme a alcance. Riesgo medio por permisos, proveedor GPS y precisión real.

## 11. Importación

El adaptador JSONPlaceholder aplica timeout, límite de bytes, límite de registros, Zod, deduplicación y rechazo de registros inválidos. La UI conserva selección, identifica tareas ya importadas por proveedor/ID externo y persiste mediante `importTasks` con ownership local. Las tareas importadas siguen el flujo normal de sincronización si existe sesión remota.

**Estado: completo con validación física pendiente.** Riesgo bajo; depende de disponibilidad de servicio externo y red.

## 12. Usabilidad funcional

### Confirmado por inspección

- `Screen` consume safe area mediante una única `SafeAreaView` compartida.
- Login, registro, Home, importación y detalle reutilizan `Screen`.
- AuthScreen conserva KeyboardAvoidingView y scroll.
- Home inicia en `pending`; preferencia válida se conserva; valor ausente/inválido vuelve a `pending`.
- Botones tienen roles, estados disabled/busy y targets mínimos.
- Feedback admite multilínea, región viva y rol alert para errores.
- Loading, error, vacío y retry están presentes en flujos principales.
- Keys de listas de tareas, imágenes, audios y operaciones son explícitas.

### Pendiente físico

- fuente aumentada;
- rotación/cambio de pantalla;
- teclado real en login/registro y creación;
- safe area Android edge-to-edge;
- lectura completa de mensajes largos en dispositivo;
- navegación y bloqueo de botones bajo doble toque.

Las oportunidades puramente estéticas no se clasifican como defectos funcionales.

**Estado: completo con validación física pendiente.**

## 13. Seguridad básica

### Controles observados

- Zod en límites de autenticación, tareas, adjuntos e importación.
- JWT Bearer requerido en rutas protegidas.
- Ownership en tareas e imágenes/audios.
- Prisma parametriza acceso a base de datos.
- `/uploads` no tiene exposición estática pública.
- Descarga de imágenes/audio pasa por endpoint autenticado.
- Paths de archivos restringidos y normalizados; se comprueba permanencia bajo directorio permitido.
- MIME y tamaño de uploads se validan con Multer.
- `.env` raíz está documentado como ignorado; `.env.example` contiene placeholders.
- Tokens no aparecen en URLs ni SQLite.
- Logs de auth en desarrollo imprimen método, path, URL base y status, no credenciales.

### Hallazgos de seguridad/deuda

- `mobile/.env.example` contiene `http://localhost:3000`; es fallback/documentación de desarrollo, no secreto. En teléfono requiere URL LAN explícita.
- `backend/.env.example` contiene credenciales placeholder de desarrollo; no es secreto real.
- `backend/src/server.ts` registra puerto al iniciar; no datos sensibles.
- `mobile/src/services/auth.ts` registra URL base y endpoints en `NODE_ENV !== production`; deuda P3 de minimización de logs, no exposición de secreto observada.

**Estado: completo con validación física/deployment pendiente.** No se realizó auditoría ofensiva ni prueba destructiva.

## 14. Tests y gates

Ejecutados secuencialmente:

| Comando | Resultado |
|---|---|
| `git diff --check` | Pass |
| `yarn typecheck` | Pass: mobile + backend |
| `yarn typecheck:tests` | Pass |
| `yarn lint` | Pass |
| `yarn test` | Pass: backend 8 suites/80 tests; mobile 13 suites/122 tests |
| `yarn workspace task-manager-backend exec prisma validate` | Pass: schema válido |

Se observó el warning conocido `ts-jest TS151002` durante ejecución backend en la corrida donde apareció; no se corrigió en esta auditoría. Clasificación: deuda P3.

No se modificaron código ni pruebas para hacer pasar los gates.

## 15. Docker

Ejecutados:

- `docker compose -p task-manager-dev -f docker-compose.yml config --quiet`: correcto.
- `docker compose ... ps -a`: backend `Up`, PostgreSQL `Up (healthy)`, migrate `Exited (0)` esperado.
- `curl http://127.0.0.1:3000/health`: `200 {"status":"ok"}`.
- `curl http://127.0.0.1:3000/ready`: `200 {"status":"ready"}`.

No se reconstruyeron servicios ni se ejecutaron comandos destructivos. No se ejecutaron requests mutantes contra API en esta auditoría.

## 16. Hallazgos priorizados

### P0

Ninguno observado.

### P1

Ninguno observado en código, gates o smoke check Docker.

### P2

- **P2 — Validación física funcional pendiente.** Evidencia: documentación B.1/B.2.1/C.1 y ausencia de Development Build ejecutado en esta auditoría. Impacto: no demuestra bridge Android, cámara, audio, GPS, multipart, reinicio ni layout físico. Reproducibilidad: pendiente de dispositivo. Recomendación: ejecutar checklist físico antes de release; **no bloquea comenzar rediseño**, pero bloquea declarar validación de dispositivo completa.

### P3

- **P3 — Warning TS151002 de ts-jest.** Evidencia: salida de `yarn test` backend. Impacto: ruido/deuda de configuración, sin fallo actual. Reproducibilidad: aparece durante suite backend. Recomendación: ajustar `isolatedModules` o configuración ts-jest en tarea separada; no bloquea rediseño.
- **P3 — Logs de autenticación en desarrollo.** Evidencia: `mobile/src/services/auth.ts:40,47`, condicionados a `NODE_ENV !== production`. Impacto: ruido y exposición de endpoint/status en desarrollo; no se observaron tokens/passwords. Recomendación: decidir política de logging antes de producción; no bloquea rediseño.
- **P3 — IDs locales no UUID.** Evidencia: `mobile/src/services/task-repository.ts:57-58`, timestamp + sufijo aleatorio. Impacto: riesgo teórico de colisión extremadamente bajo, mitigado por persistencia local; no se reprodujo. Recomendación: solo cambiar con requisito de interoperabilidad; no bloquea rediseño.
- **P3 — Checklist físico histórica no cerrada.** Evidencia: docs B.1, B.2.1 y C.1 marcan pruebas Android pendientes. Impacto: cobertura real incompleta, no regresión automática. Recomendación: ejecutar en Development Build; no bloquea rediseño visual si comportamiento se congela explícitamente.

### Informativos

- B.2.2 audio remoto/sincronizado no existe por decisión explícita; no es defecto.
- `.env.example` usa localhost como placeholder; el setup Docker/documentación exige URL LAN para teléfono.
- `migrate` detenido con código 0 es comportamiento esperado de Compose.

## 17. Funcionalidad deliberadamente fuera de alcance

- Sincronización, descarga y reproducción remota de audio B.2.2.
- Background location.
- Background recording.
- Tracking GPS continuo.
- Mapas, streaming, transcripción y waveform.
- Despliegue de producción y perfil EAS production.

La ausencia de estas funciones no se considera regresión.

## 18. Recomendación sobre rediseño

**LISTO PARA REDISEÑO CON DEUDAS NO BLOQUEANTES.**

La lógica actual pasa todos los gates, Docker está saludable y no se observan defectos P0/P1. Antes de congelar una versión de release conviene ejecutar el checklist físico Android, especialmente B.2.1, imágenes multipart, GPS, reinicio y accesibilidad con fuente aumentada. El rediseño debe preservar contratos, estados offline-first, ownership, IDs, operaciones de sync, rutas protegidas y separación de audio local frente a audio remoto fuera de alcance.

## 19. Checklist físico final

- [ ] Registro, login, `/me`, restauración y logout con dos cuentas.
- [ ] Confirmar aislamiento de tareas, imágenes y audios entre cuentas.
- [ ] Crear, editar, completar y eliminar online/offline.
- [ ] Reiniciar app y comprobar tareas/operaciones pendientes.
- [ ] Activar modo avión, modificar tarea y sincronizar al recuperar red.
- [ ] Provocar 401 y confirmar conservación local.
- [ ] Crear tarea con fotografía y comprobar copia/miniatura inmediata.
- [ ] Agregar múltiples imágenes, cerrar/reabrir, eliminar una sola.
- [ ] Sincronizar imágenes y comprobar descarga autenticada.
- [ ] Grabar, detener, previsualizar, guardar y reproducir audio local.
- [ ] Cerrar/reabrir detalle y reproducir audio sin red.
- [ ] Agregar/eliminar múltiples audios sin afectar imágenes.
- [ ] Obtener GPS con permisos, accuracy insuficiente y eliminación.
- [ ] Importar registros externos, repetir importación y comprobar deduplicación.
- [ ] Confirmar Pendientes como filtro inicial y orden visual.
- [ ] Leer mensajes largos, loading/error/empty/retry y sincronización.
- [ ] Aumentar tamaño de fuente del sistema.
- [ ] Rotar/cambiar pantalla y comprobar teclado, scroll y safe area.

## Cierre

Archivo creado: `docs/P5_BLOCK_D1_FUNCTIONAL_AUDIT.md`.

No se modificaron archivos de código, configuración, pruebas ni documentación existente. No hubo commit ni push. El stash B.2.2 continúa intacto.
