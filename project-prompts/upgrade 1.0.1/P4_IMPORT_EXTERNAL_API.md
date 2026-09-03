Ejecuta **P4 — Importación de tareas desde una API externa** en Task Manager Mobile.

Trabaja directamente en el repositorio: inspecciona, implementa, prueba y documenta. No te limites a entregar un plan. No avances a P5.

## Objetivo

Permitir consultar una API externa, seleccionar tareas e importarlas a la cuenta actual, guardándolas en SQLite y reutilizando la sincronización existente.

La importación debe validar datos externos, evitar duplicados y conservar lo importado ante fallos de red o reinicios.

## Contexto

P0–P3.1 reportan:

- Expo SDK 57, React Native y TypeScript.
- SQLite como fuente inmediata de lectura.
- Persistencia y aislamiento por usuario.
- Operaciones persistentes de sincronización.
- Idempotencia remota de tareas e imágenes.
- Control de versiones y resolución de conflictos.
- Sincronización manual y al volver a primer plano.
- Backend Express, Prisma y PostgreSQL.

Última verificación reportada:

- Backend: 7 suites / 69 tests.
- Mobile: 7 suites / 84 tests.
- Typecheck, lint y exportación Android aprobados.
- Verificación física pendiente.
- Disparador independiente de reconexión aún no confirmado.

Verifica el estado real antes de implementar.

## 1. Inspección y preservación

- Lee AGENTS.md y las instrucciones aplicables.
- Revisa rama, git status y cambios pendientes.
- Conserva el trabajo anterior.
- No hagas commits, pushes, publicaciones, reset ni clean.
- No cambies de rama si compromete modificaciones pendientes.
- Mantén npm y las versiones actuales.
- No sobrescribas .env ni expongas secretos.

Inspecciona:

- Modelo local/remoto de tareas.
- Creación de operaciones persistentes.
- Reglas de idempotencia.
- Autenticación y acceso local.
- Componentes visuales.
- Infraestructura de pruebas.

No abras una auditoría general de los bloques anteriores. Corrige únicamente defectos que impidan la importación o provoquen pérdida de datos, duplicación o acceso entre cuentas.

## 2. Elegir una fuente externa acotada

Usa una API pública de tareas de demostración, preferentemente JSONPlaceholder, si su documentación y disponibilidad actuales permiten cumplir el objetivo.

- Consulta su documentación oficial.
- Verifica el endpoint y esquema mediante una petición real de lectura, si el entorno tiene acceso.
- Si no está disponible, elige una alternativa pública documentada equivalente y explica la decisión.
- No uses cuentas, credenciales ni servicios de pago.
- No pidas al usuario que elija una API si puedes resolverlo con estas condiciones.
- No implementes un proveedor nuevo como sustituto de la API externa.

Debe quedar claro en la UI que son tareas de demostración de una fuente externa.

El userId de la API externa NO representa la identidad autenticada de nuestra aplicación. Las tareas importadas pertenecen exclusivamente a la cuenta local autorizada que realiza la importación.

No envíes tokens, identidad de nuestra cuenta ni datos personales al proveedor externo.

## 3. Adaptador y validación

Implementa un adaptador pequeño separado de la UI.

Debe:

- Consultar un endpoint fijo y documentado.
- Usar HTTPS.
- Manejar timeout y cancelación.
- Conservar status HTTP para clasificar errores.
- Validar la respuesta con Zod.
- Transformar registros externos al modelo de importación.
- Limitar el tamaño de respuesta procesado y la cantidad de tareas mostradas/importadas.
- No ejecutar HTML ni interpretar contenido externo como código.

Modelo mínimo de vista previa:

- Identificador estable del proveedor.
- Nombre estable del proveedor.
- Título.
- Estado completado.
- Descripción opcional si la fuente la proporciona.

No inventes fechas, ubicaciones, fotografías ni autores.

Para respuestas mixtas, puedes aceptar registros válidos y mostrar cuántos fueron rechazados. Define la política explícitamente y pruébala. Si el envelope completo es inválido, muestra error y no guardes tareas.

No conviertas errores de red, 429 o 5xx en una lista vacía exitosa.

