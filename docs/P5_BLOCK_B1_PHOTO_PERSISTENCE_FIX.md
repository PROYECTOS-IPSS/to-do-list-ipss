# BLOQUE B.1 — Persistencia de fotografías

## Etapa exacta que fallaba

| Etapa | Función / archivo | Entrada | Resultado esperado | Fallo comprobado |
|---|---|---|---|---|
| Captura | `takePhoto`, `peripherals.ts` | permiso y cámara | asset con URI o cancelación | Funcionaba físicamente; cancelación ya era normal |
| Preview | `useTaskComposer`, `task-composer.ts` | URI temporal | conservar formulario | Funcionaba |
| Persistencia nueva | `saveTask`, `app/index.tsx` | tarea y URI temporal | copiar a `Paths.document`, metadata durable | Solo copiaba si tarea quedaba local; una tarea creada remotamente subía desde caché y nunca guardaba copia local |
| Persistencia edición | `addPhoto`, `app/tasks/[id].tsx` | tarea existente y URI temporal | conservar antes de red | Con `remoteId` subía directamente; cualquier fallo perdía recuperación y un `catch` agrupaba captura, copia y HTTP |
| Asociación | `saveLocalImage`, `task-repository.ts` | ownerId, localId, URI persistente | metadata + operación durable | Guardaba una sola imagen por tarea mediante `UNIQUE(owner_id, task_local_id, kind)` y no encolaba upload |
| Orden de sync | `run`, `sync-service.ts` | operaciones por creación | create → image con remoteId | Rama `image` enviaba siempre a `review`; nunca subía |
| Transporte | `attachments.ts` | token, remoteId, FormData | Bearer + idempotencia, multipart nativo | Corrección A.2 preservaba headers, pero no tenía regresión ni clasificación de respuesta |
| Backend | rutas/servicio de adjuntos | `file`, UUID remoto, JWT | archivo + `TaskImage` | Contrato real correcto: ownership, MIME, volumen e idempotencia |
| Render | lista/detalle | local URI o endpoint protegido | mostrar copia local/remota | Creación online no refrescaba ni conservaba URI; detalle podía mostrar local y remoto, pero el local no existía en camino online |

## Causa raíz y evidencia

Dos caminos distintos omitían misma garantía: persistir antes de red.

- Creación online: `attachmentsApi.uploadImage(...)` recibía URI temporal directamente. Tras éxito, formulario se limpiaba sin agregar respuesta al estado ni recargar adjuntos; por eso fotografía no aparecía.
- Edición online: mismo upload directo. Error de captura, copia, auth, validación, red o parsing terminaba en “No se pudo capturar o guardar la foto”. No quedaba archivo durable ni operación recuperable.
- Camino offline sí copiaba archivo, pero `saveLocalImage` no creaba operación `image`; sincronizador convertía cualquier operación image en revisión y nunca hacía upload.

## Corrección

- Toda captura se copia primero a `Paths.document` con nombre único.
- Metadata usa `ownerId` + `localId`; endpoint recibe únicamente `remoteId`.
- Guardar metadata crea operación `image` en misma transacción SQLite.
- Sync omite image mientras falta `remoteId`; después usa URI, MIME, nombre y `operationId` persistidos.
- Confirmación marca operación y elimina metadata local atómicamente; archivo físico se borra después. Repetición usa misma clave idempotente.
- Migración SQLite 5 elimina restricción de una imagen por tarea.
- Inicialización recupera metadata antigua sin operación, una sola vez y por propietario.
- Detalle conserva imagen local ante error de red/401; borrado local elimina solo imagen seleccionada y su operación.
- Cliente clasifica HTTP, timeout, red y JSON inválido; FormData no fija `Content-Type`, dejando boundary al transporte.

## Cambios por archivo

- `mobile/src/services/local-media.ts`: destinos persistentes únicos.
- `mobile/src/services/sqlite.ts`: migración 5 para múltiples imágenes.
- `mobile/src/services/task-repository.ts`: metadata + upload durable, recuperación, confirmación y borrado individual.
- `mobile/src/services/task-store.ts`: expone operaciones de reconciliación de imagen.
- `mobile/src/services/sync-service.ts`: ejecuta uploads solo con `remoteId`, conserva idempotencia y reconcilia.
- `mobile/src/services/attachments.ts`: errores tipados, timeout y multipart autenticado.
- `mobile/app/index.tsx`: creación siempre conserva fotografía local y muestra pendiente real.
- `mobile/src/services/photo-persistence.ts`: frontera compartida que copia antes de asociar y elimina huérfano si SQLite falla.
- `mobile/app/tasks/[id].tsx`: edición siempre conserva local antes de red; mensajes separados de persistencia.
- Tests: transporte, SQLite real, recuperación, identidades múltiples y sync.

