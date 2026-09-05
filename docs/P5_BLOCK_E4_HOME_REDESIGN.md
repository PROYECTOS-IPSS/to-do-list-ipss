# P5 — Bloque E.4: rediseño de Home y tarjetas

## 1. Línea base

E.3 estaba versionado en HEAD `4b6ce51 feat(ui): aplicar Mulberry Night a autenticación`. Stash conservado e intacto:

`stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable`

Línea base: typecheck pass; lint pass; backend 8 suites/80 tests; mobile 13 suites/122 tests. No se aplicó ni inspeccionó stash.

## 2. Diagnóstico de Home

`mobile/app/index.tsx` continúa como contenedor de estado y orquestación. Conserva TaskStore, `localId`, refs de mounted/version, persistencia de preferencias, sincronización, resolución de conflictos, guardas, miniaturas, GPS, foto, logout, modal y navegación. E.4 solo reorganiza presentación y mantiene callbacks.

Problemas corregidos visualmente:

- tres cards idénticas para resumen;
- filtros implementados como botones independientes con `✓` textual;
- TaskCard duplicaba apertura mediante título y “Ver detalles”;
- estado de completed dependía también de prefijo visual;
- orden de metadata y miniatura tenía menor jerarquía;
- composición compartida carecía de control segmentado reutilizable.

## 3. Jerarquía final

Home mantiene header y formulario existentes, pero ahora presenta:

1. marca, saludo real y logout secundario;
2. contexto “Tu espacio”;
3. feedback global/sync;
4. importación secundaria;
5. una superficie de resumen con Pendientes, Completadas y Total;
6. formulario crear/editar;
7. encabezado Tus tareas + sincronizar;
8. conflictos/revisión;
9. filtro segmentado Pendientes/Todas/Completadas;
10. loading/error/empty general/filtro vacío;
11. lista de tareas.

No se añadió FAB, gesto oculto, animación ni formulario colapsable.

## 4. Componentes extraídos

Se añadieron a `mobile/src/ui/components.tsx` dos primitives con consumidores reales:

- `TaskSummary`: recibe `total`, `pending`, `completed`; una sola superficie, tres columnas flexibles y labels visibles.
- `SegmentedControl<T>`: recibe valor, opciones, callback y disabled; mantiene orden y selección accesible (`tab`, `selected`).

No se creó un archivo por fragmento ni se mezcló lógica de servicios. `TaskCard` existente se conservó en su ubicación pública para evitar imports masivos.

## 5. Límites contenedor/presentación

`index.tsx` conserva toda lógica de negocio: no genera IDs, no accede a servicios desde primitives, no decide sync, no navega implícitamente y no cambia persistencia. Los componentes solo reciben valores y callbacks existentes.

## 6. Resumen y formulario

`TaskSummary` elimina tres superficies elevadas idénticas y mantiene los tres conteos reales. No usa color como única señal y tolera valores grandes mediante flex layout. El formulario mantiene título, descripción, GPS, foto, preview, creación/edición, loading, feedback y guards. No se modificaron callbacks ni textos.

## 7. Filtros

`SegmentedControl` reemplaza tres botones duplicados. Pendientes permanece primero; `filter` sigue siendo fuente de verdad; `preferences` sigue escribiéndose desde el efecto existente, no en cada render. Labels completos, targets de 44 px y estado selected accesible. No se añadieron contadores a segmentos.

## 8. TaskCard

Decisión de apertura: se conserva botón explícito “Ver detalles” como única affordance de apertura; título dejó de ser pressable. Así se evita callback duplicado y se preserva un target/label claro.

Orden final: título + estado → descripción → fecha/ubicación → miniatura → ver detalles → completar/reabrir, editar, eliminar. La eliminación usa variante `destructive`; callbacks y loading permanecen intactos. Key externa continúa siendo `localId` en `FlatList`; no se generan keys ni IDs nuevos. La miniatura conserva `imageUrl`/token recibidos y no cambia reconciliación.

## 9. Sync, conflictos y estados

No se modificó clasificación ni operación de sync. Feedback global sigue debajo del contexto, syncing usa el mensaje existente, conflictos/revisión permanecen visibles y acciones de resolución conservan guards/loading. Estados de carga, error/retry, lista vacía y filtro sin resultados siguen diferenciados.

## 10. Accesibilidad y responsive

- resumen usa labels textuales y una sola superficie;
- segmentos declaran role `tab`, selected y disabled;
- targets táctiles mínimos se conservan;
- TaskCard mantiene labels explícitos en apertura y acciones;
- feedback multilínea/live region se conserva;
- no se añadió truncamiento agresivo;
- layout flex evita ancho fijo del resumen;
- pantallas estrechas y fuente aumentada quedan para validación física;
- no se alteró safe area, FlatList, teclado, modal o navegación.

## 11. Verificación estática

La lista usa `keyExtractor={(task) => task.localId}`. No se introdujeron keys por índice, nuevos colores directos, nested FlatList, servicios en presentación ni cambios a `remoteId`/reconciliación.

## 12. Pruebas y gates

No se modificaron tests existentes ni se añadieron snapshots decorativos. Tests focalizados de primitives Home aún no existen; la cobertura actual de comportamiento continuó pasando.

Resultados posteriores:

| Comando | Resultado |
|---|---|
| `yarn workspace task-manager-mobile test --runInBand` | 13 suites, 122 tests pass |
| `yarn workspace task-manager-backend test --runInBand` vía suite completa | 8 suites, 80 tests pass |
| `yarn test` | backend 8 suites/80; mobile 13 suites/122 pass |
| `yarn typecheck` | Pass mobile + backend |
| `yarn typecheck:tests` | Pass |
| `yarn lint` | Pass |
| `git diff --check` | Pass |

## 13. Limitaciones y checklist físico

No se ejecutaron Android, Gradle, EAS, build ni Docker. Validar en Development Build:

- header/logout, resumen y valores grandes;
- crear texto, GPS y foto;
- editar, completar/reabrir, detalle;
- eliminar y cancelar modal;
- filtros y preferencia persistida;
- empty general y filtro vacío;
- error/retry, sync, 401 y conflicto/revisión;
- miniatura inmediata, reinicio y modo avión;
- fuente aumentada, teléfono estrecho, rotación y doble toque.

## 14. Archivos modificados

- `mobile/src/ui/components.tsx`
- `mobile/app/index.tsx`
- `docs/P5_BLOCK_E4_HOME_REDESIGN.md`

No se modificó lógica de negocio, servicios, repositorios, autenticación, sincronización, backend, SQLite, multimedia, GPS, importación, dependencias, lockfile o configuración nativa. No hubo commit ni push. Stash B.2.2 permanece intacto.

## 15. Preparación E.5

Home queda listo para continuar con crear/detalle y adjuntos sin cambiar contratos: estado permanece en `index.tsx`, primitives reciben datos/callbacks y TaskCard conserva identidad y acciones.

# LISTO PARA IMPLEMENTAR E.5
