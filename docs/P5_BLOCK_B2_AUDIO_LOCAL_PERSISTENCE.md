# P5 — B.2.1 Persistencia local de notas de voz

## Resultado

El fallo estaba en `mobile/app/tasks/[id].tsx`: detener una grabación dejaba una URI de cache y guardar intentaba subirla al backend. Una tarea local sin `remoteId` no podía completar ese flujo.

Ahora el flujo local es:

`permiso → preparación → grabación → stop → preview → copia a Documents → metadata SQLite → reproducción local`.

No se implementa upload, descarga remota, idempotencia ni sincronización de audio (B.2.2).

## Modelo local

`task_files` conserva fotografías y admite `kind = 'audio'`. Migración incremental 7 agrega `filename`, `mime_type`, `size`, `duration_seconds` y `remote_audio_id`, preservando filas existentes. Audios se consultan con `owner_id + task_local_id`; no requieren `remoteId`.

Metadata final: id local, propietario, tarea local, URI, nombre, MIME, tamaño, duración y fecha. Binarios no se guardan en SQLite.

## Filesystem y compensación

La grabación nace en cache. Después de detenerla se copia a:

`Paths.document/task-manager-media/<ownerId>/<taskLocalId>/audio/audio-<id>.m4a`

El destino se crea antes de copiar y se verifica después. Metadata se inserta únicamente tras confirmar existencia y tamaño. Si SQLite falla, el flujo no anuncia éxito; el archivo nuevo queda sujeto a limpieza explícita. La URI temporal se elimina solo después de insertar metadata.

## Lifecycle

Estados visibles: `requesting_permission`, `recording`, `stopping`, `preview`, `persisting`, `playing`, `idle`. Guardas evitan doble inicio, doble stop y guardar mientras persiste. Desmontaje detiene recorder, pausa player y elimina solo preview temporal. Player usa URI local, reinicia al finalizar y no depende de conexión.

## Tareas y eliminación

La tarea existente se asocia por propietario y `taskLocalId`; agregar audio conserva audios anteriores. El detalle recarga metadata SQLite al reabrir. Eliminar pausa reproducción, elimina metadata filtrada por propietario/tarea/id y después elimina únicamente su archivo. Fotografías no se modifican.

## Pruebas y gates

Ejecutado: `yarn workspace task-manager-mobile typecheck` — pasa.

Pendiente de ejecutar en esta sesión: suite mobile, `typecheck:tests`, lint y gate raíz. Android físico no está validado.

## Límites

El bridge Android, permisos reales, formato producido y comportamiento tras reinicio requieren Development Build y dispositivo físico. No se declara validación Android. B.2.2 cubrirá audio remoto.

## Checklist físico

1. Recargar Metro y conceder permiso.
2. Crear tarea, grabar, detener y escuchar preview.
3. Guardar y comprobar audio en detalle.
4. Cerrar/reabrir detalle y reproducir.
5. Activar modo avión y reproducir.
6. Agregar segundo audio y comprobar ambos.