## Fotografías pendientes existentes

Metadata local existente sin operación se recupera durante `initialize()`. Recuperación es acotada por fila, propietario e identidad de archivo; segundo inicio no duplica operación. URI temporal que ya no existe no puede recuperarse: operación conservará evidencia y upload fallará sin borrar metadata.

No se ejecuta limpieza masiva. Archivos huérfanos sin metadata no se adoptan porque no existe asociación segura con owner/task.

## Pruebas y resultados

- Suites focalizadas finales: 5 suites, 34 pruebas aprobadas.
- `yarn typecheck`: aprobado.
- `yarn typecheck:tests`: aprobado.
- `yarn lint`: aprobado.
- `yarn test`: backend 69/69; mobile 108/108.

## Evidencia API real

Contra Docker existente, sin imprimir credenciales/token:

- registro 201;
- `/api/auth/me` 200;
- creación de tarea 201;
- primer upload multipart 201;
- repetición con misma `Idempotency-Key` 201 y mismo imageId;
- listado devolvió una sola metadata;
- archivo protegido 200, bytes y MIME coincidentes.

Fue petición HTTP manual. No sustituye ejecución del cliente React Native, TaskStore completo ni Android físico.

## Límites nativos pendientes

Jest valida construcción de FormData, no implementación Android de `expo-file-system` ni transporte nativo. Documentación Expo confirma `Paths.document`, `Directory.create({ intermediates: true })` y `File.copy` como API moderna. Validación física sigue pendiente.

## Recarga y validación física

No requiere APK nuevo: cambios JavaScript y migración SQLite se aplican al recargar. Sí conviene comprobar archivo físico además de `TaskImage`: metadata remota sin archivo legible no demuestra persistencia completa.
## B.1.1 — Actualización inmediata de miniatura en Home

### Reproducción física inicial

Tras crear o editar una tarea con fotografía, la imagen persistía y aparecía en detalle, pero Home mostraba la tarjeta sin miniatura hasta navegar al detalle y volver.

### Causa exacta

Home mantenía `taskImageUrls` en un estado separado de `tasks`. Al guardar, `setTasks` ocurría antes de copiar la foto y asociar su metadata en SQLite. El efecto que relee imágenes podía terminar después y publicar un snapshot anterior, reemplazando la URI definitiva recién confirmada. Detalle provocaba otra lectura de SQLite y por eso corregía accidentalmente la vista.

### Cambios

- `mobile/app/index.tsx`: invalida lecturas de imágenes iniciadas antes de confirmar `persistCapturedPhoto`; publica únicamente la URI devuelta por `saveLocalImage`; conserva metadata local por encima de respuestas remotas sin adjunto.
- La actualización de Home sigue identificando tareas por `localId`, reemplazando edición y filtrando creación para mantener una sola tarjeta.
- Creación y edición agregan la miniatura solo después de copia física y metadata SQLite confirmadas. Eliminación existente en detalle mantiene su actualización inmediata; Home se actualiza al recargar su snapshot local.

### Fuente y regresiones

SQLite sigue siendo fuente inmediata. `persistCapturedPhoto` devuelve `LocalFile` desde `saveLocalImage`; Home usa su URI definitiva, no la URI temporal. Se cubren persistencia, identidades múltiples y recuperación en suites existentes; la regresión de carrera de snapshot queda cubierta por la invalidación de versión del estado de Home.

### Gates y límites

Gates B.1.1 se ejecutan al cierre y se registran con resultados actuales. No se ejecutan APK, Gradle, EAS, emulador ni Docker. La validación automatizada no reemplaza comprobar render y navegación en Development Build Android.

### Checklist físico pendiente

