# P5 — E.6 Importación y estados

## Skill y dirección
Se utilizó `frontend-design` (identificador exacto). Aplicados: jerarquía intencional, una firma visual única y autocrítica contra patrones administrativos genéricos. La firma es el resumen de resultados en cuatro celdas y filas seleccionables con indicador de estado; Mulberry queda reservado para selección, foco y CTA.

## Línea base
Checkout `fix/ui`, HEAD `5be16c4 feat(ui): rediseñar detalle y adjuntos`, working tree limpio, stash histórico presente sin tocar. Línea base: typecheck OK, lint OK, backend 8 suites/80 tests, mobile 13 suites/122 tests.

## Flujo real e invariantes
Pantalla → consulta `fetchJsonPlaceholderTodos` → validación/normalización del adaptador → store local → detección por `sourceProvider/sourceExternalId` → selección por `externalId` → `store.importTasks` → feedback y marca importada. Timeout, límites, deduplicación, ownership, payload, orden y contratos permanecen intactos. Guards `loading`, `busy`, versionado de solicitud y selección conservada en error permanecen.

## Cambios visuales
`AppHeader`, explicación de fuente, estado inicial explícito, CTA de consulta, resumen fiable (recibidas/válidas/ya importadas/disponibles/seleccionadas), lista FlatList virtualizada y CTA final con contador. Elementos ya importados son filas deshabilitadas; selección usa `accessibilityState.checked`.

## Componentes
Se reutilizaron `Screen`, `AppHeader`, `AppButton`, `AppFeedback`, `StateMessage`, `Card` y primitives Mulberry. Se añadieron `SelectableRow` y `ResultSummary` en `mobile/src/ui/components.tsx`; ambos presentacionales, tipados, sin servicios ni navegación.

## Estados y accesibilidad
Inicial, cargando, error/reintento, sin resultados, resultados, ya importado, seleccionado, importando y resultado quedan diferenciados. Filas tienen rol checkbox, label contextual, checked/disabled y target de 44 px indirecto mediante composición. No hay truncamiento ni color como única señal.

## Responsive
FlatList permanece fuera de ScrollView; no se añadió virtualización anidada. Texto multiline, layout flexible y CTA al final del contenido. Fuente aumentada, rotación y pantalla estrecha requieren validación física.

## Archivos
- `mobile/app/import.tsx`
- `mobile/src/ui/components.tsx`
- `docs/P5_BLOCK_E6_IMPORT_STATES_REDESIGN.md`

## Pruebas y gates
Prueba focalizada ejecutada: mobile 13 suites, 122 tests OK. Gates finales: backend 8 suites/80 tests OK; suite completa 21 suites/202 tests OK; typecheck, typecheck:tests y lint OK; diff check OK.

## Limitaciones y checklist físico pendiente
Abrir importación/volver; cargar fuente; error de red/reintento; sin resultados; seleccionar/deseleccionar varias; ya importadas; doble toque; importar una/varias; Home sin duplicados; consulta repetida; mensaje largo; fuente aumentada; pantalla estrecha; rotación; modo avión; ausencia de warnings React.

No se ejecutaron Docker, EAS, Gradle ni emulador. Servicios, backend, persistencia, sincronización, dependencias, configuración y stash permanecen intactos. Sin commit ni push. Preparado para E.7 tras validación física.

## E.6.1 — Scroll y lenguaje orientado al usuario

### Problema físico y causa
La implementación anterior colocaba `FlatList` como hermano de header, resumen y CTA dentro de un `View flex-1`. Ese reparto competía por altura con contenido anterior; la lista no controlaba pantalla completa. `Screen` no contiene `ScrollView`, y no existía scroll vertical anidado, pero el viewport útil del listado quedaba reducido.

### Estructura desplazable
Antes: `Screen → View flex-1 → header/explicación/resumen/feedback + FlatList + CTA`.

Ahora: `Screen → FlatList` directo. `ListHeaderComponent` contiene encabezado, explicación, atribución, consulta, feedback y resumen. `data` contiene filas. `ListFooterComponent` contiene contador, CTA y padding inferior seguro. Existe un solo scroll vertical principal; no hay `FlatList` dentro de `ScrollView`, altura fija, `maxHeight` pequeña, CTA absoluto ni virtualización anidada.

### Lenguaje visible
Nombre principal: `Tareas de ejemplo`.

Descripción: `Explora tareas de demostración y agrega las que te resulten útiles a tu espacio.`

Consulta: `Consultar tareas de ejemplo`.

Atribución secundaria: `Contenido de demostración proporcionado por JSONPlaceholder.` La interfaz explica que son datos ficticios de demostración; `jsonplaceholder` solo conserva su nombre interno y procedencia técnica.

