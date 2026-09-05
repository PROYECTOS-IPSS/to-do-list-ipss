# P5 — Bloque E.1: auditoría UI y propuesta “Mulberry Calm”

## 1. Resumen ejecutivo

Checkout auditado sin modificar producto. Funcionalidad existente queda congelada: autenticación, tareas offline-first, sincronización manual/foreground de tareas e imágenes, fotos, audio local B.2.1, GPS, importación, safe area y feedback multilínea. Audio remoto B.2.2 permanece fuera de alcance.

La UI actual ya tiene una base compartida útil (`AppText`, `AppButton`, `AppInput`, `Card`, `TaskCard`, `AppFeedback`, `StateMessage`, `Screen`). Su principal problema no es falta de componentes: es concentración excesiva de responsabilidades en `components.tsx`, pantallas con composición monolítica y un lenguaje visual oscuro/teal que no coincide con Mulberry Calm. Hay duplicación de superficies (`Card` dentro de `Card`), acciones repetidas y estados de metadatos expresados como texto sin jerarquía.

**Recomendación:** Opción A con suavidad superficial de B: alto contraste y jerarquía productiva, fondo cálido, tarjetas menos profundas y mulberry reservado para acción/foco. Migración incremental desde tokens y primitives; sin big bang ni segundo sistema permanente.

## 2. Estado del repositorio

| Campo | Resultado |
|---|---|
| Rama | `fix/ui` |
| HEAD | `2e51b9c fix(ui): mejorar safe area filtros y mensajes` |
| Working tree | Solo `?? docs/P5_BLOCK_D1_FUNCTIONAL_AUDIT.md`; no hay cambios productivos inesperados |
| `git diff --check` | Pass |
| Stash | `stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable` |
| Stash descartado B.2.2 | Intacto; no se inspeccionó ni alteró contenido |
| Commit/push | No realizados |

El informe D.1 declara **LISTO PARA REDISEÑO CON DEUDAS NO BLOQUEANTES**. No se ejecutaron operaciones destructivas, EAS, Gradle, build Android, `stash pop`, `stash apply`, reset ni rebase.

## 3. Línea base de tests

| Comando | Resultado real |
|---|---|
| `yarn typecheck` | Pass: mobile + backend |
| `yarn lint` | Pass |
| `yarn test` | Pass: backend 8 suites/80 tests; mobile 13 suites/122 tests |
| `git diff --check` | Pass |

Durante mobile tests aparecen logs de auth en desarrollo (`auth.ts`), deuda P3 ya documentada; no se corrigió en esta fase.

## 4. Inventario de pantallas

