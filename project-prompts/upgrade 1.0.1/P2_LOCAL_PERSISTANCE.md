Ejecuta **P2 — Persistencia local por usuario** en Task Manager Mobile.

Trabaja directamente en el repositorio: inspecciona, implementa, prueba y documenta. No te limites a proponer un plan. No avances a P3.

## Objetivo

Permitir consultar y gestionar tareas localmente, conservarlas al reiniciar la aplicación sin conexión y mantener los datos separados por usuario.

Usa SQLite mediante expo-sqlite, con una versión compatible con el Expo SDK instalado.

P3 implementará la sincronización. En P2 debes conservar los cambios locales pendientes, pero no enviarlos automáticamente ni implementar reintentos o resolución de conflictos.

## Contexto

P0 migró a Expo SDK 57. P1 corrigió cámara, eliminación de GPS y restauración de sesión, con hooks y servicios reales cubiertos por pruebas.

Resultados reportados de P1:

- Backend: 7 suites / 61 tests.
- Mobile: 4 suites / 73 tests.
- npm ci, typecheck, lint y exportación Android aprobados.
- Pruebas físicas pendientes.

Verifica el estado actual; no tomes estos datos como garantía.

El usuario decidió continuar con P2 y dejar la revisión de bugs y observaciones anteriores para el final. Regístralos sin ampliar este bloque. Corrige únicamente los que impidan implementar o verificar P2.

## 1. Inspección y alcance autorizado

- Lee AGENTS.md y las instrucciones aplicables.
- Revisa Git y conserva todos los cambios anteriores.
- No cambies de rama si eso compromete trabajo pendiente.
- No hagas commits, pushes, reset, clean ni publicaciones.
- Mantén npm y Expo SDK 57.
- No sobrescribas .env ni muestres secretos.
- Inspecciona los flujos actuales de tareas, autenticación, fotos y audio antes de diseñar la persistencia.

Esta solicitud autoriza explícitamente persistencia offline y cambios de esquema SQLite local. Actualiza las restricciones antiguas de AGENTS.md que prohíban esa funcionalidad para reflejar P2. No elimines restricciones ajenas al alcance.

No cambies el esquema Prisma, sus migraciones ni los contratos del backend.

## 2. Política funcional: online y offline

Define y documenta una política explícita que conserve el funcionamiento online existente.

Como mínimo:

- Las tareas obtenidas correctamente del backend quedan disponibles localmente para ese usuario.
- Sin conexión, el usuario puede consultar, crear, editar, completar, reabrir y eliminar tareas locales.
- Los cambios locales sobreviven a cierre y reinicio.
- Un error de escritura local nunca se presenta como guardado exitoso.
- Las tareas modificadas offline muestran un estado comprensible, por ejemplo “Pendiente de sincronización”.
- Al reconectar no se pierden ni sobrescriben esos cambios.
- No se anuncia sincronización exitosa si solo hubo persistencia local.

En P2, las operaciones online sobre tareas remotas sin cambios pendientes pueden conservar el flujo remoto existente, actualizando SQLite tras una respuesta exitosa.

Las tareas creadas offline y las tareas con cambios locales pendientes deben conservarlos hasta P3. No envíes sus cambios ni permitas que una actualización de la lista remota los sustituya silenciosamente.

Distingue errores de red de respuestas HTTP:

- Un 400, 401 o 403 no debe convertirse silenciosamente en una operación offline exitosa.
- Un error de red al enviar una mutación puede tener resultado remoto incierto: el servidor pudo aplicarla sin que llegara la respuesta.
- Conserva esa incertidumbre cuando corresponda y no reenvíes automáticamente la operación.

No uses únicamente un indicador de conectividad como prueba de que la API está disponible.

## 3. Modelo y repositorio SQLite

Separa persistencia, reglas de tareas y presentación. Reutiliza la arquitectura actual y evita introducir capas sin propósito.

Implementa:

- Inicialización de SQLite.
- Versionado del esquema y migraciones locales.
- Consultas parametrizadas.
- Transacciones para cambios que deban ser atómicos.
- Identificador local estable y asociación opcional con identificador remoto.
- Propietario obligatorio en cada tarea.
- Campos actuales de tarea, incluida ubicación.
- Fechas coherentes y metadatos mínimos de cambios pendientes.
- Eliminación lógica para tareas remotas pendientes de eliminación, de modo que P3 pueda conocer esa intención.
- Identificadores locales sin colisiones razonables, usando una API compatible con el entorno.

No implementes todavía una cola ejecutora, workers, sincronización automática, políticas de conflicto ni cambios del backend.

Todas las operaciones de lectura, escritura y borrado deben quedar limitadas por usuario. No basta con filtrar en la interfaz.

Al actualizar datos desde el backend:

- Actualiza las tareas limpias de ese usuario.
- Conserva las tareas y eliminaciones pendientes.
- Evita duplicar registros por identificador remoto.
- No borres datos por recibir una respuesta parcial o por fallar una petición.
- Explica cómo manejas tareas ausentes de una lista remota completa.

## 4. Acceso local y sesión

P1 conserva el token ante errores temporales, pero no habilita acceso offline. P2 debe añadir acceso LOCAL explícito y separado de la autenticación remota.

Política mínima:

- Una instalación sin inicio de sesión previo exitoso requiere conexión para entrar.
- Tras validar correctamente una cuenta con el servidor, conserva en SecureStore una referencia mínima a la identidad habilitada para acceso local.
- Esa referencia permite abrir únicamente los datos locales de esa cuenta cuando no se puede validar la sesión por un fallo recuperable.
- No uses JWT decodificado sin verificar como fuente suficiente de identidad.
- No declares que el token remoto es válido por haber permitido acceso local.
- No envíes peticiones protegidas como si estuvieran autenticadas cuando solo existe acceso local.
- Un 401 explícito exige volver a autenticarse; no debe transformarse automáticamente en acceso offline.
- Logout elimina la habilitación de acceso local y las credenciales de sesión.
- Los datos pendientes pueden permanecer almacenados, pero deben quedar inaccesibles hasta que la misma cuenta vuelva a autenticarse correctamente.
- Otra cuenta nunca debe verlos ni modificarlos.
- No borres automáticamente tareas pendientes al cerrar sesión.
- Evita que respuestas tardías de una cuenta afecten el estado o almacenamiento de otra.

Documenta qué datos quedan en SQLite y cuáles en SecureStore. No guardes contraseñas o tokens en SQLite ni afirmes que SQLite está cifrado por defecto.

## 5. Fotografías y audio: preservar comportamiento

Inspecciona cómo se relacionan los adjuntos con tareas nuevas, remotas y locales.

- Conserva fotos y audio online existentes.
- Si una foto se acepta como adjunto local de una tarea offline, copia el archivo a una ubicación persistente de la aplicación y guarda su referencia local por usuario/tarea.
- No consideres persistente una URI que apunta únicamente a caché temporal.
- Si falla la copia o el guardado, conserva un estado recuperable y no anuncies éxito.
- No ejecutes subida automática de adjuntos: pertenece a P3.
- La eliminación debe limpiar únicamente archivos propiedad de esa tarea y no romper referencias compartidas.

No es obligatorio añadir grabación de audio offline en P2. Si el flujo actual exige una tarea remota, muestra una explicación clara al intentar usarlo en una tarea exclusivamente local.

Las imágenes y audios remotos no descargados pueden mostrarse como no disponibles sin conexión. No prometas disponibilidad offline de archivos que no se conservaron localmente.

## 6. Integración con pantallas

- Conecta la lista, formulario y detalle al repositorio local y las reglas anteriores.
- Reutiliza componentes, estilos y textos en español.
- Mantén filtros, navegación y estados de carga/error.
- Distingue carga inicial de base local, lista vacía y fallo de almacenamiento.
- Ofrece reintento cuando corresponda.
- Actualiza la interfaz después de confirmar la escritura.
- Protege operaciones concurrentes relevantes y cambios de usuario.
- Evita que una petición remota tardía sobrescriba una edición local reciente.