### Resumen y accesibilidad
`ResultSummary` muestra cuatro valores: recibidas, válidas, ya importadas y disponibles. `selected` aparece junto al CTA final, no como quinta celda. `SelectableRow` conserva identidad por `externalId`, rol checkbox, estado checked/disabled, label contextual y activación de fila completa.

### Pruebas y gates E6.1
Mobile focalizado: 13 suites/122 tests OK. Backend: 8 suites/80 tests OK. Suite completa: 21 suites/202 tests OK. Typecheck, typecheck:tests, lint y `git diff --check` OK.

### Limitaciones y checklist físico pendiente
Pendiente comprobar en Development Build: abrir/volver, consulta, scroll de primera a última fila, selección al principio/centro/final, CTA e inset inferior, ya importadas, importación, consulta repetida, error/retry, doble toque, estrecho, fuente aumentada, rotación, modo avión y warnings de virtualización/keys.

## E.6.2 — Lista contenida y acción persistente

### Problema físico
E.6.1 desplazaba toda la pantalla; con muchos resultados obligaba a recorrer la lista completa antes de alcanzar contador y CTA.

### Composición final
La estructura ahora es `Screen → View flex-1`: zona superior compacta, box de resultados `flex-1 min-h-0` y zona de acción `shrink-0`. La box contiene `FlatList className="flex-1"` con scroll vertical propio. El contador y `Importar seleccionadas` están fuera de `FlatList`, siempre accesibles y sin posición absoluta.

No existe `ScrollView` vertical alrededor de la lista ni segundo scroll vertical competidor. `Screen` conserva Safe Area. `contentContainerClassName` mantiene separación y padding inferior de la lista.

### Estados y responsive
Inicial, loading, error/retry, empty, resultados e importación permanecen en sus lugares correctos. La box conserva altura flexible mediante flex; no usa altura fija ni `maxHeight`. Texto puede envolver; cuatro métricas siguen en dos columnas. La última fila no queda cubierta por CTA.

### Accesibilidad
La box expone label contextual. `SelectableRow` mantiene checkbox, checked/disabled, label con título y estado, y activación de fila completa. Contador usa singular/plural: `1 tarea seleccionada` / `N tareas seleccionadas`. CTA mantiene busy y disabled.

### Pruebas y gates
Prueba focalizada: 3 tests OK. Suite mobile: 14 suites/125 tests OK. Suite backend: 8 suites/80 tests OK. Suite completa: 22 suites/205 tests OK. `typecheck`, `typecheck:tests`, `lint` y `git diff --check` OK.

### Checklist físico pendiente
Abrir Tareas de ejemplo, comprobar header no duplicado, consultar, confirmar zona superior fija, scroll únicamente en box, alcanzar primera/última fila, seleccionar inicio/centro/final, contador y CTA sin desplazamiento global, loading/doble toque, ya importadas, consulta repetida, error/Retry, estrecho, fuente aumentada, rotación, inset inferior, lector de pantalla y ausencia de warnings.

## E.6.3 — Scroll global y lista interna delimitada

### Evidencia y causa
Validación física Android confirmó box visible con viewport casi nulo. `flex-1 min-h-0` no bastaba: zona superior y CTA consumían casi todo el alto disponible. La lista quedó debajo de `Resultados` sin recorrido útil.

### Nueva composición
E6.2 usaba `Screen → View flex-1 → zona superior + box flex + CTA`. E6.3 usa `Screen → ScrollView global → zona superior + box delimitada + contador/CTA`. La box contiene `FlatList` interna con `nestedScrollEnabled`; el CTA permanece fuera de la lista y el scroll global permite llevar la composición completa a una posición cómoda.

La altura usa `useWindowDimensions` reactivo y política nombrada: ratio 46%, mínimo 176 px y máximo 420 px. El mínimo permite varias filas; máximo evita que la box domine pantallas grandes. Rotación recalcula altura. No hay tercera superficie desplazable, posición absoluta, `maxHeight` arbitrario ni virtualización desactivada.

### Scroll y warning
La excepción de scroll anidado está autorizada por este bloque y se limita a `ScrollView` global + `FlatList` interna. `nestedScrollEnabled` se activa para Android. Jest no monta `ImportScreen` en pruebas actuales, por lo que no demuestra gestos nativos ni permite afirmar ausencia del warning `VirtualizedLists should never be nested inside plain ScrollViews`; Metro/Development Build debe revisarlo físicamente. No se silenció ningún warning.

### Compactación, CTA y accesibilidad
Se eliminó el heading corporal duplicado; permanecen descripción, explicación ficticia, atribución secundaria y consulta. Contador y CTA están inmediatamente después de la box. Filas conservan identidad `externalId`, checkbox, checked/disabled y callback único. Screen conserva Safe Area e inset inferior.