| Pantalla | Objetivo | Acción principal | Componentes | Estados | Problemas UI | Refactor sugerido | Prioridad |
|---|---|---|---|---|---|---|---|
| `/auth/login` | Entrar o restaurar acceso | Iniciar sesión | `AuthScreen`, `Card`, `AppLogo`, `AppInput`, `AppButton`, `AppFeedback`, `AppText`, `Link` | loading, validación por campo, error, redirect autenticado; teclado y safe area | Card contenedora genérica; jerarquía correcta pero poco distintiva; botón/link viven en composición inline | Mantener primitives; separar solo composición de formulario si emerge un consumidor real | P1 |
| `/auth/register` | Crear cuenta | Registrarse | Igual que login, tres inputs | loading, validación, error, redirect; teclado/safe area | Duplica estructura y clases de login; texto y orden son diferencias necesarias | Compartir primitive de campo/acciones; no crear abstracción de una sola pantalla | P1 |
| `/` Home | Gestionar tareas y sesión | Crear/guardar tarea; completar desde lista | `Screen`, `FlatList`, `AppLogo`, `AppBadge`, `AppFeedback`, `AppButton`, `AppInput`, `Card`, `TaskCard`, `StateMessage`, modal | restauración auth, loading, empty, filtro vacío, error/retry, offline, sync, conflicto/revisión, disabled/busy, feedback, confirmación; lista scroll | Header, resumen, formulario, sync, filtros y lista compiten; `Card` para todo; tres botones de filtro simulan segmented control; formulario completo siempre ocupa primer plano; acciones de sync/import/logout pierden prioridad | Extraer composición visual por secciones; conservar lógica; tokenizar estados y reducir nesting; crear patrón de filtro únicamente si se repite | P0 |
| `/tasks/[id]` | Ver/editar implícitamente detalle y adjuntos | Añadir foto, grabar audio, volver | `Screen`, `ScrollView`, `AppHeader`, `AppBadge`, `Card`, `AppButton`, `AppFeedback`, `AuthenticatedImage`, `StateMessage`, modal | loading/error/retry/not found; imagen loading/error/retry; audio idle/requesting/recording/stopping/preview/playing/persisting; empty attachments; confirmación; offline local | Información, ubicación, imágenes y audio son bloques equivalentes; tarjetas anidadas; audio local expone MIME/bytes técnicos; demasiadas acciones con igual peso | Seccionar “datos”, “adjuntos” y “acciones”; patrón de attachment row; destructive agrupado al final; no cambiar contrato audio | P0 |
| `/import` | Consultar y seleccionar tareas externas | Consultar fuente / importar selección | `Screen`, `FlatList`, `Card`, `AppButton`, `AppFeedback`, `StateMessage`, `AppText` | loading, empty, error/retry, selected/already imported, disabled, feedback | Dos acciones primarias contiguas; selección indicada por texto y ✓; cada registro es card completa; header manual duplica navegación | Patrón de selección con estado visible y contador; botón importar fijo/jerarquizado; usar `AppHeader` | P1 |
| auth restore | Resolver sesión antes de Home | Reintentar | `Screen`, `StateMessage` | loading, restore error/retry | Mensaje funcional, composición mínima | Conservar; revisar contraste y foco | P2 |
| rutas modales | Confirmar eliminación de tarea/adjunto | Confirmar o cancelar | `AppConfirmModal`, `AppButton`, `AppText` | visible, loading, cancel disabled | Modal no declara explícitamente título/roles de diálogo; overlay oscuro heredado del tema | Auditar accesibilidad nativa y foco en E.2/E.7 sin duplicar modal | P1 |

**Scroll/teclado/safe area:** Auth usa `KeyboardAvoidingView` + `ScrollView`; Home usa `FlatList`; detalle usa `ScrollView`; import usa `FlatList`; todas pasan por `Screen` y safe area completa. Home mezcla header/formulario/lista dentro de `ListHeaderComponent`, por lo que el formulario largo desplaza la lista correctamente pero aumenta densidad inicial.

## 5. Inventario de componentes

| Componente | Archivo | Variantes/props | Consumidores | Estados | Accesibilidad | Duplicación/problema | Acción |
|---|---|---|---|---|---|---|---|
| `Screen` | `mobile/src/ui/components.tsx` | children | todas | safe area | correcto por contenedor | padding global fijo puede limitar pantallas densas | conservar, tokenizar |
| `AuthScreen` | mismo | children | login/register | teclado/scroll | keyboard persistence correcta | layout auth compartido | conservar |
| `AppText` | mismo | 8 variantes, muted, `TextProps` | todas | implícitos | hereda props; falta contrato de truncado | variante `bodySecondary` y `caption` cercanas | conservar/extender semántica |
| `AppLogo` | mismo | compact | auth, Home, header | none | marca no tiene label explícito | `AppHeader` lo fuerza en toda pantalla | conservar; revisar lectura |
| `AppHeader` | mismo | title, back, right | detalle; import duplica header manual | none | back label correcto | Home tiene header propio | conservar y usar en import |
| `AppButton` | mismo | primary/secondary/danger/ghost, loading | todas | disabled/busy/pressed | role, state, 44 px | `danger` contradice API conceptual `destructive`; no icon-only API; `active:opacity-80` único pressed | conservar; renombrado/migración controlada a `destructive`; extender mínimo |
| `AppInput` | mismo | label/error + `TextInputProps` | auth/Home | focus/error/disabled/multiline | label automática, helper error | descripción y textarea comparten componente razonablemente | conservar; mejorar helper/foco sin dividir prematuramente |
| `AppBadge` | mismo | neutral/success/warning/error/accent | Home, detalle | tone | texto visible | metadata puede saturar color | conservar; semántica restringida |
| `AppFeedback` | mismo | success/error/info/warning | Home, detalle, auth, import | live, alert error | multiline, live region, alert solo error | correcto; colores sin icono/indicador adicional | conservar y tokenizar |
| `AppConfirmModal` | mismo | title/description/confirm/loading | Home, detalle | visible/loading | `onRequestClose`; falta auditoría de dialog semantics/foco | modal única, no duplicar | conservar/extender accesibilidad |
| `Card` | mismo | children/className | todas y dentro de `TaskCard` | none | no role por defecto | sobreuso y nesting profundo | conservar como superficie base; reducir usos |
| `TaskCard` | mismo | task data + 4 callbacks + loading | Home | completed, busy, delete | open labels correctos; toggle status no explicitado | título pressable y botón “Ver detalles” duplican apertura; tres acciones iguales | extender/compactar jerarquía |
| `AuthenticatedImage` | mismo | local/remote/token/retry | detalle | loading/ready/error/fallback | error textual/retry | correcto; visual depende de `StateMessage` card | conservar |
| `AppImage` | mismo | uri/token/className | Home/detalle | native load callbacks | sin alt equivalente visible; consumidor aporta contexto | bajo nivel correcto | conservar |
| `StateMessage` | mismo | neutral/error/success/action | todas | empty/error/retry/loading | acción visible | implementado como `Card`, genera nesting en attachments | conservar; permitir superficie plana opcional solo si necesidad comprobada |

