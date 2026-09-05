# BLOQUE A.2 — Causa raíz de autenticación y sincronización

## 1. Reproducción inicial

Antecedente recibido: tras registro e inicio de sesión, una creación con datos de tarea y una sincronización manual mostraban 401; después una tarea nueva seguía mostrando el mensaje de la operación anterior. La demora no tenía medición física.

## 2. Causa confirmada

`mobile/src/services/tasks.ts` construía la petición así: primero definía `headers` con `Authorization` y después aplicaba `...options`. Las mutaciones pasan `options.headers` para `Idempotency-Key`/`If-Match`; ese segundo `headers` reemplazaba el objeto completo y eliminaba `Authorization`. Login y `/api/auth/me` no sufrían esto porque auth combina headers después de sus opciones.

Resultado: backend recibía mutaciones protegidas sin Bearer y `requireAuth` devolvía 401 real. El mismo defecto existía en `mobile/src/services/attachments.ts` para uploads con headers de opciones.

## 3. Endpoint afectado

Principalmente `POST /api/tasks` (también PATCH/DELETE cuando llevan opciones de headers). Uploads de adjuntos podían presentar el mismo defecto. Middleware backend exige `Authorization: Bearer <token>` y verifica JWT sin cambios.

## 4. Por qué aparecía A1-online

La operación de A1-online permanecía durablemente en `failed` después del 401. La acción manual usa `{ force: true }`, que vuelve a seleccionar operaciones fallidas; por orden de `created_at`, A1-online aparece antes de A1-solo-texto. No era una prueba de que la nueva tarea hubiera sido enviada ni un mensaje residual del backend.

## 5. Demora

No se ejecutó instrumentación temporal ni reproducción contra API Docker desde este entorno. El código actual espera backoff para operaciones con intentos previos y también espera `retryAfterAt`; por tanto no se atribuye demora a PostgreSQL. Se confirmó una espera potencial de hasta 30 s por política existente, pero no se midió duración física en teléfono.

## 6. Cambios por archivo

- `mobile/src/services/tasks.ts`: aplica `...options` antes de combinar headers; preserva Bearer junto con headers de mutación.
- `mobile/src/services/attachments.ts`: misma corrección para headers de uploads.
- `mobile/src/ui/components.tsx`: feedback sin fila horizontal; texto puede ocupar varias líneas en contenedor adaptable.
- `mobile/app/index.tsx`: aviso general debajo de “Tu espacio” y estado visible durante sincronización; elimina restricción de fila que truncaba el aviso.
- `mobile/src/services/__tests__/tasks.test.ts`: regresión real del cliente para Bearer + Idempotency-Key.

## 7. Recuperación

No se modificó política previa: 401 se clasifica como fallo no reintentable automático y detiene el lote; operación queda conservada. Sincronización manual fuerza selección de `failed`, permitiendo recuperación tras autenticación vigente. No se habilitan operaciones inciertas ni se duplica creación.

## 8. Evidencia

- Prueba focalizada ejecutada: `tasks.test.ts`, 2/2 aprobadas. Incluye captura del request construido y verifica ambos headers.
- `yarn workspace task-manager-mobile typecheck`: aprobado.
- No se ejecutó API Docker, cliente móvil físico, suite completa ni gates de backend; no se afirma evidencia de extremo a extremo.

## 9. Gates

- Focalizada: aprobado.
- Mobile typecheck: aprobado.
- `typecheck:tests`: no ejecutado.
- lint: no ejecutado.
- suite raíz: no ejecutada.

## 10. Feedback

Mensajes ya no comparten espacio horizontal con badge. `AppText` queda en contenedor adaptable y puede envolver texto. Sincronización muestra “Sincronizando cambios pendientes…” mientras está activa. La corrección evita acumular el mismo aviso en el encabezado y dentro de “Tus tareas”.

## 11. Limitaciones y checklist físico

Pendiente ejecutar API real con cuenta de prueba, medir fases solicitadas y validar recuperación en dispositivo. No se modificaron secretos, datos locales, volúmenes, dependencias ni APK.