### Pruebas y gates
Prueba focalizada: 3 tests OK. Suite mobile: 14 suites/125 tests OK. Backend: 8 suites/80 tests OK. Suite completa: 22 suites/205 tests OK. Typecheck, typecheck:tests, lint y diff check OK.

### Limitaciones y checklist físico
Pendiente verificar global/interno en Android: scroll desde header, box con varias filas, primera/última tarea, transferencia de gesto en extremos, selección sin accidentes, CTA persistente, loading/doble toque, estrecho, fuente aumentada, rotación, inset, lector, Metro y ausencia del warning de VirtualizedLists.

## E.6.4 — Contenedor virtualizado exterior

### Warning confirmado y causa
Android confirmó: `VirtualizedLists should never be nested inside plain ScrollViews with the same orientation...`. La causa fue `ScrollView` vertical exterior con `FlatList` vertical interior. `nestedScrollEnabled` solo ayuda con gestos Android; no elimina incompatibilidad ni warning.

### Decisión técnica
Se reemplazó el `ScrollView` exterior por `FlatList` exterior con unión tipada de secciones estables: `intro`, `results` y `actions`. La lista exterior recorre solo tres secciones; no contiene las 200 tareas directamente. RN 0.86.3 registra la lista interior mediante `VirtualizedListContext` en vez de encontrar un `ScrollView` plano. La lista interior conserva sus datos reales, virtualización, `externalId`, altura responsive y `nestedScrollEnabled`.

### Layout, keys y gestos
La sección `results` mantiene box delimitada con `useWindowDimensions`, mínimo 176, ratio 46% y máximo 420. La sección `actions` mantiene contador y CTA fuera de la lista interior, alcanzables con recorrido corto de la lista exterior. Keys exteriores son `intro/results/actions`; keys interiores son `record.externalId`. No hay ScrollView en `import.tsx`, tercera superficie, posición absoluta ni virtualización desactivada. La transferencia de gestos y windowing requieren validación Android.

### Prueba de warning
Se añadió prueba que monta `FlatList` exterior + `FlatList` interior, instala spy local de `console.error`, delega cada mensaje al original, restaura con `finally` y falla ante el warning estructural. Pasó sin warnings. Esto es evidencia automatizada del árbol virtualizado, no sustituto de Metro Android; la prueba no monta pantalla completa ni demuestra gestos nativos.

### Estados, accesibilidad y limitaciones
Estados inicial/loading/error/empty/resultados/importando permanecen. `SelectableRow` conserva checkbox, checked/disabled, labels y callback único. Resumen sigue con cuatro métricas y CTA separado. No se modificaron contratos de importación. Pendiente validar en Android: Metro sin warning, scroll global/interno, windowing, reciclaje, transferencia en extremos, selección durante desplazamiento, rotación, fuente aumentada, estrecho, inset y lector.

### Pruebas y gates E6.4
Prueba focalizada: 4 tests OK. Suite mobile: 14 suites/126 tests OK. Backend: 8 suites/80 tests OK. Suite completa: 22 suites/206 tests OK. `typecheck`, `typecheck:tests`, `lint` y `git diff --check` OK.

### Checklist físico
Recargar Metro; abrir Tareas de ejemplo; consultar; desplazar globalmente; poner box/CTA en pantalla; recorrer primera/última fila; cambiar dirección; seleccionar inicio/centro/final; contador; importar sin recorrer 200 filas globalmente; ya importadas; consulta repetida; error/Retry; doble toque; modo avión; rotación; fuente aumentada; estrecho; lector; revisar Metro; ausencia de warning anterior, warnings nuevos y keys duplicadas.
## E.6.5 — Lista única y acción persistente

### Intentos históricos descartados
E.6.3 (`ScrollView` vertical + `FlatList` vertical) produjo warning de listas virtualizadas anidadas. E.6.4 (`FlatList` exterior + `FlatList` interior) eliminó warning, pero la lista interna no respondió de forma fiable y no permitió recorrer todas las tareas. Más props de gesto no corrigen conflicto de ownership del desplazamiento ni garantizan transferencia nativa.

### Arquitectura definitiva
`Screen → View flex-1 → FlatList flex-1 + ActionBar shrink-0`. La lista única recibe `records` directamente, usa `externalId` como key y mantiene `ListHeaderComponent` para header, descripción, fuente compacta, consulta, feedback, cuatro métricas y heading `Resultados`. `ListEmptyComponent` diferencia inicial, loading, error y vacío. No hay `ScrollView`, segunda lista, altura responsive, `.map()` masivo ni windowing desactivado.