## 4. Flujo de usuario

Añade un acceso “Importar tareas” usando navegación y componentes existentes.

Flujo:

1. Consultar la fuente externa.
2. Mostrar vista previa.
3. Permitir seleccionar tareas.
4. Identificar las que ya fueron importadas por esa cuenta.
5. Confirmar la importación.
6. Mostrar cantidades importadas, omitidas y rechazadas cuando corresponda.
7. Volver a la lista local con las tareas disponibles.

Incluye:

- Loading.
- Lista vacía válida.
- Error y reintento.
- Selección.
- Bloqueo durante confirmación.
- Feedback en español.

La consulta requiere conexión, pero la confirmación de una vista previa ya cargada puede guardarse localmente si la sesión local sigue autorizada.

No vuelvas a consultar la API al confirmar si eso puede cambiar silenciosamente lo que el usuario seleccionó. Usa el snapshot validado de la vista previa.

Si cambia la cuenta o se cierra sesión:

- Invalida la vista previa y la selección.
- Ignora respuestas tardías.
- No importes el snapshot anterior a otra cuenta.

## 5. Importación atómica en SQLite

Reutiliza el repositorio y la creación de operaciones de P3.

Cada tarea importada debe:

- Tener identificador local propio.
- Pertenecer al usuario autorizado.
- Conservar provenance mínima: proveedor e identificador externo.
- Quedar pendiente de creación remota.
- Tener una operación persistente con clave idempotente.
- Aparecer en la UI únicamente después de confirmar la transacción local.

Guarda las tareas, sus referencias externas y las operaciones en una misma transacción, o una solución con garantías equivalentes.

Para un lote, usa una política clara: preferentemente una transacción para todos los registros nuevos válidos seleccionados.

Si falla:

- No dejes tareas sin operación de sincronización.
- No dejes referencias de importación sin tarea.
- No anuncies éxito parcial si la transacción hizo rollback.
- Conserva la selección para permitir reintentar.

No envíes peticiones remotas dentro de una transacción SQLite.

## 6. Deduplicación de importaciones

La identidad externa debe estar separada de la clave idempotente de sincronización.

Evita importar repetidamente el mismo registro para una misma cuenta mediante una restricción persistente, no solo deshabilitando un botón.

Clave conceptual:

- ownerId + provider + externalId.

Garantiza:

- Dos confirmaciones simultáneas no crean duplicados.
- Repetir una importación tras reiniciar no crea duplicados.
- Dos cuentas pueden importar el mismo registro de forma independiente.
- Dos proveedores con el mismo externalId no colisionan.
- Reimportar no sobrescribe una tarea que el usuario editó.
- Un cambio posterior en el proveedor no modifica automáticamente la tarea importada.

Define qué ocurre si la tarea importada se elimina. Una política válida es permitir una nueva importación solo después de completar su eliminación, sin resucitar una eliminación pendiente. Documenta y prueba la política elegida.

La garantía de deduplicación debe mantenerse en la cuenta al sincronizar desde distintos dispositivos:

- Revisa si el backend ya conserva identidad externa.
- Si no, añade campos o un registro de procedencia y una restricción única por usuario/proveedor/identificador externo.
- Asegura que dos importaciones concurrentes con claves de operación diferentes no creen dos tareas remotas para el mismo origen.
- Cuando el origen ya exista, reconcilia con la tarea existente sin sobrescribir su contenido con el snapshot importado.
- No conviertas cualquier 409 en “ya importada”: distingue códigos de error.

Esta tarea autoriza las extensiones mínimas de contrato y migraciones Prisma necesarias para esa garantía. Conserva compatibilidad con tareas manuales, que no tienen procedencia externa.

## 7. Integración con P3

- Reutiliza sync_operations y el ejecutor existente.
- No construyas otra cola.
- No hagas POST directo desde la pantalla de importación.
- La importación es exitosa localmente aunque la sincronización esté temporalmente pausada.
- Distingue “Importadas en este dispositivo” de “Sincronizadas”.
- Si hay sesión remota válida, puedes solicitar ejecución al coordinador existente después del commit local.
- Si solo hay acceso local, conserva pendientes sin enviar como si existiera autenticación remota.
- Un reintento tras respuesta perdida reutiliza la identidad de operación.
- Las tareas manuales y las importadas deben seguir siendo editables mediante los flujos actuales.