- Recargar Metro.
- Crear tarea con foto y confirmar miniatura inmediata.
- Abrir detalle y volver; confirmar ausencia de duplicados.
- Editar y agregar segunda foto; confirmar miniatura e imágenes previas.
- Si aplica, eliminar foto y confirmar recalculo inmediato.
## B.1.2 — Compatibilidad multipart Android

### Reproducción y causa

Android capturaba y persistía correctamente la fotografía, pero sincronización mostraba `Unsupported FormDataPart implementation` para operaciones pendientes. La combinación incompatible era `fetch` global de React Native + `FormData.append('file', { uri, name, type } as Blob)`: el cast solo satisfacía TypeScript y no creaba una parte `Blob` válida para el transporte nativo. El fallo ocurría al preparar/serializar el multipart, antes de obtener respuesta HTTP; esta conclusión proviene del error del cliente y de que no había respuesta HTTP observable, no de una prueba Android ejecutada en este bloque.

### Combinación corregida

`mobile/src/services/attachments.ts` usa `File` de `expo-file-system` para representar URI persistente y `fetch` de `expo/fetch` para enviar `FormData`. El campo sigue siendo `file`, coincidente con `imageUpload.single('file')` y `audioUpload.single('file')`. Se valida `file.exists`, se conserva nombre MIME en la operación existente, no se define `Content-Type` manualmente y se mantienen `Authorization` e `Idempotency-Key`.

### Operaciones y reconciliación

Las operaciones pendientes no se borran ni recrean. `sync-service.ts` conserva `operationId` como Idempotency-Key, `taskLocalId`, URI, MIME y nombre; reintento manual usa mismo registro. Operaciones `unknown` siguen en revisión. La copia local se elimina únicamente después de confirmación SQLite; respuestas repetidas permanecen idempotentes. `localId` y miniatura local se conservan durante fallo o sincronización.

### Cambios, pruebas y límites

- `mobile/src/services/attachments.ts`: transporte Expo coherente, `File` persistente y validación previa.
- `mobile/src/services/__tests__/attachments.test.ts`: mock explícito del transporte Expo y `File` tipo Blob; verifica headers, campo FormData y ausencia de Content-Type manual.
- Backend sin cambios: endpoint y middleware Multer ya exigen `file`.

Prueba focalizada: **2 suites, 7 tests aprobados**. No se ejecutó Docker ni cliente Android físico; no se declaran recuperadas operaciones `Test` o `Hdjdjd`, ni confirmado conteo PostgreSQL. Jest valida contrato JavaScript, no compatibilidad del bridge nativo.

### Checklist físico pendiente

1. Recargar Metro.
2. Pulsar Sincronizar una sola vez.
3. Confirmar que `Test` y `Hdjdjd` dejan de mostrar el error.
4. Verificar miniaturas durante y después de sincronización.
5. Consultar conteo `TaskImage` en PostgreSQL si Docker está disponible.
6. Sincronizar otra vez y confirmar que el conteo no aumenta.
## B.1.3 — Integridad filesystem/PostgreSQL y reconciliación local-remota

### Evidencia inicial

La fila `TaskImage` existía, pero su archivo indicado no estaba en `/app` ni `/tmp`; el volumen `task-manager-dev-uploads` sí estaba montado en `/app/backend/uploads`. HTTP devolvía 404. La fotografía afectada no se declara reparada automáticamente.

### Causa y corrección

El servicio aceptaba replay idempotente devolviendo `TaskMutation.responseBody` sin comprobar que `url`, tamaño y hash todavía correspondieran con un archivo físico. Además, antes del cambio no había verificación explícita del archivo final antes de responder éxito. Esto permitía metadata huérfana ante pérdida posterior del archivo o un estado previo incompleto.

`file-storage.service.ts` ahora verifica tamaño/hash con `fileIntegrity` antes de confirmar nuevos uploads. Un replay con misma clave, hash y metadata válida comprueba el archivo; si falta, `restoreFile` escribe el contenido recibido en la misma URL, conserva `TaskImage.id` y vuelve a verificar. Si la metadata no permite reparación segura, devuelve revisión explícita. La compensación elimina únicamente el archivo creado por ese intento cuando falla verificación o PostgreSQL; no existe transacción distribuida filesystem/PostgreSQL.

Cada upload usa nombre aleatorio propio de `saveFile`; el cleanup del replay elimina solo su path temporal/final propio. El registro durable de idempotencia conserva la identidad lógica. Ownership y campo multipart `file` no cambiaron.

