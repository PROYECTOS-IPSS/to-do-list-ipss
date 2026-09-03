Ejecuta **P3 — Sincronización segura de tareas** en Task Manager Mobile.

Inspecciona, diseña, implementa, prueba y documenta directamente en el repositorio. No te limites a proponer un plan. No avances a P4.

## Objetivo

Sincronizar tareas pendientes entre SQLite y la API/PostgreSQL sin perder cambios, duplicar operaciones ni mezclar cuentas.

Debe funcionar ante desconexiones, respuestas perdidas, cierre de la aplicación, reintentos y modificaciones concurrentes.

Prioriza una implementación pequeña, verificable y adecuada al proyecto académico.

## Contexto

P2/P2.1 reportan:

- SQLite mediante expo-sqlite.
- LocalTaskRepository compartido entre aplicación y pruebas con node:sqlite.
- Tablas tasks y task_files, con ownerId.
- Estados clean, pending_create, pending_update y pending_delete.
- remote_outcome=none/unknown.
- Fotografías locales persistentes.
- Identidad local validada en SecureStore.
- Separación entre acceso local y autenticación remota.
- Preservación de pendientes ante cargas remotas.
- Sin ejecutor de sincronización ni reintentos automáticos.

Últimos resultados reportados:

- Mobile: 5 suites / 79 tests.
- Backend: 7 suites / 61 tests.
- Typecheck y exportación Android aprobados.
- Build y verificación física pendientes.
- Falta acreditar lint desde raíz.

Verifica el código actual antes de usar estos datos como base.

## 1. Preservación y alcance autorizado

- Lee AGENTS.md y las instrucciones aplicables.
- Inspecciona Git y conserva cambios anteriores.
- No cambies de rama de manera que comprometa trabajo pendiente.
- No hagas commits, pushes, publicaciones, reset ni clean.
- Mantén npm y Expo SDK 57.
- No sobrescribas .env ni muestres secretos.

Esta tarea autoriza cambios acotados en:

- SQLite y sus migraciones.
- Servicios, hooks y UI necesarios para sincronizar.
- Backend, contratos API y migraciones Prisma necesarios para idempotencia y control de concurrencia.
- Pruebas y documentación.

Actualiza restricciones antiguas de AGENTS.md que contradigan este alcance, conservando las demás.

No actualices versiones mayores del backend ni añadas infraestructura externa, Redis, brokers, microservicios o procesos de background nativos.

No ejecutes migraciones destructivas ni resets sobre bases existentes. Las pruebas deben usar bases aisladas. Si necesitas credenciales o acceso que no están disponibles, completa lo posible y documenta el bloqueo.

## 2. Diseño previo, seguido de ejecución

Antes de editar, inspecciona:

- Modelo local y remoto.
- Todas las rutas actuales de escritura online y offline.
- Tratamiento de fotografías.
- AuthProvider y cambio de cuentas.
- Contratos de errores y ownership.
- Infraestructura de tests.

Escribe un diseño breve en `docs/P3_SYNC_DESIGN.md` con:

- Fuente local de lectura de la UI.
- Representación persistente de operaciones.
- Identidad estable de cada operación.
- Idempotencia del servidor.
- Control de versiones y conflictos.
- Reintentos y resultados inciertos.
- Aislamiento por usuario.
- Dependencias entre creación de tarea y fotografías.
- Política para pendientes heredados de P2.

Después continúa implementando sin pedir aprobación para decisiones rutinarias ya autorizadas.

## 3. Idempotencia real en el backend

Garantiza que repetir la misma operación lógica produzca como máximo una mutación.

Puedes usar un registro de operaciones o una solución equivalente, siempre que:

- La clave sea estable, generada antes del primer envío y persistida localmente.
- El servidor la asocie al usuario autenticado.
- La misma operación con el mismo contenido devuelva el resultado previamente registrado.
- Reutilizar una clave con contenido diferente produzca un error explícito.
- La comprobación y la mutación sean atómicas en PostgreSQL.
- Dos solicitudes concurrentes con la misma clave no creen dos tareas.
- La respuesta pueda recuperarse tras perderse la respuesta original.
- No se emplee un mapa en memoria como única garantía.

Incluye creación, actualización y eliminación. No supongas que PATCH o DELETE por sí solos resuelven todos los casos de respuesta perdida.

Conserva los contratos existentes cuando sea posible. Cualquier extensión debe quedar documentada y cubierta por pruebas.

## 4. Operaciones locales y protección frente a cierres

Implementa una representación persistente de operaciones pendientes.

Garantiza:

- Guardado atómico de la intención local y sus metadatos de envío.
- Payload e identificador de operación estables después del primer intento.
- Recuperación tras reiniciar.
- Una operación nueva para una edición nueva; no cambies el payload de una clave ya enviada.
- Secuencia coherente por tarea.
- Ningún cambio se marque limpio antes de confirmar su aplicación remota.
- El acuse de una operación antigua no borre ediciones locales posteriores.
- Protección contra dos ejecutores concurrentes.
- Dependencias explícitas para tareas aún sin identificador remoto.

Unifica las escrituras online y offline bajo estas garantías. Evita dejar rutas online que omitan idempotencia.

Puedes simplificar o combinar operaciones aún no enviadas cuando sea seguro y esté probado. Nunca combines a ciegas operaciones inciertas o ya enviadas.

## 5. Pendientes heredados con resultado incierto

P2 puede contener `remote_outcome=unknown` de peticiones enviadas sin clave de idempotencia.

No inventes retrospectivamente una clave y reenvíes suponiendo que eso evita duplicados.

Distingue:

- Operaciones nuevas protegidas por idempotencia.
- Pendientes anteriores nunca enviados.
- Operaciones anteriores con resultado remoto incierto.

Para las operaciones heredadas inciertas:

- Intenta reconciliar únicamente si existe evidencia suficiente.
- No uses coincidencias de título o descripción como prueba inequívoca.
- Si no puede determinarse el resultado, conserva los datos y muestra un estado que requiere revisión.
- No las reenvíes automáticamente.
- Documenta el procedimiento de resolución.

No marques esos casos como sincronizados para vaciar la lista.

## 6. Control de concurrencia y conflictos

Implementa versionado remoto o una condición equivalente para detectar modificaciones concurrentes.

Requisitos:

- Actualizar o eliminar debe comprobar la versión esperada de forma atómica.
- Una versión desactualizada produce conflicto explícito.
- No uses “última escritura gana” silenciosamente.
- Conserva la versión local y la remota necesaria para explicar el conflicto.
- Permite resolverlo con una UI mínima en español.

Como política sencilla:

- “Usar versión del servidor”.
- “Conservar mis cambios”, mediante una operación nueva sobre una versión remota actualizada.

Si el servidor vuelve a cambiar, detecta el nuevo conflicto. No fuerces sobrescrituras incondicionales.

Define también:

- Eliminación remota frente a edición local.
- Eliminación local frente a edición remota.
- Tarea eliminada durante la sincronización.
- Doble eliminación.

No recrees automáticamente una tarea eliminada.

## 7. Descarga y reconciliación

La sincronización debe obtener cambios remotos además de subir pendientes.

Para este proyecto puedes usar una consulta completa si su contrato garantiza que la lista es completa. No añadas cursores o streaming sin necesidad.

Garantiza:

- Reconciliación siempre limitada al usuario autenticado.
- Conservación de pendientes y conflictos.
- Ausencia de borrados por respuestas parciales, inválidas o fallidas.
- Tratamiento explícito de eliminaciones remotas.
- Validación de respuestas antes de modificar SQLite.
- Protección frente a respuestas tardías después de cambiar de cuenta.
- Una descarga no sobrescribe cambios locales realizados mientras estaba pendiente.

## 8. Ejecución, autenticación y reintentos

Implementa:

- Botón manual “Sincronizar”.
- Intento al recuperar conexión y al volver a primer plano, si existe una sesión remota válida.
- Un solo ejecutor activo.
- Reintentos limitados con backoff para fallos recuperables.
- Pausa al perder autenticación.
- Cancelación o invalidación segura al cerrar sesión o cambiar de cuenta.

La conectividad es una señal para intentar, no garantía de acceso al servidor.

Clasifica errores:

- Red, timeout y ciertos 5xx: recuperables.
- 429: respetar Retry-After cuando exista.
- 401: detener envíos y solicitar autenticación.
- 403 y validación: error explícito, sin bucle de reintentos.
- Conflicto: requiere resolución.
- Respuesta perdida: repetir solo con la misma identidad de operación protegida.

No implementes tareas en segundo plano cuando la app está cerrada. Los pendientes deben sobrevivir para continuar al abrirla.

No permitas que acceso local equivalga a autenticación remota válida.

## 9. Fotografías

Incluye subida de fotografías pendientes asociadas a tareas:

- Primero confirma la creación remota de la tarea.
- Conserva una identidad estable por adjunto/operación.
- Evita duplicados ante respuesta perdida.
- No marques el archivo sincronizado antes de confirmar.
- Conserva el archivo local durante errores recuperables.
- Maneja archivo ausente con un error visible y controlado.
- Verifica ownership de tarea y adjunto en backend.
- No elimines archivos de otra cuenta.