### Componentes locales implícitos

- Home: resumen estadístico, editor de tarea, conflicto/revisión, filtro segmentado, preview de foto.
- Detalle: bloque de imagen, bloque de audio, preview de grabación.
- Import: fila seleccionable de registro.

No conviene extraerlos todos en E.2: son composiciones de pantalla y sus estados aún están estrechamente ligados a servicios. Extraer solo después de estabilizar tokens y detectar repetición real.

## 6. Auditoría de estilos

### Evidencia

- Sistema activo: NativeWind/Tailwind; `global.css` solo carga capas Tailwind.
- `tailwind.config.js` deriva colores, spacing, radios y tipografía de `mobile/src/ui/tokens.json`.
- Tokens actuales son dark navy + teal/gold, no Mulberry Calm.
- `StyleSheet.create` no aparece en `mobile/app` ni `mobile/src`; `style={{}}` no aparece en esas áreas. Esto cumple la regla del proyecto.
- Colores hardcodeados productivos: tokens UI y sombras; Android/coverage contienen valores fuera de la superficie React Native y no deben mezclarse con el rediseño.
- Radios usados: `small`/`medium`/`large`/`xl`/`pill`, más `rounded-medium` para imágenes y `rounded-xl` en modal.
- Sombras: dos niveles en tokens, pero Tailwind redefine sombras con rgba azulados; requiere una única fuente semántica.
- Botones: 4 variantes actuales (`primary`, `secondary`, `danger`, `ghost`); no hay tertiary separado.
- Tipografía: 8 variantes; escala 12–34 px, line-height explícito.
- Layout: spacing tokenizado 4–48 px; varias excepciones directas (`h-[180px]`, `h-40`, `h-52`, `min-h-[44px]`, `min-h-[48px]`). Las alturas de media son particulares justificadas; targets no deberían depender de valores dispersos.
- Dark mode: no existe tema alternativo; `StatusBar style="light"` presupone fondo oscuro.

### Inconsistencias prioritarias

1. Tema actual no expresa dirección elegida; requiere migración semántica, no reemplazo aislado de hex.
2. `Card` es layout, estado vacío, resumen, adjunto y confirmación; la misma elevación borra jerarquía.
3. `TaskCard` duplica affordance de abrir y presenta cuatro acciones con peso similar.
4. Filtros son botones normales; falta estado seleccionado con semántica `accessibilityState.selected`.
5. `AppButton` solo tiene pressed por opacidad; focus visible no está definido explícitamente.
6. `AppBadge` y feedback colorean estados pero no ofrecen indicador no cromático consistente.
7. Import y detalle recrean navegación/header manualmente en lugar de usar `AppHeader`.
8. Clases dinámicas están mayormente contenidas en mapas constantes; patrón es seguro. Evitar concatenar clases no presentes en build-time.
9. `AppText` siempre inicia con `text-text`; override posterior funciona, pero API semántica de tono es más clara que clases por pantalla.
10. Superficies anidadas en detalle y Home aumentan ruido, especialmente attachments y ubicación.

### Valores a convertir en tokens

Colores semánticos, border/focus, opacidades disabled, elevaciones, radios de control/superficie/pill, alturas mínimas de control, padding de sección y tamaños de media repetidos. Mantener como valores particulares: altura de preview si responde a proporción/legibilidad, no como escala visual general.

## 7. Auditoría de botones