### Mobile

Mobile conserva copia local hasta confirmación SQLite y la usa como fuente primaria mientras exista. La respuesta remota no elimina una miniatura local válida. `Reintentar` de imagen actualmente solo cambia estado de carga; la reparación concreta se realiza al pulsar Sincronizar con la misma operación idempotente. No se declara reparado el caso de teléfono hasta validación física.

### Cambios y evidencia

- `backend/src/services/file-storage.service.ts`: escritura dirigida para reparación y verificación física hash/tamaño.
- `backend/src/services/attachment.service.ts`: verificación antes de crear metadata y replay reparable.
- `backend/tests/attachment.test.ts`: mocks actualizados para frontera de storage.

Prueba focalizada backend: **19 tests aprobados**. No se ejecutó todavía integración PostgreSQL/filesystem real ni Docker HTTP; por tanto no se reporta evidencia real de `TaskImage`, GET 200, conteo o reparación del registro aportado. Jest valida lógica, no volumen Docker ni Android.

### Checklist físico pendiente

1. Reiniciar backend sin borrar volúmenes si se incorporó código de imagen y recargar Metro.
2. Abrir tarea afectada y comprobar fallback local.
3. Pulsar Reintentar o Sincronizar una vez.
4. Confirmar miniatura visible.
5. Comprobar archivo físico y GET 200.
6. Repetir sincronización y confirmar que no aparecen filas/archivos adicionales.
## B.1.3.1 — Preservación de adjuntos durante edición

### Hallazgo

La inspección del código confirma que `PATCH /api/tasks/:id` recibe únicamente campos escalares validados por `updateTaskSchema` y ejecuta `task.updateMany` sin nested writes sobre `images` ni `audios`. Por tanto, el `update` posterior no puede eliminar relaciones según el código actual. No se pudo confirmar todavía si existió un DELETE HTTP, cleanup externo o carrera en el entorno físico; la ausencia de `image-delete` en `TaskMutation` no lo demuestra.

La evidencia reportada conserva dos `image-create`, dos hashes distintos y dos archivos, pero solo una fila `TaskImage`. El archivo sin fila prueba metadata huérfana; no prueba por sí solo qué request la eliminó.

### Política corregida

Un PATCH parcial no interpreta ausencia como reemplazo y no toca adjuntos. Agregar B conserva A porque cada upload crea su propia fila y usa su propia clave idempotente. La eliminación sigue siendo explícita mediante `DELETE .../:imageId`, validando usuario y tarea antes de seleccionar la fila.

Replay de `image-create` ahora valida taskId, identidad, hash, tamaño y archivo. Si la mutación durable conserva evidencia suficiente y falta la fila, restaura la misma `TaskImage.id`; repetir replay no duplica metadata. No se ejecutó reparación destructiva sobre `Test`.

### Consistencia y límites

La compensación de upload elimina únicamente el archivo creado por ese intento cuando falla metadata o integridad. No existe transacción ACID entre PostgreSQL y filesystem. La eliminación explícita conserva ownership y resuelve paths bajo `UPLOAD_DIR`; fallos físicos/DB requieren retry y no se presentan como reparación física confirmada.

Mobile mantiene operaciones locales e idempotency keys existentes. La lista remota y local aún requiere validación física para declarar exactamente dos representaciones en Android; este cambio no afirma que el mensaje fantasma haya desaparecido.

### Pruebas y gates

Prueba focalizada ejecutada: `yarn workspace task-manager-backend test attachment.test.ts --runInBand` — **1 suite, 20 tests aprobados**. Incluye replay que restaura metadata con el mismo ID. No se ejecutaron todavía suites completas, typecheck, lint, Docker, PostgreSQL real ni Android físico. Puede requerirse `yarn rebuild:docker` si backend corre desde imagen sin source montado.

### Checklist físico pendiente

1. Reconstruir/reiniciar backend sin borrar volúmenes y recargar Metro si corresponde.
2. Abrir `Test` y ejecutar solo reparación segura/replay disponible.
3. Confirmar exactamente dos imágenes, sin mensaje fantasma.
4. Agregar tercera, sincronizar y verificar tres filas, archivos e imágenes.
5. Eliminar explícitamente una y verificar exactamente dos restantes.
6. Consultar filas y archivos únicamente con consultas de lectura.