### Diseño y fricción
`frontend-design` llevó a conservar un solo flujo vertical: jerarquía superior breve, resultados como superficie continua mediante heading y filas compactas, y una firma Mulberry Night en la barra inferior. La barra está fuera de la lista, con borde superior, contador anunciado y CTA; `shrink-0` evita superposición, mientras `pb-lg` deja la última fila completamente visible. El usuario puede importar desde cualquier posición sin recorrer 200 tareas.

### Estados, accesibilidad e invariantes
Se mantienen consulta, loading, retry, error, vacío, selección, busy, feedback, tareas importadas y guards existentes. Filas mantienen checkbox, checked/disabled y target completo; CTA conserva disabled/loading/doble toque. Orden de lectura: header, fuente, resumen, resultados, filas, barra. Servicios, endpoint, timeout, Zod, normalización, deduplicación, ownership, store, persistencia, versionado y keys `externalId` no cambian.

### Pruebas y gates
Pruebas focalizadas cubren lista única, datos y keys reales, header, action bar, estados del CTA, selección, filas importadas, callback único, cuatro métricas, atribución y ausencia de título duplicado. Spy local de `console.error` delega mensajes inesperados, restaura con `finally` y verifica ausencia del warning; no silencia warnings globalmente.

### Deuda eliminada y limitaciones
Eliminados: secciones artificiales, lista interna, `nestedScrollEnabled`, `useWindowDimensions`, límites/clamp de box, keys exteriores y acoplamiento de pruebas a scroll anidado. La validación de gestos, lector, fuente aumentada, rotación e insets requiere Development Build físico; no se ejecutan Docker, EAS, Gradle ni emulador.

### Checklist físico
Recargar Metro; abrir, consultar y recorrer primera→última→primera; seleccionar inicio/medio/final; confirmar contador persistente; importar sin llegar al final; cero selecciones; loading/doble toque; ya importadas; consulta repetida; error/Retry; modo avión; fuente aumentada; pantalla estrecha; rotación; inset inferior; última fila visible; revisar Metro; ausencia de warning `VirtualizedLists` y keys.

## E.6.6 — ExampleBox y scroll interno explícito

### Requerimiento y diagnóstico
La evidencia física descartó E.6.3 (`ScrollView` + `FlatList`), E.6.4 (dos `FlatList`) y E.6.5 (lista global extensa): las dos primeras generaban conflicto o gesto defectuoso; E.6.5 hacía recorrer numerosos elementos antes de llegar a la acción.

### Arquitectura final
`Screen → ScrollView global → header, fuente, consulta, feedback, resumen, ExampleBox, contador y CTA`. `ExampleBox` es presentacional y recibe `title`, `items`, `keyForItem`, `renderItem`, estado vacío, etiqueta accesible y `maxHeight`. Contiene un único `ScrollView` interno delimitado, con `nestedScrollEnabled`, heading visible, superficie Mulberry Night, borde y radio. No existe `FlatList`, `VirtualizedList` ni `SectionList`.

### Altura, agrupación y rendimiento
`EXAMPLE_BOX_HEIGHT = 360` px: decisión estable y simple, aproximadamente tres a cinco filas en dispositivo habitual; evita colapso por `flex-1`. Las filas usan `externalId`, separación consistente y padding inferior. JSONPlaceholder entrega aproximadamente 200 registros conocidos; `.map()` sin virtualización prioriza interacción clara y elimina warning de listas anidadas. No sirve para miles: catálogo mayor requiere paginación, búsqueda o pantalla dedicada.

### Contador, CTA y accesibilidad
Contador y `Importar seleccionadas` siguen inmediatamente después de `ExampleBox`, dentro del scroll global, sin absolute ni footer virtualizado. Mantienen singular/plural, disabled, loading, busy y guard de doble toque. Scroll global e interno tienen indicadores; filas conservan checkbox, checked/disabled, label contextual y target completo. La última fila es alcanzable dentro de la box.

### Diseño y estados
`frontend-design` influyó en una jerarquía breve, box claramente delimitada como colección y barra de acción próxima: menos recorrido, menor carga cognitiva y CTA visible tras desplazamiento corto. Inicial, loading, error/retry, empty, resultados, importadas, selección, importando y resultado actualizado permanecen diferenciados; la box no colapsa sin contenido.

### Pruebas, gates y límites físicos
Pruebas focalizadas cubren scroll interno, ExampleBox, keys estables, selección, fila importada, callback único, CTA busy, cuatro métricas, atribución y warning ausente mediante spy local restaurado con `finally`. Validación física pendiente: Metro, gestos global/interno, altura, primera/última fila, accesibilidad, fuente, rotación, estrecho, inset y ausencia de selección accidental.