| Necesidad actual | Decisión |
|---|---|
| Primary | Guardar/crear, confirmar acción principal |
| Secondary | Añadir adjunto, importar, acciones alternativas |
| Ghost | Volver, editar, quitar, filtros no seleccionados |
| Destructive | Eliminar; nombre semántico preferido `destructive` |
| Tertiary | No necesario aún; ghost cubre casos actuales |
| Icon-only | Volver puede seguir siendo botón textual accesible; no añadir API hasta usar icon library real |
| FAB | No recomendado en Home actual: el formulario y la lista ya tienen acción visible; FAB duplicaría “Añadir tarea” y competiría con import/sync |
| Segmentado | Reutilizar `AppButton` visualmente al inicio, añadir selected/role solo durante Home; no crear componente genérico prematuro |
| Loading | Mantener ActivityIndicator, conservar title accesible si el indicador reemplaza texto |
| Disabled | Mantener bloqueo por operación; mejorar contraste/estado, no usar solo opacity |

API conceptual mínima para E.2: `variant: primary | secondary | ghost | destructive`, `size: md | lg` (sm solo si existe caso táctil no primario), `loading`, `disabled`, `fullWidth`, `accessibilityLabel`. `icon` queda fuera hasta que exista iconografía consistente; evitar props que nadie consume.

## 8. Auditoría de tarjetas

- **Task card:** único contenedor de lista. Debe priorizar título, estado completed/pending, descripción truncada, fecha/ubicación y una señal compacta de foto/audio/sync cuando los datos existen. La acción primaria es abrir; completar es secundaria; editar/eliminar deben bajar de peso. No añadir metadata inexistente.
- **Resumen estadístico:** tres superficies pequeñas actuales funcionan, pero son tres `Card` con sombra completa. Propuesta: una superficie de resumen con tres columnas o cards planas; evita colección de cajas iguales.
- **Multimedia:** actualmente cada imagen/audio es `Card` anidada dentro de sección `Card`. Propuesta: rows/superficies planas con preview y acción; conservar confirmación y estados.
- **Informativa:** ubicación y fuente de importación necesitan superficie suave, no tarjeta elevada equivalente a tarea.
- **Empty state:** `StateMessage` como card es aceptable en listas; dentro de una card de adjuntos debe poder verse plano para eliminar nesting.
- **Seleccionable:** import records necesitan estado de selección y feedback visual/semántico, no una card nueva por cada estado.

## 9. Inputs

`AppInput` ya cubre label, placeholder, error, focus, disabled, multiline y password por forwarding. Mantener un solo componente configurable; `AppTextArea` sería alias/abstracción innecesaria hoy. Ajustes E.2:

- label siempre visible;
- helper/error debajo sin desplazar ambiguamente el campo;
- focus con borde mulberry y halo legible, no solo cambio sutil;
- error combina color + texto;
- disabled con superficie/texto distinguibles, no únicamente opacity;
- multiline debe tener altura mínima y alineación superior, respetando font scaling;
- `returnKeyType` y `onSubmitEditing` quedan en pantallas auth;
- no agregar date picker ni librería nueva.

## 10. Feedback

`AppFeedback` preserva mejoras C.1: mensajes completos, multilínea, `accessibilityLiveRegion="polite"`, `alert` solo para error y ubicación consistente. Mantener contrato. Rediseño debe:

- diferenciar info/sync, success, warning y error por tono + texto/icono opcional no cromático;
- evitar duplicar simultáneamente `AppFeedback` y `StateMessage` para mismo error;
- mantener retry como acción próxima al estado que lo necesita;
- no convertir syncing en modal ni bloquear lectura de tareas;
- reservar alert para error real, no para cada confirmación exitosa;
- permitir que mensajes largos no se corten con `numberOfLines`.

## 11. Filtros/chips

Filtros actuales: `pending`, `all`, `completed`, persistidos en AsyncStorage y con Pendientes inicial. No cambiar lógica. Visualmente, convertir el grupo en control segmentado de tres opciones con selección visible, label completo y `accessibilityState={{ selected }}`. Contadores pueden vivir en resumen, no repetirlos en cada chip.

Badges de estado: mantener pocos tonos: pendiente/completada/sync conflict/review. Foto, GPS y audio no necesitan cada uno un chip cromático distinto; usar texto auxiliar o iconos consistentes con label.

## 12. Jerarquía por pantalla

### Home