No añadas actualización periódica desde el proveedor, importación de fotos, audio ni sincronización bidireccional con la API externa.

## 8. Pruebas obligatorias

### Adaptador externo

Usa fetch simulado en pruebas deterministas:

- Respuesta válida y transformación.
- Envelope inválido.
- Registros inválidos según la política elegida.
- IDs externos duplicados en una respuesta.
- Timeout.
- Cancelación.
- Error de red.
- HTTP 429 y 5xx.
- Respuesta vacía válida.
- Límites de cantidad/tamaño.
- Ningún token de nuestra app enviado al proveedor.

La petición real inicial sirve como smoke test documentado, no como dependencia obligatoria de cada ejecución de Jest.

### SQLite real

Usa el repositorio real y sus migraciones:

- Importar un lote guarda tareas, procedencia y operaciones.
- Reabrir la base conserva esos datos.
- Repetir la importación no duplica.
- Confirmaciones concurrentes no duplican.
- Cuentas distintas quedan aisladas.
- IDs iguales de proveedores diferentes no colisionan.
- Rollback evita registros parciales.
- Reimportar no sobrescribe ediciones locales.
- Política de eliminación/reimportación.

### Backend con PostgreSQL real

Usa base aislada:

- Procedencia opcional conserva creación manual existente.
- Unicidad por cuenta y origen externo.
- Dos operaciones concurrentes diferentes para el mismo origen no duplican tareas.
- Reconciliación no sobrescribe una tarea remota editada.
- Otra cuenta puede importar el mismo origen.
- Datos de procedencia inválidos se rechazan.
- Replay idempotente sigue funcionando.

### Hook/UI e integración

- Selección y confirmación.
- Elementos ya importados.
- Doble pulsación.
- Fallo local conserva selección y muestra error.
- Cambio de cuenta invalida preview.
- Respuesta tardía no modifica otra sesión.
- Vista previa cargada se puede importar localmente después de perder red.
- Importación genera operaciones consumibles por el ejecutor real.
- Respuesta perdida al sincronizar no duplica.
- Resultado local no se presenta falsamente como sincronizado.

Mockea límites externos, no la lógica que afirmas verificar.

Evita sleeps arbitrarios, snapshots como única evidencia y tests que solo cuenten llamadas.

## 9. Verificación final

Ejecuta:

- Pruebas nuevas.
- Suites mobile y backend.
- Integración SQLite y PostgreSQL real.
- npm test desde raíz.
- npm run typecheck desde raíz.
- npm run lint desde raíz.
- Prisma validate y estado de migraciones en el entorno apropiado.
- Exportación Android desde mobile.

No uses bases reales para pruebas destructivas. No ejecutes resets.

Si falta acceso a Internet o PostgreSQL de pruebas, termina lo verificable y registra el bloqueo concreto. No declares comprobada una integración real mediante mocks.

No compiles Android de nuevo salvo necesidad nativa o disponibilidad de dispositivo para una validación concreta. No ejecutes procesos pesados simultáneamente ni uses EAS remoto.

## 10. Documentación y cierre

Crea `docs/P4_EXTERNAL_TASK_IMPORT.md` con:

- Proveedor elegido y enlaces a documentación oficial.
- Resultado del smoke test externo o bloqueo concreto.
- Flujo de usuario.
- Esquema externo y transformación.
- Límites y política ante registros inválidos.
- Persistencia, procedencia y deduplicación local/remota.
- Política de eliminación/reimportación.
- Integración con P3.
- Migraciones y compatibilidad con tareas manuales.
- Tabla de pruebas y límites simulados/reales.
- Comandos, resultados y conteos finales exactos.
- Verificación física pendiente.

Actualiza README y AGENTS.md cuando corresponda.

Finaliza indicando funcionalidades implementadas, garantías verificadas, archivos relevantes y pendientes. Mantén registrados los pendientes anteriores sin declararlos resueltos por este bloque.

No avances a P5.
