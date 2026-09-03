Ejecuta **P1 — Correcciones y pruebas de regresión** en Task Manager Mobile.

Trabaja directamente en el repositorio: inspecciona, reproduce, corrige, prueba y documenta. No te limites a entregar recomendaciones. No avances a P2.

## Contexto y objetivo

P0 migró el proyecto a Expo SDK 57 en `chore/expo-sdk-57`. El informe registra:

- npm ci, typecheck y lint aprobados.
- Backend: 7 suites / 61 tests.
- Mobile: 1 suite / 48 tests.
- Exportación Android y compilación Gradle debug aprobadas.
- Instalación y arranque en dispositivo pendientes.

Verifica el estado real; no asumas que el informe refleja todos los cambios actuales.

El objetivo de P1 es corregir tres defectos de cámara, GPS y restauración de sesión, demostrando cada corrección con pruebas de regresión sobre el código real.

## 1. Inspección y preservación

- Lee AGENTS.md y las instrucciones aplicables.
- Revisa `git status`, rama actual y diff antes de editar.
- Conserva los cambios de P0 y cualquier trabajo previo.
- No cambies de rama con modificaciones pendientes ni ejecutes reset, clean o restauraciones destructivas.
- No hagas commits, pushes ni publicaciones.
- Mantén npm, Expo SDK 57 y la combinación actual de dependencias.
- No muestres secretos ni sobrescribas archivos `.env`.
- Ejecuta las suites relevantes para establecer la línea base.

Los tres defectos se encontraron antes de la migración. Confirma cuáles siguen presentes. Si alguno ya está corregido, no lo reintroduzcas: añade la cobertura que falte y documenta ese estado.

## 2. Cámara: liberar el estado de carga

Ubicación inicial: `mobile/app/index.tsx`, función `attachPhoto()`.

Defecto observado: se activa `photoLoading`, pero únicamente se restablece cuando ocurre una excepción. La captura exitosa y la cancelación pueden dejar bloqueadas las siguientes capturas.

Implementa una solución que garantice:

- Liberación del estado en éxito, cancelación y error.
- Cancelación sin mensaje de error ni adjunto inválido.
- Conservación de la fotografía seleccionada cuando la captura funciona.
- Posibilidad de capturar nuevamente después de cada resultado.
- Protección contra dos invocaciones simultáneas, incluso antes del siguiente render.
- Ausencia de actualizaciones tardías relevantes si la pantalla se desmonta.

Prueba la lógica que consume la pantalla, no una copia creada exclusivamente para tests.

Casos mínimos:

1. Captura exitosa: se conserva la foto y se libera el bloqueo.
2. Cancelación: no se añade una foto y se libera el bloqueo.
3. Permiso rechazado o error: aparece feedback y se libera el bloqueo.
4. Una segunda captura posterior funciona.
5. Dos invocaciones mientras la primera está pendiente no abren dos capturas.

## 3. GPS: liberar el estado al eliminar ubicación

Ubicación inicial: `mobile/app/index.tsx`, función `removeLocation()`.

Defecto observado: al eliminar correctamente la ubicación de una tarea existente, `locationLoading` puede quedar activado.

Garantiza:

- Liberación del estado tanto en éxito como en error.
- Actualización coherente de la tarea y el formulario tras una eliminación exitosa.
- Conservación de la ubicación anterior si la API rechaza la operación.
- Eliminación local, sin petición HTTP, cuando se trata de una tarea aún no guardada.
- Protección contra operaciones simultáneas incompatibles.

Casos mínimos:

1. Eliminar ubicación remota correctamente actualiza el estado y libera el bloqueo.
2. Un fallo de API conserva los datos anteriores, muestra feedback y permite reintentar.
3. Eliminar ubicación de una tarea nueva no llama al backend.
4. Una operación posterior puede ejecutarse después de éxito o error.
5. La misma eliminación no se envía dos veces mientras está pendiente.

## 4. Autenticación: distinguir sesión inválida de fallo temporal

Ubicación inicial: `mobile/src/auth/AuthProvider.tsx` y servicio de autenticación.

Defecto observado: cualquier fallo al consultar `/api/auth/me` provoca el borrado del token, incluso un error de red.

Inspecciona los contratos reales del backend y conserva sus endpoints.

Implementa estados claros para distinguir:

- Restauración en curso.
- Usuario autenticado tras validación exitosa.
- Ausencia de sesión.
- Restauración no completada por un error recuperable.

Comportamiento requerido:

- Sin token guardado: terminar la restauración y mostrar el flujo de acceso.
- Token válido y respuesta válida: establecer usuario y token.
- Respuesta inequívoca de sesión inválida según el contrato, por ejemplo 401: eliminar el token y terminar en el flujo de acceso.
- Fallo de red o error temporal del servidor: conservar el token almacenado, terminar la carga y permitir reintentar.
- Respuesta inesperada o malformada: no declarar autenticación exitosa ni borrar el token automáticamente.
- Conservar el token NO significa permitir acceso autenticado offline. Esa política se definirá en P2.
- Evitar que una respuesta tardía restaure una sesión después de logout o sobrescriba una sesión iniciada posteriormente.
- Evitar actualizaciones después del desmontaje.
- Manejar fallos de lectura o borrado de SecureStore sin cargas infinitas ni promesas rechazadas sin controlar.

