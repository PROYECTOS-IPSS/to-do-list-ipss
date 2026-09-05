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