1. Header: marca + saludo; logout secundario.
2. Contexto “Tu espacio” y resumen compacto.
3. Acción principal “Crear una tarea” dentro de sección visible.
4. Filtro segmentado y contador.
5. Lista de tareas.
6. Sync accesible junto al encabezado de lista, no dominante.
7. Importación como acción secundaria cercana al header o menú textual.
8. Conflictos/revisión con warning prominente, pero solo cuando existen.

No usar FAB: botón principal en flujo es más descubrible, funciona con scroll y no tapa estados. Si el formulario se colapsa en futuro, reevaluar FAB; no implementarlo ahora.

### Login/registro

Marca breve → heading → explicación corta → campos → feedback/error → acción primaria → link de cambio. Card puede conservarse como superficie de confianza; fondo cálido y espacio suficiente, sin ilustraciones ficticias.

### Crear/detalle

Detalle: header y estado → título → descripción/fecha → ubicación → multimedia → acciones de tarea/destructivas al final. En Home, crear: título/descripción → adjuntos opcionales → guardar. Cámara, GPS y audio son acciones secundarias independientes; no competirán con guardar.

### Importación

Header → explicación de fuente/privacidad → consultar → resultado y contador → lista seleccionable → importar seleccionadas. Registros ya importados se muestran disabled y con texto; selección conserva estado ante error.

## 13. Sistema “Mulberry Calm”

Principios: fondo cálido y silencioso; mulberry para acción/foco; superficies con poca elevación; una jerarquía clara por pantalla; estados comunicados por texto y estructura, no color solo; personalidad en marca y tipografía, no decoración.

### Tokens semánticos propuestos

| Token | Valor sugerido | Uso | Contraste esperado |
|---|---|---|---|
| `color.background` | `#FAF7F9` | fondo app | base clara |
| `color.surface` | `#FFFFFF` | input/superficie primaria | texto carbón ≥ 13:1 aprox. |
| `color.surfaceMuted` | `#F5EAF0` | resumen/feedback suave | texto oscuro recomendado |
| `color.primary` | `#8B2F63` | CTA, foco, selección | blanco ≈ 6:1; pasa AA normal |
| `color.primaryPressed` | `#742650` | pressed | blanco ≈ 8:1 aprox. |
| `color.primaryDeep` | `#5F1F45` | texto/alto énfasis | fondo claro muy alto |
| `color.primarySoft` | `#F5EAF0` | fondo de acento | usar texto deep, no mulberry claro |
| `color.text` | `#292127` | texto principal | sobre background/surface ≥ 13:1 aprox. |
| `color.textMuted` | `#756872` | texto secundario | sobre blanco ≈ 4.8:1, revisar tamaño pequeño |
| `color.border` | `#E2D7DD` | divisores/borde normal | no usar como único indicador |
| `color.success` | `#477A67` | éxito/completada | blanco ≈ 5:1; usar texto o fondo claro |
| `color.warning` | `#A76B25` | sync/revisión/pendiente | blanco ≈ 4.2:1; para texto pequeño preferir `#7A4A12` |
| `color.error` | `#B64250` | error/destructive | blanco ≈ 5:1 |
| `color.info` | `#5F1F45` | información/sync | evitar crear azul adicional |
| `color.disabledSurface` | `#EEE8EC` | control disabled | diferencia de superficie, no solo alpha |
| `color.disabledText` | `#9A8F96` | texto disabled | no usar para información esencial |

Ratios son evaluación orientativa calculada sobre hex sRGB; E.2 debe confirmar con herramienta WCAG. `#EAE4F0` puede conservarse como lavanda secundaria, pero no debe cargar texto carbón pequeño sin verificar: es superficie, no color de texto. `#A76B25` debe oscurecerse para labels pequeños. Bordes se evalúan como affordance, nunca como único contraste de estado.

Texto sobre principal: usar `#FFFFFF` o `#FAF7F9`; no usar `#E2D7DD`, lavanda ni amarillo como texto principal en botón mulberry. Pressed debe mantener contraste. Disabled conserva label legible y estado bloqueado explícito.

### Tipografía

No añadir fuentes. Mantener fuente del sistema y reducir escala conceptual a:

| Token | Tamaño/line-height | Peso | Uso |
|---|---:|---:|---|
| `display` | 32/40 | 700 | título Home/detalle; no párrafos |
| `heading` | 24/32 | 700 | sección/formulario |
| `title` | 18/24 | 700 | card/section |
| `body` | 16/24 | 400 | contenido editable/lectura |
| `bodySmall` | 14/20 | 400 | metadata y ayuda |
| `label` | 13/18 | 600 | labels/estados |
| `caption` | 12/16 | 500 | metadata no esencial |
| `button` | 15/20 | 700 | controles |

No eliminar variantes actuales durante E.2 sin migrar consumidores; `bodySecondary` puede mapear temporalmente a `bodySmall`.

### Espaciado, radios, borde y elevación

- Espaciado base: `4, 8, 12, 16, 24, 32`; 40/48 solo para separación de hero/auth.
- `4`: icono/texto y micro separación; `8`: grupos internos; `12`: control/card compacta; `16`: sección; `24`: bloques; `32`: separación mayor.
- Radios: `8` control, `14–16` card/surface, `999` pill, circular solo icono/avatar.
- Borde normal `#E2D7DD`, activo `#8B2F63` 2 px o halo; destructive `#B64250`.
- Elevación: card primaria plana o sombra muy suave; acción flotante, si algún día existe, una sombra mayor. Evitar sombra oscura azulada heredada.
- Una card no debe contener otra card salvo media preview que necesite identidad clara.

### Iconografía y movimiento

Auditar biblioteca ya instalada antes de elegir símbolos. Regla: estilo único, 20–24 px en controles, 16 px metadata; icon-only exige `accessibilityLabel` y estado textual equivalente. No emojis como iconos funcionales. No añadir paquete.

Animaciones funcionales únicamente: pressed, aparición de feedback, completar tarea, transición de selección y loading. Respetar `reduce motion` si bridge/plataforma lo permite; fallback sin animación. No animar cada card ni usar parallax.

## 14. Accesibilidad

- Confirmar contraste WCAG AA: texto normal 4.5:1, grande 3:1, UI/estados 3:1; validar tokens reales.
- No depender de color: completed también texto/check; warning también label; selected también `selected` state.
- Targets mínimo 44×44; no reducir botones compactos por estética.
- Labels visibles en inputs; `accessibilityLabel` solo complementa, no reemplaza label.
- Botones icon-only con nombre, role y estado.
- Filtros exponen seleccionado; controls busy/disabled exponen state.
- Feedback usa live region; errores siguen alert; modal debe exponer diálogo/título, cancelación por back y foco razonable.
- Orden de lectura coincide con orden visual: título → contexto → acción → resultado.
- Texto aumenta con font scaling; evitar alturas fijas para párrafos/mensajes.
- Teclado: conservar KeyboardAvoidingView, scroll y `returnKeyType`; probar campos inferiores en dispositivo.
- Imágenes: texto cercano identifica contenido/acción; error y retry son legibles.
- Reducir movimiento; no usar animación como única señal de completado.
- Revisar contraste de disabled: estado puede ser menos prominente, nunca ilegible.

## 15. Opciones visuales

### Opción A — Mulberry Focus

- Paleta: background `#FAF7F9`, surface blanco, primary `#8B2F63`, deep `#5F1F45`, estados semánticos sobrios.
- Densidad: media, secciones explícitas y CTA claro.
- Tarjetas: estructuradas, una elevación ligera; task card con affordance única de apertura.
- Botones: mulberry primary, soft secondary, ghost, destructive.
- Home: resumen arriba, crear visible, lista prioritaria, sync discreto.
- Auth: card contenida con heading fuerte.
- Detalle: secciones de datos/adjuntos/acciones.
- Ventajas: mejor productividad, contraste, descubrimiento y rollback sencillo.
- Riesgos: puede sentirse más convencional si se abusa de cards.
- Esfuerzo: medio; mayormente tokens/composición existente.
- Accesibilidad: mejor base; warning requiere tono más oscuro para labels.
- Adecuación: **alta**.

### Opción B — Mulberry Soft

- Paleta: más `surfaceMuted`/lavanda, primary reservado; bordes suaves.
- Densidad: baja-media, más aire.
- Tarjetas: planas, radios mayores, poca sombra.
- Botones: primary más puntual; secondary como superficie cálida.
- Home: contexto y resumen tranquilos; lista con divisores.
- Auth: experiencia calmada y espaciosa.
- Detalle: adjuntos muy ligeros.
- Ventajas: identidad calm productivity y menor ruido.
- Riesgos: estados y CTA pueden perder prioridad; superficies claras pueden bajar contraste percibido.
- Esfuerzo: medio.
- Accesibilidad: requiere disciplina; no usar tonos pastel para texto ni estados.
- Adecuación: media-alta como complemento de A.