Si hace falta, incorpora un error HTTP tipado en el cliente de autenticación para conservar status y código. No identifiques errores comparando mensajes de texto.

Añade una interfaz mínima en español para el estado recuperable: explicación y botón de reintento. Conserva los componentes y estilos existentes.

Casos mínimos:

1. Ausencia de token.
2. Restauración exitosa.
3. Sesión inválida: borrado del token.
4. Error de red: conservación del token y fin de carga.
5. Error 5xx: conservación del token y fin de carga.
6. Reintento exitoso después de un fallo temporal.
7. Respuesta malformada: no se autentica al usuario.
8. Desmontaje durante la restauración.
9. Logout durante una restauración pendiente: la respuesta tardía no recupera la sesión.
10. Fallos de SecureStore con estado final controlado.

## 5. Diseño y calidad de las pruebas

Esta evaluación prioriza pruebas unitarias y de integración. Las pruebas son parte central del entregable.

- Usa las herramientas existentes.
- Si necesitas React Native Testing Library o jest-expo para probar hooks, contexto o componentes, comprueba su compatibilidad con SDK 57 y las versiones instaladas antes de incorporarlos.
- No actualices dependencias ajenas a esa necesidad.
- Separa configuración de pruebas Node/backend y React Native cuando corresponda.
- Mockea los límites externos: cámara, ubicación, SecureStore y transporte HTTP.
- En pruebas del AuthProvider, conserva su lógica real.
- En pruebas del servicio HTTP, conserva el parsing y la clasificación real de errores.
- Usa promesas controladas para simular operaciones pendientes y respuestas tardías.
- Evita esperas arbitrarias, red real en unitarias y snapshots como única evidencia.
- Verifica resultados observables: estado, datos, feedback, llamadas externas y posibilidad de reintentar.
- No pruebes solamente que un setter fue llamado.
- No dupliques implementación dentro de los tests.
- No persigas un número arbitrario de tests o cobertura.

Puedes extraer hooks pequeños si facilita probar y mantener la lógica, siempre que la pantalla los utilice realmente. No introduzcas una arquitectura nueva ni una refactorización general.

Cuando el defecto siga presente, añade primero una prueba que falle por ese comportamiento y luego aplica la corrección. Registra el resultado antes/después. Si ya estaba corregido, informa que la nueva prueba pasó desde el inicio.

## 6. Límites

No implementar:

- Persistencia offline de tareas.
- Colas, sincronización o resolución de conflictos.
- Importación desde API externa.
- Nuevos endpoints o cambios de esquema Prisma.
- Refresh tokens o rediseño completo de autenticación.
- EAS, publicaciones o builds remotos.
- Rediseño visual.
- Limpieza masiva de archivos o dependencias.
- Correcciones ajenas a estos flujos sin demostrar que bloquean el trabajo.

No utilices `any`, `@ts-ignore`, `@ts-nocheck`, exclusiones o desactivación de reglas para ocultar problemas.

Documenta otros defectos encontrados como pendientes, con su evidencia.

## 7. Verificación final

Ejecuta:

- Pruebas nuevas y modificadas.
- Suite mobile completa.
- Suite backend completa.
- Script de pruebas raíz, comprobando que incluya ambas suites.
- Typecheck de ambos workspaces.
- Lint.
- Exportación Android para verificar Babel y Metro tras los cambios.

No repitas compilaciones nativas costosas si no cambiaste dependencias nativas ni configuración que las justifique.

Si hay dispositivo o emulador disponible, comprueba cámara, cancelación, eliminación de GPS y restauración de sesión con conexión interrumpida. Usa datos de prueba.

Distingue expresamente pruebas automatizadas, comprobaciones manuales y verificaciones bloqueadas. No declares probado el hardware mediante mocks.

## 8. Documentación y entrega

Crea `docs/P1_BUGFIXES_AND_REGRESSION_TESTS.md` con:

- Defectos confirmados y causa raíz.
- Pasos para reproducirlos.
- Correcciones realizadas.
- Tabla por caso: escenario, nivel de prueba, dependencias simuladas y resultado.
- Evidencia del fallo previo y aprobación posterior, cuando corresponda.
- Comandos ejecutados y resultados reales.
- Verificaciones manuales pendientes.
- Otros problemas encontrados fuera del alcance.

Clasifica con precisión las pruebas: una prueba de componente con servicios simulados no equivale a una E2E ni a una integración con backend real.

Corrige también dos imprecisiones documentales de P0, si siguen presentes:

- Una rama sin commits no conserva por sí sola los cambios pendientes.
- Los comandos de copia de `.env.example` deben aplicarse únicamente cuando el destino no exista.

Finaliza con un resumen de archivos modificados, defectos corregidos, pruebas añadidas, resultados y bloqueos. No avances a P2.
