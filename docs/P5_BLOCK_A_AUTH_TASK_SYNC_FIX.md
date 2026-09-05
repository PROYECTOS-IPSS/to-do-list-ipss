# Block A — Auth, tareas y sincronización

## Diagnóstico

1. `mobile/src/services/tasks.ts` construye `Authorization: Bearer <token>` desde token recibido por llamada. No usa token persistente oculto ni AsyncStorage.
2. `mobile/src/services/task-store.ts` persistía creación/edición/borrado local antes de enviar API, pero un `401` remoto se relanzaba. `mobile/app/index.tsx` solo actualizaba lista tras recibir resultado, por lo que tarea podía existir en SQLite y desaparecer visualmente hasta recargar.
3. Ese mismo `401` producía feedback falso: “No se guardó localmente”. El estado durable sí existía; fallo era de autorización del envío remoto.
4. `mobile/src/services/sync-service.ts` detenía lote tras `401`, pero interfaz reducía causa a “Sincronización requiere revisión”, sin título ni acción sugerida.
5. No se encontró evidencia para cambiar backend, esquema Prisma, ownership, endpoints ni contrato JWT.

## Corrección aplicada

- Mutaciones locales conservadas cuando API responde `401`.
- `TaskStore` devuelve tarea local pendiente con `requiresAuth` para que UI actualice lista inmediatamente.
- UI informa: tarea guardada localmente; sesión no autoriza envío; iniciar sesión y sincronizar.
- Sincronización continúa pausada después del primer `401`, sin bucle automático.
- Resultado de sync incluye mensajes acotados con título cuando existe; distingue sesión no autorizada, conflicto, resultado remoto incierto e imagen pendiente de revisión.
- No se almacenan ni imprimen tokens, contraseñas ni payloads sensibles.

## Validación histórica y actualización

- Primera ejecución de Block A registró un error de typecheck en `mobile/app/import.tsx:30` y una edición incompleta temporal de `TaskLoadResult`; ambos estados ya no reproducen en checkout actual.
- Verificación actual de Block A1: `yarn workspace task-manager-mobile typecheck` OK.
- Verificación actual focalizada: 3 suites, 13 tests, OK.
- No se ejecutó Android, EAS ni emulador.
- API real de negocio no se ejercitó; Docker solo confirmó `/health` y `/ready` con `200`.

## Límite conocido

Un `401` queda en operación `failed` para impedir reintento automático. Tras recuperar sesión, usuario debe pulsar Sincronizar con acción manual existente; no se agregan endpoints ni colas nuevas.
