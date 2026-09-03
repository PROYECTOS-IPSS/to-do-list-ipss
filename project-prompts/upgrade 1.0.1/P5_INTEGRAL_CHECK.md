Ejecuta **P5 — Verificación integral, pruebas automatizadas y Development Build Android** en Task Manager Mobile.

Trabaja directamente en el repositorio. Inspecciona, implementa pruebas, ejecútalas, corrige los fallos confirmados y documenta evidencias. No te limites a entregar recomendaciones. No avances a P6.

## Objetivo

Demostrar el funcionamiento de P0–P4 mediante pruebas unitarias, de componentes, integración real y E2E. Preparar y compilar un APK de desarrollo usando EAS CLI local para probar la aplicación en Android.

La evaluación prioriza pruebas y depuración. El resultado debe permitir explicar qué se probó, qué detectó cada prueba, cómo se corrigió y qué limitaciones permanecen.

No persigas un número arbitrario de tests ni cobertura del 100 %.

## Contexto reportado

El proyecto incluye:

- React Native, TypeScript y Expo SDK 57.
- Backend Express, Prisma y PostgreSQL.
- Autenticación y acceso local por usuario.
- SQLite, cámara, GPS y audio online.
- Sincronización persistente, idempotencia y conflictos.
- Importación desde JSONPlaceholder.

Últimos resultados de P4:

- Backend: 69 tests.
- Mobile: 94 tests.
- Typecheck y lint aprobados.
- Integración PostgreSQL específica de importación no acreditada.
- Development Build y pruebas físicas pendientes.

Estos son antecedentes. Verifica código, configuración y ejecución real.

## 1. Preservación y alcance

- Lee AGENTS.md y las instrucciones aplicables.
- Revisa rama, git status y cambios pendientes.
- Conserva todo el trabajo previo.
- No hagas commits, pushes, publicaciones, reset ni clean.
- No cambies de rama si compromete trabajo pendiente.
- Mantén npm y las versiones actuales salvo incompatibilidad demostrada.
- No sobrescribas .env ni muestres secretos.
- No agregues nuevas funcionalidades de producto fuera de completar garantías previamente acordadas.

Esta tarea autoriza:

- Configuración y ampliación de pruebas.
- Correcciones de bugs demostrados por pruebas o reproducción.
- Refactorizaciones pequeñas necesarias para probar código real.
- Configuración de EAS y compilación LOCAL del APK de desarrollo.
- Flujos E2E y documentación.
- Completar el disparador de reconexión de P3 si sigue ausente.

No uses builds EAS remotos, servicios de pago, despliegues ni publicación en tiendas.

Si EAS necesita login, vinculación de proyecto o credenciales que no estén disponibles, prepara todo lo verificable y explica el paso exacto requerido. No inventes identificadores ni cambies el applicationId para evitar ese bloqueo.

## 2. Inventario y matriz de verificación

Inspecciona todas las suites, scripts y configuraciones.

Crea `docs/P5_TEST_MATRIX.md` con:

- Funcionalidad o riesgo.
- Caso de prueba.
- Nivel: unitaria, componente/hook, integración o E2E.
- Implementación real ejercitada.
- Dependencias simuladas.
- Entorno: Node, SQLite real, PostgreSQL real, emulador o dispositivo.
- Archivo y nombre del test.
- Resultado y evidencia.
- Pendiente o bloqueo, cuando corresponda.

Distingue:

- Una prueba HTTP con Prisma mockeado no verifica PostgreSQL.
- SQLite Node no verifica el puente nativo de expo-sqlite.
- Mockear cámara no verifica hardware.
- Una exportación Android no es una compilación APK.
- Compilar un APK no demuestra instalación ni funcionamiento.

Registra una línea base ejecutando los controles actuales antes de corregir.

## 3. Pruebas unitarias, hooks y componentes

Inspecciona la cobertura existente y completa escenarios relevantes, sin duplicar pruebas equivalentes.

### Autenticación