### Opción C — Mulberry Editorial

- Paleta: deep mulberry para títulos, fondo claro, menos colores de superficie.
- Densidad: baja; divisores y whitespace reemplazan cards.
- Tarjetas: task list editorial, metadata alineada, adjuntos como rows.
- Botones: pocos, más textuales.
- Home: título/fecha/resumen y lista protagonista.
- Auth: composición tipográfica con card mínima.
- Detalle: lectura larga con secciones y divisores.
- Ventajas: personalidad, menos contenedores anidados, menor ruido.
- Riesgos: acciones multimedia/destructivas menos descubribles; mayor trabajo de responsive/orden.
- Esfuerzo: alto.
- Accesibilidad: buena si foco/targets se mantienen; riesgo de affordances sutiles.
- Adecuación: media; no primera migración.

## 16. Recomendación

Adoptar **Mulberry Focus + superficies Soft**: contraste y CTA de A, fondos/radios/elevación de B. No adoptar editorial completo todavía. Esta combinación respeta productividad moderna, personalidad cálida y legibilidad sin rehacer navegación ni lógica.

## 17. Wireframes textuales

### Login

- Marca compacta y nombre.
- Heading “Bienvenido de nuevo”.
- Texto breve de contexto.
- Campo correo.
- Campo contraseña.
- Feedback/error bajo formulario.
- Botón primary “Iniciar sesión”.
- Link “Crear cuenta”.

**Cambio:** misma estructura funcional; menos card dominante, CTA/foco más claros.

### Registro

- Marca.
- Heading “Crear cuenta”.
- Texto breve.
- Nombre, correo, contraseña.
- Error por campo + feedback global.
- Botón primary.
- Link a login.

**Cambio:** comparte ritmo con login sin duplicar estilos.

### Home

- Header: saludo + logout secundario.
- “Tu espacio” + resumen total/pendientes/completadas.
- Acción primaria: crear tarea.
  - Título.
  - Descripción.
  - Adjuntar GPS/foto opcional.
  - Guardar.
- Feedback/sync.
- Encabezado “Tus tareas” + sincronizar.
- Filtro segmentado Pendientes/Todas/Completadas.
- Lista TaskCard.
- Empty/error/retry según estado.

**Cambio:** jerarquiza lista y creación; reduce cards anidadas y peso de utilidades.

### Crear tarea

- Heading de sección.
- Título.
- Descripción.
- Adjuntar ubicación.
- Adjuntar foto/preview.
- Feedback de persistencia offline.
- Guardar tarea.

**Cambio:** adjuntos son secundarios y estados se leen sin competir con guardar.

### Detalle/editar

- AppHeader + badge de estado.
- Título y descripción/fecha.
- Sección ubicación.
- Sección imágenes: añadir, empty, preview, eliminar.
- Sección notas de voz: grabar, detener, preview, reproducir, guardar, eliminar.
- Feedback contextual.
- Confirmación destructive.

**Cambio:** elimina apariencia de “card dentro de card”; agrupa acciones por riesgo.

### Importar

- AppHeader.
- Explicación de fuente/privacidad.
- Consultar fuente.
- Resultado: disponibles/rechazadas.
- Lista seleccionable con estado imported/selected.
- Acción importar seleccionadas.
- Empty/error/retry/feedback.

**Cambio:** selección y CTA se vuelven estados explícitos; no duplica navegación manual.

## 18. Arquitectura de refactorización

La estructura existente es adecuada para una migración corta. No crear `theme/colors.ts`, etc. mientras `tokens.json` + `tokens.ts` ya son fuente única. Si el tipado de tokens se vuelve necesario, extender `tokens.ts` en lugar de duplicar datos.