Consultas:

```sql
SELECT COUNT(*) FROM "TaskImage" WHERE "taskId" = '34dd920a-575b-4127-ab72-5097d66ada4a';
SELECT id, "taskId", filename, "contentHash" FROM "TaskImage"
WHERE "taskId" = '34dd920a-575b-4127-ab72-5097d66ada4a';
```

```bash
find /app/backend/uploads/images -type f -maxdepth 1 | wc -l
```
## B.1.3.1 — Lifecycle asíncrono de `sync-service`

### Fallo y causa

La prueba aislada reprodujo dos fallos reales: el upload de imagen incrementaba `confirmed` y resolvía `run()` sin llamar `confirmImageUpload`; además, la operación continuaba contaminando el spy del siguiente test. La causa era productiva, no un fixture compartido: la rama `image` hacía `uploadImage`, incrementaba resumen y ejecutaba `continue`, omitiendo confirmación SQLite y `markOperation('confirmed')`.

La condición `!task.remoteId` sí hacía `continue` correctamente. La llamada inesperada del segundo test era efecto tardío del primer `run()`, no una ejecución válida para tarea sin remoto.

### Corrección

La rama de imágenes ahora espera secuencialmente `uploadImage`, `confirmImageUpload` y `markOperation('confirmed')` antes de incrementar `confirmed` y resolver `run()`. Si confirmación falla, la operación entra en manejo de error y no se contabiliza como confirmada. El lock singleton existente sigue liberándose mediante `finally`.

### Regresiones y gates

- Prueba focalizada: **1 suite, 4 tests aprobados**.
- Suite mobile: **10 suites, 108 tests aprobados**.
- `yarn typecheck`: aprobado.
- `yarn typecheck:tests`: aprobado.
- `yarn lint`: aprobado.
- `yarn test`: backend **7 suites/70 tests**, mobile **10 suites/108 tests**, todo aprobado.

No se ejecutaron Docker, EAS, Gradle ni validación Android física. Ya es seguro retomar prueba física de sincronización, manteniendo pendiente la confirmación del usuario sobre el estado visual y los conteos del volumen.
## B.1.3.2 — Entrega autenticada de imágenes

### B.1.3.2-A — backend protegido

Todos los `/uploads/...` devolvían 404 porque nunca existió entrega pública. Se mantuvo así deliberadamente: `express.static` expondría adjuntos sin JWT ni ownership.

Endpoint: `GET /api/tasks/:taskId/images/:imageId/file`. Está registrado bajo `/api/tasks/:id`, después de `express.json`, y aplica `requireAuth` más validación UUID Zod. La consulta `TaskImage.findFirst` combina `imageId`, `taskId` y `task.userId`; recursos ajenos, IDs cruzados e inexistentes devuelven 404 sin revelar existencia.

`imageFilePath` solo acepta metadata interna con forma `/uploads/images/<filename>`. Rechaza absolutos, `..`, separadores, otros directorios y null bytes; resuelve `realpath` tanto del directorio como del archivo, exige permanencia dentro de `UPLOAD_DIR/images`, bloquea symlinks de escape y exige archivo regular. Ningún path viene de params o query.

La respuesta usa streaming de `sendFile`, sin cargar archivo completo en memoria. Headers verificados: MIME desde metadata, `Content-Length` físico, `Cache-Control: private, no-cache` y `X-Content-Type-Options: nosniff`. Archivo o directorio ausente produce 404 controlado. Errores del stream se entregan al handler central.

Creación y listado serializan `contentUrl` derivado: `/api/tasks/<taskId>/images/<imageId>/file`. No contiene host, token, filename ni path físico. `url` legacy permanece como localizador interno; filas y `TaskMutation.responseBody` antiguas se adaptan al responder, sin migración, nuevo ID, nueva fila ni cambio de `requestHash`.

### Pruebas y gates

`backend/tests/image-file.test.ts` usa directorio temporal y archivos JPEG/PNG físicos. Prueba contenido byte a byte, MIME, tamaño, headers privados, repetición inmutable, JWT ausente/inválido, otro usuario, IDs cruzados, archivos ausentes, absolutos, traversal, separador alternativo, otro directorio, symlink de escape y dos imágenes independientes.