- Login y registro válidos e inválidos.
- Validación de respuestas HTTP.
- Restauración exitosa.
- Red/5xx frente a 401.
- Fallos de lectura, escritura y borrado de SecureStore.
- Reintento sin carga infinita.
- Acceso local solo después de validación previa.
- Logout revoca acceso local.
- Cambio directo de cuenta A a B.
- Respuestas tardías que no restauran ni eliminan credenciales de otra sesión.

Prueba efectos sobre SecureStore y estado visual, no únicamente valores del contexto.

### Cámara, GPS y audio

- Cámara: éxito, cancelación, permiso denegado, error y doble pulsación.
- GPS: permiso denegado, servicio desactivado, proveedor fallido, precisión inválida y eliminación.
- Liberación de indicadores de carga en todos los caminos.
- Audio: permisos, inicio/parada, grabación inválida, cancelación y liberación de recursos.
- Desmontaje durante operaciones pendientes.
- Archivo ausente o fallo de filesystem con feedback controlado.

### Tareas y UI

- Crear, editar, completar, reabrir y eliminar.
- Validaciones.
- Error de escritura sin falso éxito.
- Loading, vacío, error y reintento.
- Prevención de acciones simultáneas incompatibles.
- Navegación y rutas inválidas.
- Cambios de cuenta sin datos visuales anteriores.

### Importación

- Preview y selección.
- Registros inválidos y duplicados.
- Doble confirmación.
- Fallo local conserva selección.
- Cuenta A → B invalida preview aunque nunca haya un estado sin usuario.
- Respuesta tardía no modifica otra sesión.
- Confirmar un snapshot ya cargado después de perder conexión.
- Estado importado localmente diferente de sincronizado.

Usa código real consumido por la app. Si necesitas extraer un hook, intégralo en la pantalla; no crees una implementación paralela para tests.

## 4. Integración SQLite real

Ejecuta las mismas migraciones, consultas y repositorio que usa la aplicación.

Verifica:

- Inicialización y actualización de esquema sin pérdida de datos.
- Cierre y nueva conexión.
- CRUD y archivos asociados.
- Transacciones y rollback.
- Aislamiento de lecturas, mutaciones y adjuntos por usuario.
- Persistencia de operaciones, payload y claves.
- Recuperación de operaciones sending abandonadas.
- Conservación de ediciones durante sincronización.
- Pendientes e incertidumbre heredada.
- Importación atómica y deduplicación.
- Eliminación/reimportación conforme al contrato.

Usa bases temporales aisladas. Documenta las diferencias entre node:sqlite y expo-sqlite.

## 5. Integración PostgreSQL y filesystem reales

Prepara un entorno de pruebas reproducible e independiente.

- Usa una base o esquema exclusivo de tests con protección explícita contra apuntar a desarrollo/producción.
- Aplica migraciones en ese entorno.
- No uses prisma migrate reset sobre bases existentes.
- No alteres datos reales.
- Usa directorios temporales para archivos.
- Cierra conexiones, servidores y recursos al terminar.

Prueba:

- Registro/login y ownership con Prisma real.
- CRUD y versiones.
- Idempotencia serial y concurrente de tareas.
- Misma clave con payload diferente.
- Dos usuarios con claves iguales.
- Fallos transaccionales.
- Idempotencia concurrente de fotografías.
- Fallos entre filesystem y base y su limpieza/recuperación.
- Importación con procedencia opcional.
- Dos operaciones distintas del mismo usuario y origen externo: una sola tarea remota.
- Reconciliación sin sobrescribir contenido remoto editado.
- Cuentas distintas importan el mismo origen.
- Validación de procedencia.
- Reintento tras respuesta perdida.

No acredites estas garantías mediante mocks de Prisma.

Si no hay PostgreSQL disponible, prepara scripts y configuración reproducibles, completa el resto y declara el bloqueo concreto.

## 6. Integración del coordinador de sincronización

Usa coordinador, repositorio y reglas reales con transporte controlado donde sea necesario.

Verifica:

1. Crear offline, reiniciar y sincronizar.
2. Servidor aplica operación y se pierde la respuesta.
3. Cierre entre confirmación remota y guardado SQLite.
4. Edición nueva mientras se confirma una operación anterior.
5. Cambios de cuenta durante envío y descarga.
6. Disparadores concurrentes no duplican ejecución.
7. Backoff persistente y Retry-After.
8. Agotamiento de presupuesto sin reinicio infinito por eventos.
9. 401 pausa; validación/403 no reintentan automáticamente.
10. Conflicto y ambas resoluciones.
11. Segundo conflicto si el servidor vuelve a cambiar.
12. Descarga no sobrescribe pendientes ni resucita eliminaciones.
13. Fotos esperan identidad remota de la tarea.
14. Archivo ausente no causa bucle.
15. Operaciones heredadas inciertas no se reenvían.
16. Importaciones se sincronizan mediante el mismo ejecutor.

Usa promesas controladas y reloj simulado; evita sleeps arbitrarios.

Comprueba el disparador al recuperar conexión mientras la app permanece activa. Si falta, incorpóralo con una herramienta compatible y el coordinador existente.

Conectividad solo permite intentar: no demuestra disponibilidad del backend. Evita listeners duplicados, bucles y envíos con acceso exclusivamente local.

No implementes ejecución con la app completamente cerrada.

## 7. Pruebas E2E

Usa Maestro, salvo que el proyecto ya tenga otra herramienta E2E funcional que convenga conservar.

Consulta documentación oficial vigente antes de configurar herramientas o comandos.

Crea flujos reproducibles en una carpeta `e2e/`, incluyendo:

- Login y logout.
- CRUD completo.
- Persistencia tras cerrar y abrir la app.
- Importación y segunda importación sin duplicados.
- Mensajes de error/reintento.
- Sincronización tras interrupción controlada.
- Conflictos si el entorno permite prepararlos de forma determinista.

Para cámara, GPS y audio:

- Automatiza lo que el entorno permita de forma fiable.
- Separa control del permiso, interacción con UI nativa y verificación del archivo/dato.
- Documenta qué requiere comprobación física manual.
- No presentes fixtures como capturas de hardware reales.

Añade testID o identificadores accesibles estables cuando sean necesarios, sin modificar innecesariamente el diseño.

Usa cuentas y datos de prueba. La preparación y limpieza deben limitarse a ese entorno.

No añadas endpoints de bypass ni credenciales de producción para facilitar E2E.

Una E2E que depende del proveedor externo real debe marcarse como smoke externo. Para ejecución determinista puedes usar un servidor fixture HTTP aislado con el adaptador real, sin sustituir el repositorio ni las reglas de importación.

No declares un flujo aprobado solo porque su YAML es válido: ejecútalo o márcalo pendiente.

## 8. APK de desarrollo con EAS local

Inspecciona antes:

- mobile/eas.json y app config.
- Vinculación EAS existente.
- applicationId y configuración nativa.
- Node, Java, Android SDK y herramientas requeridas.
- Espacio en disco, memoria y rutas de trabajo.
- Qué archivos incluirá el build, especialmente por tratarse de un monorepo.

Prepara un perfil development con developmentClient y APK instalable, usando configuración compatible con la versión vigente de EAS CLI.

Conserva identificadores y personalizaciones nativas. No ejecutes prebuild destructivo ni elimines android/ sin necesidad y preservación comprobada.

Ejecuta el build con `--local` desde el directorio correcto. Elige una versión concreta de EAS CLI y documenta la usada.

- Limita Gradle a un máximo de dos workers.
- No ejecutes emulador, tests pesados y build simultáneamente si compiten por recursos.
- Usa rutas explícitas para temporales y salida.
- No añadas builds, temporales, secretos o credenciales al repositorio.
- No imprimas variables sensibles.
- No crees ni sustituyas credenciales remotas sin autorización específica.

Entrega el APK en una ruta clara, por ejemplo `build-output/task-manager-development.apk`, si el build finaliza.

Registra:

- Comando exacto.
- Versión de EAS CLI.
- Resultado.
- Ruta, tamaño y hash SHA-256 del APK.
- Limitaciones o error concreto.

Si EAS local está bloqueado, documenta el bloqueo. Puedes verificar Gradle directamente como control adicional, pero no presentes esa compilación como un build EAS local exitoso.

Explica que el development build normalmente requiere Metro para desarrollar y cómo iniciarlo con el script correcto. No lo describas como una distribución autónoma de producción.

## 9. Emulador y celular

Si hay un dispositivo/emulador disponible:

- Identifícalo con adb.
- No desinstales ni borres datos existentes sin necesidad y autorización.
- Instala el APK de desarrollo de forma compatible con el estado existente.
- Inicia Metro y comprueba acceso al backend.
- Verifica que la API URL corresponde a LAN o adb reverse, según el entorno.
- Ejecuta E2E disponibles.
- Captura evidencias legibles sin tokens ni datos personales.

Comprueba manualmente o automatiza:

- Arranque y navegación.
- Cámara y cancelación.
- GPS y permisos.
- Audio.
- Modo avión, edición local, cierre completo y reapertura.
- Reconexión y ausencia de duplicados.
- Importación.
- Cambio de cuenta y aislamiento.

Para la rúbrica, intenta ejecutar los flujos esenciales en dos configuraciones Android diferentes, de forma secuencial, si están disponibles. Registra modelo, versión Android y API.

No inventes pruebas iOS ni crees emuladores costosos sin evaluar recursos.

Si no hay hardware conectado, termina el APK, flujos y guía reproducible. Distingue “preparado” de “ejecutado”.

## 10. Depuración y cobertura

Crea un registro de bugs reales detectados durante P5:

- Identificador.
- Síntoma y pasos de reproducción.
- Herramienta utilizada.
- Causa raíz.
- Corrección.
- Prueba que falla antes y pasa después, cuando se pudo registrar.
- Evidencia física o automatizada.

No fabriques bugs ni ejecuciones rojas.

Obtén cobertura del código relevante y úsala para localizar ramas sin verificar. No subas porcentajes mediante tests triviales ni excluyas código para mejorar resultados.

Conserva separados los resultados de backend/mobile y los distintos niveles de prueba.

## 11. Validación final

Ejecuta:

- Suites unitarias/componentes.
- Integración SQLite.
- Integración PostgreSQL/filesystem.
- npm test desde raíz.
- npm run typecheck desde raíz.
- npm run lint desde raíz.
- Cobertura.
- Comprobación de dependencias Expo y Expo Doctor.
- Exportación Android.
- Build EAS local.
- E2E disponibles.

Para cada control registra comando, entorno, exit code y resultado. Explica warnings concretos; no los silencies.

Evita ejecutar nuevamente controles costosos que ya pasaron si el código relevante no cambió.

## 12. Documentación y cierre

Crea:

- `docs/P5_TEST_MATRIX.md`
- `docs/P5_TEST_RESULTS.md`
- `docs/P5_DEBUGGING_LOG.md`
- `docs/P5_ANDROID_DEVELOPMENT_BUILD.md`

Incluye instrucciones reproducibles para:

- Preparar las bases de prueba.
- Ejecutar cada nivel de tests.
- Compilar el APK localmente.
- Instalarlo.
- Iniciar Metro y backend.
- Configurar conexión desde celular.
- Ejecutar E2E.
- Completar las verificaciones físicas pendientes.

Actualiza README y AGENTS.md cuando corresponda.

Finaliza con:

- Bugs corregidos.
- Conteos finales exactos por nivel.
- Garantías demostradas y pruebas utilizadas.
- Cobertura con su alcance.
- Resultado y ruta del APK.
- Dispositivos probados.
- Bloqueos y acciones manuales necesarias.
- Estado de preparación para P6.

No declares validación física si solo hubo mocks, exportación o compilación. No declares P5 totalmente cerrado si faltan verificaciones esenciales.

No avances a P6 ni redactes todavía el informe académico final.