El almacenamiento físico y PostgreSQL no comparten una transacción. Define cómo evitas metadata inconsistente y archivos huérfanos al fallar la operación.

No añadas audio offline. Conserva el funcionamiento online actual.

## 10. UI mínima

Muestra estados comprensibles:

- Pendientes.
- Sincronizando.
- Sincronizado.
- Error recuperable.
- Conflicto.
- Resultado anterior que requiere revisión.

Mantén diseño y componentes existentes.

No anuncies éxito global si quedaron operaciones con error o conflicto. Permite continuar trabajando localmente mientras se sincroniza, conservando las ediciones nuevas.

## 11. Pruebas obligatorias

Usa código real, SQLite real para persistencia y PostgreSQL real para las garantías transaccionales del backend.

Los mocks pueden simular transporte, tiempo, conectividad y sistema de archivos. No sustituyen las pruebas de idempotencia concurrente en PostgreSQL.

### Backend

- Dos solicitudes concurrentes con la misma clave crean una sola tarea.
- Repetir una operación devuelve su resultado.
- Misma clave con payload diferente se rechaza.
- Claves y resultados quedan aislados por usuario.
- Fallo transaccional no deja una operación registrada sin su mutación, ni viceversa.
- Actualización con versión desactualizada produce conflicto.
- Eliminación y repetición de eliminación siguen el contrato.
- Subida de foto repetida no duplica metadata.
- Acceso a tareas o adjuntos de otra cuenta se rechaza.

### Cliente y SQLite

- Crear offline, reiniciar y sincronizar.
- Servidor aplica la operación, se pierde la respuesta y el reintento no duplica.
- Cierre entre confirmación remota y guardado local.
- Edición local durante una operación en curso.
- Dos disparadores de sincronización ejecutan un solo envío lógico.
- Reintentos respetan límites y backoff.
- HTTP no recuperable no entra en bucle.
- 401 pausa sin perder pendientes.
- Logout/cambio de cuenta invalida respuestas tardías.
- Descarga conserva pendientes y conflictos.
- Eliminaciones no resucitan.
- Operación heredada incierta no se reenvía automáticamente.
- Foto espera la creación remota.
- Fallo de foto conserva la tarea y el archivo pendiente.
- Resolución de conflicto genera una operación nueva y vuelve a comprobar versión.

Usa promesas controladas y relojes simulados; evita sleeps arbitrarios.

Registra ejecución roja antes de corregir defectos cuando corresponda. No inventes evidencia ni pruebes una implementación paralela creada para tests.

## 12. Verificación final y límites de recursos

Ejecuta:

- Pruebas nuevas.
- Suites mobile y backend.
- Integración con PostgreSQL aislado.
- npm test desde raíz.
- npm run typecheck desde raíz.
- npm run lint desde raíz.
- Comprobación de dependencias Expo.
- Exportación Android.

No uses la base habitual de desarrollo para pruebas destructivas. Si no hay PostgreSQL de pruebas disponible, prepara configuración reproducible y declara esas verificaciones bloqueadas; no las sustituyas por mocks y las declares aprobadas.

No ejecutes procesos pesados simultáneamente. Si se requiere compilar Android, limita Gradle a dos workers. No uses EAS remoto.

Si hay dispositivo disponible, verifica crear offline, reiniciar, reconectar y comprobar una sola tarea en backend. Registra por separado pruebas físicas pendientes.

## 13. Documentación y cierre

Crea `docs/P3_SYNC_IMPLEMENTATION.md` con:

- Arquitectura final y decisiones.
- Migraciones locales y remotas.
- Contrato de idempotencia y versiones.
- Estados y transiciones.
- Política de reintentos y conflictos.
- Tratamiento de operaciones heredadas inciertas.
- Fotografías y fallos parciales.
- Tabla de pruebas indicando SQLite real, PostgreSQL real, mocks y dispositivo.
- Comandos, resultados y conteos exactos.
- Limitaciones y verificaciones pendientes.

Actualiza README, AGENTS.md y el diseño para que coincidan con la implementación final.

Corrige las inconsistencias documentales de P2.1:

- Exportación aprobada no debe seguir figurando pendiente.
- Registra lint raíz con su resultado real.
- Describe la validación de ownership en saveLocalImage como corrección funcional.

Finaliza indicando lo implementado, lo verificado y cualquier garantía todavía incompleta. No declares P3 cerrado si idempotencia, aislamiento o conservación de cambios no están demostrados.

No avances a P4.
