BLOQUE A — Diagnóstico y corrección de autenticación en tareas y sincronización

Implementa una corrección focalizada en los errores observados desde el teléfono. Inspecciona el código actual y reproduce las causas antes de modificarlo. No te limites a entregar un diagnóstico o un plan.

CONTEXTO

Proyecto Task Manager:

- Monorepo Yarn Classic 1.22.22.
- Mobile: React Native + TypeScript + Expo, workspace task-manager-mobile.
- Backend: Node + Prisma + PostgreSQL, workspace task-manager-backend.
- PostgreSQL y backend funcionan en Docker Compose.
- Metro corre en el host mediante yarn dev:docker.
- Development Build Android instalado en teléfono.
- La IP LAN ya fue corregida: registro e inicio de sesión funcionan.

Defectos observados:

1. Crear una tarea muestra “el servidor rechazó la operación (401)…”.
2. Al reiniciar la app, la tarea aparece entre las pendientes.
3. El botón Sincronizar muestra “sincronización requiere revisión”, sin explicar suficientemente qué tarea necesita atención ni cómo continuar.

No asumas que los tres síntomas tienen la misma causa. La persistencia SQLite puede explicar que una tarea aparezca tras reiniciar, pero debes comprobar el recorrido real.

ALCANCE Y RESTRICCIONES

- Lee AGENTS.md e instrucciones aplicables.
- Trabaja en la rama actual, preservando cambios previos.
- No hagas commits, pushes, cambios de rama ni operaciones Git destructivas.
- No rediseñes la interfaz.
- No corrijas todavía audio, fotografías duplicadas, área segura ni filtro inicial.
- No actualices dependencias salvo bloqueo demostrado.
- No ejecutes EAS, Gradle ni emuladores.
- No borres SQLite, colas, tareas, archivos, volúmenes ni bases de datos.
- No relajes autenticación ni ownership.
- No conviertas errores HTTP en éxito remoto.
- No imprimas tokens, contraseñas, headers Authorization, cuerpos sensibles ni el .env completo.
- Ejecuta verificaciones pesadas secuencialmente.

FASE 1 — INSPECCIÓN Y REPRODUCCIÓN

Localiza la implementación real de:

- Login, restauración y logout.
- SecureStore y almacenamiento del token.
- Cliente HTTP de auth, tareas y sincronización.
- Estado de sesión y accessMode.
- Creación de tareas en UI, repositorio SQLite y generación de operaciones.
- Ejecutor de sincronización, clasificación de errores y estados de revisión.
- Middleware JWT y rutas de tareas del backend.
- Acción del botón Sincronizar y feedback mostrado al usuario.

Traza estos recorridos:
A. Login exitoso → crear tarea → respuesta remota → actualización de SQLite/UI.
B. Reiniciar app → restaurar sesión → leer tareas → sincronizar.
C. Crear offline → recuperar conectividad/sesión → sincronizar.

Investiga, sin dar por confirmadas estas hipótesis:

- Si auth, tareas y sync usan la misma URL efectiva.
- Si las peticiones de tareas/sync incluyen el token vigente.
- Si algún cliente captura un token antiguo al inicializarse.
- Si se construye incorrectamente el header Bearer.
- Si se confunde acceso local con autorización remota.
- Si existen carreras entre login, restauración, logout y envío.
- Si el backend rechaza un token expirado, inválido o emitido por otra configuración.
- Si un 401 termina incorrectamente como review/conflicto.
- Si el formulario y la lista se actualizan después del commit SQLite o solamente después del HTTP.
- Si existen operaciones heredadas con resultado incierto que legítimamente requieren revisión.

No deduzcas la URL usada en el teléfono a partir del fallback observado en Jest.

Usa diagnóstico mínimo en desarrollo: operación, método, ruta, status, duración y estado de sesión no sensible. No registres payloads ni credenciales.

Si no tienes dispositivo, reproduce mediante servicios/hooks reales con transporte controlado y mediante API local cuando esté disponible. Separa claramente esa evidencia de una reproducción física.

FASE 2 — CORRECCIÓN

Aplica únicamente los cambios respaldados por el diagnóstico.

Autenticación:

- Tareas y sync deben usar la sesión remota vigente.
- El modo local no habilita peticiones autenticadas.
- Un 401 pausa el trabajo protegido y ofrece una salida recuperable coherente con AuthProvider.
- No añadas refresh tokens ni nuevos mecanismos de autenticación.
- Evita que una respuesta antigua invalide o modifique una sesión nueva.
- Al cambiar de cuenta, ninguna operación de la cuenta anterior puede enviarse con credenciales de la nueva.
- No implementes reintentos infinitos.

Persistencia y feedback:

- Preserva la tarea local y su operación cuando corresponda al modelo existente.
- Si SQLite confirma el guardado, la UI debe reflejarlo sin exigir reiniciar la app.
- Distingue guardado local, pendiente de envío y confirmación remota.
- Un rechazo remoto no debe mostrarse como sincronización exitosa.
- Evita duplicar tareas u operaciones al reintentar.
- Respeta claves idempotentes, payloads estables, versiones y dependencias existentes.
- No reutilices una clave con otro payload.
- Conserva los controles que impiden sobrescribir ediciones nuevas con respuestas tardías.

Sincronización:

- Diferencia autenticación requerida, fallo temporal, conflicto de versión y revisión por resultado incierto.
- No reclasifiques todos los estados review como reintentables.
- Operaciones heredadas unknown sin protección idempotente no se reenvían automáticamente ni reciben claves retroactivas.
- Un reintento tras autenticación no debe generar una segunda operación lógica.
- Inspecciona el contrato real antes de decidir si una operación es segura para reenviar.
- Mantén aislamiento por propietario y un ejecutor activo según el diseño existente.

UI mínima:

- Sustituye mensajes genéricos por explicaciones en español basadas en la causa real.
- Cuando sea posible, identifica la tarea afectada por su título.
- Ofrece únicamente acciones que ya tengan un comportamiento seguro implementado: iniciar sesión, reintentar o abrir resolución de conflicto.
- Si un caso no tiene resolución segura implementada, explícalo; no muestres un botón que solo borra o reenvía el pendiente.
- Conserva el diseño general.

FASE 3 — REGRESIONES

Añade o ajusta pruebas significativas de las causas encontradas. Prioriza:

1. Login válido seguido de creación usa el token vigente.
2. Un cliente previamente inicializado no mantiene credenciales obsoletas.
3. Creación confirmada por SQLite se refleja en UI aunque falle el envío.
4. Un 401 conserva datos locales, termina el loading y pausa el envío sin bucles.
5. Tras autenticarse nuevamente con la misma cuenta, una operación protegida puede continuar sin duplicarse.
6. Logout o cambio de cuenta durante una petición impide efectos tardíos sobre la nueva sesión.
7. Cuenta B no envía ni modifica pendientes de A.
8. Conflicto, error temporal, 401 y unknown heredado producen estados y mensajes diferentes.
9. Unknown heredado no se reenvía automáticamente.
10. Una respuesta de sincronización no pisa una edición local posterior.

Reutiliza la infraestructura existente:

- Hooks/provider reales con React Native Testing Library cuando corresponda.
- SQLite real mediante el adaptador existente para invariantes de persistencia.
- Transporte y reloj controlados para errores y carreras.

No añadas pruebas que se limiten a verificar detalles internos o mocks contra mocks. No afirmes cobertura física, PostgreSQL real o E2E si no se ejecutaron.

Cuando sea viable, incorpora primero la regresión y observa el fallo antes de corregir. Si no se obtuvo ejecución roja, documenta la evidencia inicial sin inventarla.

FASE 4 — VERIFICACIÓN

Ejecuta secuencialmente:

- Suites focalizadas modificadas.
- yarn typecheck.
- yarn typecheck:tests.
- yarn lint.
- yarn test.

Si Docker local está disponible:

- Usa cuentas y tareas de prueba identificables.
- Comprueba login y creación autenticada contra la API real.
- Verifica rechazo sin credenciales válidas.
- Comprueba el estado remoto cuando evalúes duplicación o reintentos.
- No modifiques secretos ni datos ajenos para provocar errores.
- No interrumpas una sesión activa del usuario sin necesidad.

No reconstruyas el APK para cambios exclusivamente JavaScript. Indica si basta recargar Metro; si detectas un cambio nativo imprescindible, justifícalo antes de ampliar el alcance.

FASE 5 — ENTREGA

Crea docs/P5_BLOCK_A_AUTH_TASK_SYNC_FIX.md con:

- Síntomas y causas confirmadas.
- Evidencia que respalda cada causa.
- Archivos modificados y comportamiento resultante.
- Pruebas añadidas, nivel y límites simulados.
- Comandos ejecutados y resultados reales.
- Pendientes y limitaciones.
- Pasos breves para la validación física.

Checklist físico:

1. Iniciar sesión y crear una tarea online.
2. Comprobar que aparece inmediatamente y existe en el backend.
3. Crear una tarea offline, comprobar guardado local y reiniciar para verificar persistencia.
4. Recuperar conectividad y comprobar una única tarea remota después de sincronizar.
5. Verificar la recuperación ante sesión rechazada mediante un procedimiento controlado con cuenta de prueba.
6. Cambiar de cuenta y comprobar aislamiento.
7. Revisar que los mensajes de sincronización describen el problema y la acción disponible.

Si algún paso no puede ejecutarse con los controles actuales, márcalo pendiente y explica cómo comprobarlo; no inventes herramientas ni resultados.

Termina con un resumen breve y los pasos que debo realizar en mi celular. No marques el bloque como validado físicamente hasta que yo confirme esa prueba. No avances al bloque de audio/fotografías ni al rediseño.