- Focalizada attachment solicitada: **1 suite, 20 tests aprobados**.
- Focalizada protegida conjunta: **2 suites, 30 tests aprobados**.
- Backend completo: **8 suites, 80 tests aprobados**.
- Mobile ejecutado solo por gate raíz: **10 suites, 109 tests aprobados**.
- Typecheck backend, typecheck tests y lint: aprobados.
- Gate raíz `yarn test`: aprobado.

### Docker real

Se reconstruyeron imágenes backend/migrate mediante `yarn rebuild:docker` y se recreó backend sin borrar volúmenes. Fixture propio: anónimo 401, propietario 200, otro usuario 404 y `/uploads` legacy 404. Descarga JPEG: 4 bytes, hash idéntico, MIME `image/jpeg`; conteos `TaskImage`/`TaskMutation` permanecieron iguales y archivo siguió presente.

**B.1.3.2-A — backend protegido: cerrado.**

### B.1.3.2-B — consumo mobile, fallback y Reintentar

#### Estado previo y causa mobile

Existía utilidad para construir `/file`, pero Home ignoraba `contentUrl` y detalle reconstruía siempre la ruta desde IDs. Además, `confirmImageUpload` borraba la fila `task_files`: el archivo físico podía permanecer, pero mobile perdía su URI local y mostraba otra representación remota. Detalle concatenaba arrays local/remoto sin reconciliar identidades y su Reintentar solo cambiaba estado, sin remontar `Image`.

#### Integración

`attachments.ts` valida respuestas con Zod, acepta `contentUrl` transicional y resuelve únicamente `/api/...` o HTTP(S). Rechaza `/uploads`, `file:`, `content:`, `data:`, `javascript:`, strings vacíos y paths de servidor. Host proviene de `EXPO_PUBLIC_API_URL`; token nunca entra en URL o SQLite.

Home consume `contentUrl` del listado y conserva primero la URI local. Detalle usa `reconcileImages`: vincula `localFileId` con `remoteImageId`, mantiene identidad/key local estable y produce una representación por fotografía confirmada. Metadata SQLite v6 añade `remote_image_id` y `content_url`; confirmar upload actualiza esos campos y conserva fila/URI/archivo local.

Estrategia elegida: `Image` de React Native con Bearer en `source.headers`. `AuthenticatedImage` recibe token vigente desde `AuthProvider`; identidad incluye owner. Prefiere local sin probar remoto. Si local falla, intenta remoto autenticado. Solo muestra error cuando fuentes viables fallaron; `onLoad` lo limpia. Estado, errores y retry pertenecen a cada imagen.

Reintentar limpia solo error afectado, reevalúa local/remoto, incrementa versión interna para remontar carga real y usa guardia síncrona contra doble pulsación. No cambia key externa, no sincroniza, no sube, no crea idempotency key.

#### Archivos y pruebas

Cambios mobile: `app/index.tsx`, `app/tasks/[id].tsx`, `src/services/attachments.ts`, `image-sources.ts`, `sqlite.ts`, `task-repository.ts`, `task-store.ts`, `sync-service.ts`, `ui/components.tsx`; regresiones en `image-sources.test.ts`, `authenticated-image.test.tsx`, `task-repository.test.ts` y `sync-service.test.ts`.

- Focalizadas mobile: **5 suites, 33 tests aprobados**.
- Mobile completo: **12 suites, 120 tests aprobados**.
- Typecheck mobile: aprobado.
- Typecheck tests: aprobado.
- Lint: aprobado tras retirar import no usado detectado por gate.
- Gate raíz: backend **8 suites/80 tests**, mobile **12 suites/120 tests**, aprobado.

Warnings observados: logs informativos preexistentes de auth en Jest. Sin fallos.

**B.1.3.2-B — mobile automatizado: cerrado.** No se ejecutaron EAS, Gradle ni emulador. Validación Android sigue pendiente.

#### Checklist físico

1. Recargar Metro e iniciar sesión.
2. Abrir `Test`; confirmar exactamente dos imágenes sin mensaje adicional.
3. Sincronizar; confirmar que ambas siguen visibles.
4. Cortar red, reabrir detalle y confirmar uso local.
5. Forzar fallo de una fuente y pulsar Reintentar; confirmar nueva carga solo de esa foto.
6. Restaurar red, cerrar/reabrir detalle y confirmar persistencia.