No rediseñes la aplicación.

## 7. Pruebas obligatorias

Las pruebas son un entregable central de esta evaluación.

### Repositorio y persistencia

Verifica:

1. Inicialización y migraciones repetibles sin borrar datos.
2. Crear y consultar tareas.
3. Editar, completar y reabrir.
4. Eliminación local y eliminación lógica remota.
5. Persistencia tras cerrar y abrir una nueva conexión.
6. Aislamiento de dos usuarios, también en update y delete.
7. Prevención de duplicados por identificador remoto.
8. Fallo de transacción sin datos parcialmente escritos.
9. Actualización remota que conserva cambios y eliminaciones pendientes.

Incluye pruebas contra un motor SQLite real, no solamente mocks de consultas.

Si el entorno Node no puede ejecutar expo-sqlite, usa un adaptador de prueba mínimo sobre SQLite real que ejecute las mismas migraciones y consultas, o un entorno móvil adecuado. Documenta la diferencia: probar SQLite en Node no valida por sí solo el puente nativo de Expo.

No escribas una segunda implementación del repositorio exclusivamente para los tests.

### Reglas, hooks e interfaz

Verifica:

- Lectura local sin conexión.
- Creación y edición offline.
- Error de almacenamiento sin falso éxito.
- Reapertura que restaura los datos.
- Cambio de usuario sin filtración de tareas.
- Respuesta remota tardía frente a edición local.
- Reconexión sin envío automático ni pérdida de pendientes.
- HTTP 401/403 frente a error de red.
- Resultado remoto incierto sin reenvío automático.

### Acceso local

Verifica:

- Sin identidad validada previamente: no permite entrar offline.
- Cuenta previamente validada: acceso solo a sus tareas locales.
- Logout revoca el acceso local.
- Otra cuenta no accede a datos anteriores.
- 401 explícito exige autenticación.
- Fallos de SecureStore terminan en estados controlados.

### Archivos

Si implementas fotos locales:

- Copia persistente correcta.
- Fallo de copia.
- Recuperación de la referencia tras reiniciar.
- Limpieza limitada a los archivos correspondientes.
- Ausencia de subida automática.

Usa mocks en los límites externos y promesas controladas para carreras. Evita sleeps arbitrarios y pruebas que solo comprueben llamadas sin verificar resultados.

## 8. Verificación y recursos

Ejecuta:

- Pruebas nuevas.
- Suites mobile y backend.
- Typecheck.
- Lint.
- Comprobación de dependencias Expo.
- Exportación Android.

expo-sqlite añade código nativo: documenta que el development build anterior debe reconstruirse.

Si existe un entorno Android funcional, realiza una compilación local con un máximo de dos workers y sin ejecutar simultáneamente otros procesos pesados. No uses EAS remoto.

Si hay dispositivo/emulador disponible, verifica:

1. Login online con cuenta de prueba.
2. Carga de tareas.
3. Activar modo avión.
4. Crear, editar y eliminar tareas.
5. Cerrar completamente y abrir la app.
6. Comprobar conservación de los datos.
7. Reconectar y comprobar que los pendientes no se pierden ni se envían automáticamente.

Si no puedes realizarlo, registra esos pasos como pendientes. No afirmes haber probado reinicio físico o modo avión mediante unitarias.

## 9. Documentación y cierre

Crea `docs/P2_LOCAL_PERSISTENCE.md` con:

- Modelo local y migraciones.
- Política online/offline.
- Acceso local y separación por usuario.
- Comportamiento de logout y 401.
- Tratamiento de fotos/audio.
- Estados pendientes y resultados remotos inciertos.
- Contrato que P3 deberá consumir.
- Tabla de pruebas, indicando cuáles usan SQLite real y cuáles mocks.
- Comandos y resultados.
- Verificaciones físicas pendientes.
- Limitaciones conocidas y observaciones anteriores pospuestas.

Actualiza README y las secciones pertinentes de AGENTS.md.

Finaliza con un resumen de cambios, pruebas, resultados y pendientes. No declares sincronización implementada y no avances a P3.