| Actual | Propuesto | Consumidores | Fase |
|---|---|---|---|
| `tokens.json`/`tokens.ts` | tokens semánticos Mulberry en mismos archivos | Tailwind + components | E.2 |
| `AppText` | `AppText` con variantes semánticas compatibles | todas | E.2 |
| `AppButton` (`danger`) | `AppButton` (`destructive`) tras migrar consumidores | todas | E.2 |
| `AppInput` | `AppInput` configurable, sin `AppTextArea` inicial | auth/Home | E.2 |
| `Card` | `Card` base + uso plano selectivo, no `AppCard` paralelo | todas | E.2/E.5 |
| `AppBadge` | badge restringido a estado/metadata prioritaria | Home/detalle | E.2/E.4 |
| `AppFeedback` | mismo componente con tokens y estados | todas | E.2 |
| `StateMessage` | mismo componente; evitar card anidada cuando composición lo permita | todas | E.2/E.6 |
| header manual de import | `AppHeader` | import | E.6 |
| composición inline Home | secciones visuales pequeñas solo si repetición/lectura lo justifica | Home | E.4 |
| attachment cards inline | rows/superficies locales o componente compartido solo si imagen/audio convergen | detalle | E.5 |

Orden: tokens → primitives → auth → Home → detalle → importación → accesibilidad física. Cada bloque mantiene contratos de servicios y puede revertirse por archivo. Durante transición, cada primitive acepta clases existentes; no mantener dos paletas activas indefinidamente: migrar pantalla y retirar clases antiguas antes de cerrar cada bloque.

## 19. Plan E.2–E.7

| Bloque | Alcance/archivos probables | Riesgos | Pruebas/validación | Aceptación | Dependencia |
|---|---|---|---|---|---|
| E.2 Fundamentos | `tokens.json`, `tokens.ts`, `tailwind.config.js`, `components.tsx`; botones, inputs, cards, chips/feedback compatibles | contraste, NativeWind dynamic classes, regressions de props | typecheck, lint, existing tests, smoke de primitives | tokens Mulberry únicos; API existente sigue compilando; targets/states preservados | ninguna |
| E.3 Auth | `app/auth/login.tsx`, `register.tsx`, primitives | teclado, foco, error largo | typecheck/tests; Development Build con teclado/fuente aumentada | login/register visualmente consistentes; auth behavior unchanged; errors readable | E.2 |
| E.4 Home | `app/index.tsx`, posible extracción mínima de secciones | perder offline/sync/conflict states; lista/scroll | tests existentes; smoke online/offline simulado; Android scroll/double tap | jerarquía propuesta; filtros y estados completos; no pérdida de acciones | E.2; E.3 recomendado |
| E.5 Crear/detalle | `index.tsx`, `tasks/[id].tsx`, `components.tsx` solo shared | multimedia, permisos, destructive actions, audio local | typecheck/tests; Development Build cámara/GPS/audio/reinicio | adjuntos secundarios pero accesibles; contratos y cleanup intactos | E.2; E.4 |
| E.6 Importación/estados | `app/import.tsx`, `components.tsx` | selección/retry/duplicate import; FlatList | tests adapter existentes; smoke externo/error; Android lectura | selección persistente ante error; loading/empty/error/retry claros | E.2; E.4 |
| E.7 Pulido/validación | ajustes mínimos mobile UI, no backend/deps | fuente/rotación/safe area, regression visual | gates completos, Android Development Build, checklist accesibilidad | contraste/targets/font scale/rotation verificados; no dos sistemas visuales activos | E.3–E.6 |

Cada bloque debe ser commit independiente y conservar rollback sencillo. No modificar backend, SQLite, auth, sync, multimedia APIs ni tests existentes salvo que un cambio visual rompa una expectativa de compilación; no introducir tests de snapshots decorativos.

## 20. Riesgos y no objetivos

### Riesgos

- Reemplazar hex sin revisar contraste de texto pequeño.
- Hacer `Card` más suave y perder agrupación de errores/conflictos.
- Reordenar JSX junto con lógica y romper estados offline.
- Reducir targets para ganar densidad.
- Ocultar sync/conflict por preferir una UI “calmada”.
- Dynamic NativeWind classes no detectadas en build.
- Intentar validar cámara/audio/GPS sin Development Build.

### No objetivos

No implementar audio remoto B.2.2; nuevos endpoints; dark mode; mapas; background location/recording; waveform; nuevas dependencias/fuentes/icon packs; FAB sin necesidad probada; cambios de backend, Prisma, Docker, SQLite, navegación, autenticación o sincronización.

## 21. Decisión de preparación

La auditoría confirma base suficiente, deuda visual no bloqueante y plan incremental. La dirección recomendada es **Mulberry Focus con superficies Mulberry Soft**. No se requiere decisión adicional para comenzar.

# LISTO PARA IMPLEMENTAR E.2
