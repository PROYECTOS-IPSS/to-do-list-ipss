# P4 — Importación de tareas externas

## Fuente

Proveedor fijo: [JSONPlaceholder](https://jsonplaceholder.typicode.com/), API pública de demostración. Documentación y endpoint: [sitio oficial](https://jsonplaceholder.typicode.com/) y `GET https://jsonplaceholder.typicode.com/todos`.

Smoke test real: endpoint respondió registros JSON con `userId`, `id`, `title` y `completed`. `userId` externo nunca se usa como identidad de la cuenta local.

## Flujo

`Importar tareas` consulta la fuente, muestra snapshot validado, permite seleccionar registros y confirma guardado local. La pantalla identifica explícitamente tareas de demostración. Confirmación no vuelve a consultar API. Preview se invalida al perder usuario; respuestas tardías se ignoran.

La consulta usa HTTPS, timeout/cancelación, límite de 1 MiB y máximo 200 registros. Envelope debe ser arreglo. Registros individuales inválidos se rechazan y se informa cantidad; duplicados externos conservan primera aparición. Error de red, 429, 5xx, timeout o envelope inválido no se convierte en lista vacía.

Transformación: `id` → `externalId`, proveedor `jsonplaceholder`, título y `completed`; descripción, fechas, ubicación y multimedia quedan nulos/no inventados.

## Persistencia y deduplicación

SQLite guarda tarea, `source_provider`, `source_external_id` y `sync_operation` dentro de una misma transacción. Importadas quedan `pending_create`; lectura local ocurre después del commit. Clave local: `owner_id + provider + external_id`. Repetir importación omite; la edición local no se sobrescribe. Tareas manuales mantienen procedencia nula.

PostgreSQL conserva `externalProvider`/`externalId` opcionales con índice único por cuenta y origen. Creaciones concurrentes del mismo origen reconcilian a la tarea existente sin reemplazar contenido. Cuentas y proveedores distintos no colisionan. Eliminación pendiente no resucita automáticamente; solo tras completar eliminación puede volver a importarse.

## Integración P3

| Área | Resultado |
|---|---|
| Adaptador: válido, mixto, envelope, duplicados, vacío, límites, timeout, cancelación, red, 429/5xx, sin Authorization | focused Jest, 8 tests, pasa |
| SQLite/importación, aislamiento, deduplicación y recuperación | SQLite real, repository 10 tests, pasa |
| Backend provenance/manual/concurrencia | task suite, 15 tests, pasa |
| TypeScript, lint, suites completas | backend 69 tests; mobile 94 tests; typecheck/lint pasan |

Pendiente: prueba física Development Build Android y PostgreSQL aislado específico de importación si el entorno de base no está disponible. No se inicia P5.
