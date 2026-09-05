# P5 — Bloque E.7: auditoría visual, accesibilidad y cierre Mulberry Night

## 1. Skill utilizada

Se utilizó obligatoriamente `frontend-design` (`skill://frontend-design`).

Decisiones influenciadas:

- Se mantuvo una sola firma visual: Mulberry Night, superficies oscuras escalonadas y mulberry reservado para acción, selección y foco.
- Se priorizó jerarquía de información sobre decoración: encabezado, contexto, acción, estado y contenido.
- Se conservaron componentes compartidos en lugar de crear una capa UI paralela.
- Se corrigieron solo contrastes y semántica accesible demostrables; no se hizo una limpieza estética masiva.
- Se mantuvo `ExampleBox` como colección acotada con scroll interno explícito, decisión validada físicamente en E.6.6.

Patrones evitados:

- dark/light toggle, tema alternativo, gradientes, FAB, iconografía nueva y animaciones complejas;
- tarjetas duplicadas por cada estado;
- componentes de una sola implementación;
- reescritura de servicios o traslado de lógica de negocio a presentación;
- colores directos nuevos, snapshots decorativos y virtualización anidada adicional;
- truncamiento de mensajes, alturas rígidas para texto y comunicación basada solo en color.

Autocrítica visual final: la app tiene identidad reconocible y consistente, pero sigue siendo deliberadamente sobria y dependiente de la validación física para foco real, escalado de fuente, gestos y densidad. La única concesión de riesgo controlado es conservar un scroll interno no virtualizado para `ExampleBox`; su límite conocido es un catálogo grande y fuentes muy aumentadas. No se añadieron adornos para compensar esa limitación.

## 2. Línea base obligatoria

Capturada antes de editar.

| Campo | Evidencia |
|---|---|
| Rama | `fix/ui` |
| HEAD | `209f144 fix(ui): mejorar experiencia de importación` |
| Commit de cierre E.6 | `209f144 fix(ui): mejorar experiencia de importación` |
| Working tree | Limpio antes de E.7; sin cambios productivos inesperados |
| `git diff --check` | Pass |
| Stash protegido | `stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable` |
| Stash | Solo se listó; no se aplicó, inspeccionó, eliminó, renombró ni modificó |
| `yarn typecheck` | Pass: mobile + backend |
| `yarn typecheck:tests` | Pass |
| `yarn lint` | Pass |
| `yarn test` | Backend: 8 suites / 80 tests. Mobile: 14 suites / 126 tests. |
| Warnings existentes | Logs `[auth]` conocidos y documentados en fases anteriores; no se observaron warnings de keys ni de `VirtualizedLists` en esta línea base |

## 3. Metodología y evidencia

- Lectura estática de `_layout`, cinco pantallas, primitives, tokens, Tailwind y pruebas UI.
- Revisión de documentación E.1–E.6, incluida la historia de decisiones y límites de `ExampleBox`.
- Búsqueda estática de colores, dimensiones, truncamiento, scrolls, keys y declaraciones de accesibilidad.
- Cálculo local de contraste sRGB con fórmula WCAG; sin dependencia nueva.
- Prueba focalizada de primitives y `AuthenticatedImage`.
- Revisión del diff únicamente en archivos de presentación y pruebas UI.
- No se inspeccionó el stash.

Distinción de evidencia:

- **Verificado automáticamente:** typecheck, lint, tests, diff check, roles/props de primitives, labels de imágenes, keys y ausencia de cambios en áreas protegidas.
- **Inspeccionado estáticamente:** composición, tokens, jerarquía, spacing, safe area, navegación, multimedia visual, responsive y callbacks.
- **Validado físicamente en bloques anteriores:** decisiones de composición de `ExampleBox` y scroll interno explícito documentadas en E.6.6.
- **Pendiente de validación física E.7:** dispositivo Android/Development Build, lector de pantalla, foco nativo, fuente aumentada, rotación, gestos, insets y ausencia de warnings en Metro.

## 4. Inventario visual

| Elemento | Consumidor | Sistema/variantes | Accesibilidad y estados | Resultado |
|---|---|---|---|---|
| Layout global | `_layout.tsx` | `SafeAreaProvider`, `Stack`, `StatusBar light`, `colors.background` | Un solo proveedor; fondo oscuro del Stack | Correcto |
| Pantalla segura | `Screen` | `SafeAreaView` con cuatro edges, `bg-background`, padding `lg` | Un consumidor de inset por pantalla | Correcto |
| Auth layout | `AuthLayout`, login, registro | superficie `surface`, radio `large`, sombra `small` | teclado, scroll, labels visibles, loading | Correcto |
| Marca | `AppLogo` | `primarySoft`, `primaryHighlight`, compacta o completa | texto visible; no es control | Correcto |
| Encabezado | `AppHeader` | logo compacto, título, volver, contenido derecho | volver con role button y label `Volver` | Correcto; título puede envolver físicamente |
| Tipografía | `AppText` | display, heading, title, body, bodySecondary, caption, label, button | sin `numberOfLines`; texto visible | Correcto |
| Botón | `AppButton` | primary, secondary, ghost, destructive; alias danger; md/lg | role button, 44 px, disabled, busy, loading, hitSlop | Corregido: contraste, foco y spinner |
| Input | `AppInput` | label visible, placeholder, error, focus, disabled, multiline | label automática, error cercano, props nativas | Correcto; autofill físico pendiente |
| Card | `Card` | `surfaceElevated`, border, radio, sombra small | soporte mínimo de live region/role | Correcto; nesting existente clasificado menor |
| Badge | `AppBadge` | neutral, success, warning, error, accent | texto semántico visible | Corregido: accent dejó de usar texto de bajo contraste |
| Feedback | `AppFeedback` | success, error, info, warning | error alert; live region polite; multiline | Correcto |
| Estado | `StateMessage` | neutral, error, success, retry | texto y CTA próximo | Corregido: error alert y live region |
| Resumen Home | `TaskSummary` | una superficie, tres métricas | role summary, labels visibles | Correcto |
| Filtros | `SegmentedControl` | tres tabs, selected/disabled | role tablist/tab, selected y label | Correcto |
| Tarea | `TaskCard` | estado, metadata, imagen, detalle, acciones | labels de acciones, keys `localId` | Corregido: label de miniatura |
| Imagen protegida | `AuthenticatedImage` | local/remota, fallback, loading, retry/error | label propagable, error textual | Corregido: label útil en detalle |
| Sección detalle | `DetailSection` | surface/flat, title, description, action | título header; contenido libre | Corregido: retirado summary incorrecto |
| Metadata | `MetadataRow` | label/value, divisor | texto visible; sin interacción | Correcto |
| Adjuntos | `AttachmentSection` | fotografía/audio, add/loading, empty | acción con label y estados | Correcto |
| Empty inline | `InlineEmptyState` | dashed border, surfaceMuted | texto guía visible | Correcto |
| Ubicación | `LocationPanel` | metadata o empty | heading de sección y texto | Correcto |
| Zona destructiva | `DangerZone` | errorSoft, border error, CTA destructiva | copy explícita de irreversibilidad | No consumida en pantallas auditadas; fuera de alcance crear uso |
| Selección importación | `SelectableRow` | checkbox, selected, disabled | role checkbox, checked/disabled, label contextual | Correcto |
| Resultado importación | `ResultSummary` | cuatro métricas, wrap, surfaceMuted | role summary y labels | Correcto |
| ExampleBox | `ExampleBox` | surfaceElevated, border primary, altura máxima explícita | label del box y scroll interno | Correcto según E.6.6; límite documentado |
| Modal | `AppConfirmModal` | overlay, surface, destructive confirm | aislamiento modal, back, cancel/loading | Correcto |
| Barra de importación | `import.tsx` | contador live + CTA después de box | selected count anunciado, busy/disabled | Correcto |

## 5. Matriz por pantalla

| Pantalla | Jerarquía | Spacing | Componentes | Estados | Accesibilidad | Responsive | Clasificación |
|---|---|---|---|---|---|---|---|
| Login | marca → heading → ayuda → campos → CTA → enlace | AuthLayout y escala tokenizada | compartidos; sin JSX visual duplicado adicional | validación, error, loading, redirect | labels, submit por teclado, busy/disabled | scroll y keyboard avoiding; físico pendiente | Correcto |
| Registro | misma jerarquía que login con nombre adicional | misma composición | compartidos | validación, error, loading, redirect | labels y orden de campos | scroll y keyboard avoiding; físico pendiente | Correcto |
| Home | marca/saludo → contexto → feedback → importar → resumen → crear → tareas → filtros → lista | resumen compacto, card de creación, FlatList | `TaskSummary`, `TaskCard`, `SegmentedControl`, estados | restore, loading, empty, retry, offline, sync, conflicto, busy, modal | roles/labels/selected/busy, keys `localId` | FlatList única, flex y texto envolvente; físico pendiente | Correcto; contraste compartido corregido |
| Detalle | header/estado → título → información → ubicación → fotografías → notas de voz | secciones consistentes; preview y filas separadas | `DetailSection`, `AttachmentSection`, `LocationPanel`, `AuthenticatedImage` | load/error/retry, empty, recording, preview, playing, deleting, modal | header, botones, labels de imágenes, texto de audio | ScrollView única; media con altura particular; físico pendiente | Corregido |
| Importación | header → fuente → consulta → feedback/resumen → `ExampleBox` → contador/CTA | box acotado y CTA posterior | `AppHeader`, `ExampleBox`, `SelectableRow`, `ResultSummary` | inicial, loading, error/retry, empty, selected, imported, busy | checkbox, checked/disabled, live count, labels | ScrollView global + scroll interno autorizado por E.6.6; físico pendiente | Correcto según arquitectura vigente |

## 6. Hallazgos clasificados

| ID | Hallazgo | Archivo/componente | Impacto demostrado | Clasificación | Acción |
|---|---|---|---|---|---|
| H1 | `secondary` usaba `primaryDeep` sobre superficies oscuras; ratio `1.33:1` sobre `surfaceMuted` | `components.tsx`, `AppButton` | texto de acción secundaria no alcanza AA | Defecto accesible | Corregido con `primaryHighlight` |
| H2 | badge `accent` usaba `primaryDeep` sobre `primarySoft`; ratio `1.22:1` | `components.tsx`, `AppBadge` | estado/contexto de badge difícil de leer | Defecto accesible | Corregido con texto y borde `primaryHighlight` |
| H3 | spinner no-primary usaba `primary` sobre `disabledSurface`; ratio `1.94:1` durante loading | `components.tsx`, `AppButton` | busy podía quedar visualmente débil | Defecto accesible | Corregido usando `disabledText` mientras loading está disabled |
| H4 | `StateMessage tone="error"` no declaraba role alert | `components.tsx`, `StateMessage` | errores de carga/retry no tenían semántica alert | Defecto accesible | Corregido; live region polite conservada |
| H5 | `DetailSection` declaraba `summary` para toda sección | `components.tsx`, `DetailSection` | role incorrecto según propósito; summary reservado para resúmenes | Defecto accesible | Retirado; título ahora es header |
| H6 | imágenes de Home, TaskCard y detalle no recibían label contextual | `index.tsx`, `components.tsx`, `[id].tsx` | lector no conoce contenido de miniatura/preview | Defecto accesible | Labels propagables y labels de consumidores |
| H7 | dos consumidores usaban alias `danger` aunque API conceptual vigente es `destructive` | `[id].tsx` | inconsistencia semántica mecánica | Inconsistencia menor | Migrado; alias conservado por compatibilidad |
| H8 | `borderStrong` daba `2.42:1` contra `surface` en inputs | `tokens.json`, AppInput | borde normal no llegaba a objetivo 3:1 de control UI | Defecto accesible | Ajustado mínimamente a `#826477`, ratio `3.32:1` |
| H9 | `ExampleBox` conserva `maxHeight=360` y scroll interno | `components.tsx`, `import.tsx` | límite conocido en catálogo grande/fuente aumentada | Correcto según E.6.6 | No modificar; documentar límite físico |
| H10 | nesting de cards en previews/estados | Home/detalle | ruido visual potencial, sin rotura confirmada | Inconsistencia menor | No reestructurar; E.5/E.6 ya fijaron composición vigente |
| H11 | `primaryPressed`, aliases y otras variantes tienen uso limitado | tokens | deuda de limpieza, no defecto observable confirmado | Fuera de alcance | No eliminar API/tokens públicos |

No se detectaron cambios funcionales, callbacks duplicados nuevos, keys inestables, `numberOfLines`, `StyleSheet`, estilos inline nuevos, servicios dentro de primitives, segunda fuente de tokens o virtualización nueva.

## 7. Correcciones por archivo

### `mobile/src/ui/components.tsx`

- Añadido `accessibilityLabel` opcional a `AuthenticatedImage` y propagado a `AppImage`.
- `AppBadge accent`: `primaryHighlight` para texto y borde sobre `primarySoft`.
- `AppButton secondary`: `primaryHighlight` para texto.
- `AppButton`: borde/foco visible con clases existentes; spinner de loading usa `disabledText` en superficie disabled.
- `StateMessage`: error anuncia `alert`; estado mantiene live region polite.
- `Card`: acepta solo props de accesibilidad necesarias para estado, sin nueva abstracción.
- `DetailSection`: título `header`; se elimina role `summary` incorrecto.
- `TaskCard`: miniatura recibe label contextual.

### `mobile/app/index.tsx`

- Preview local recibe label `Vista previa de la fotografía`.
- Callback, persistencia, foto y composición no cambian.

### `mobile/app/tasks/[id].tsx`

- Imágenes reciben label con filename.
- `danger` migrado mecánicamente a `destructive` en eliminar imagen/audio.
- Carga, audio local, transporte, filesystem, reconciliación y callbacks no cambian.

### `mobile/src/ui/tokens.json`

- `borderStrong` pasa de `#6B5060` a `#826477` para alcanzar `3.32:1` contra `surface` en input. Cambio mínimo, motivado por contraste de control UI.

### Pruebas UI

- Se agregó cobertura focalizada para role alert de error y header de sección.
- Se extendió prueba de `AuthenticatedImage` para verificar label propagado.
- No snapshots decorativos ni pruebas de color masivas.

## 8. Sistema Mulberry Night final

| Grupo | Decisión vigente |
|---|---|
| Fondo | `background #151116`; StatusBar clara |
| Superficies | `surface #211820`, `surfaceMuted #2A1F28`, `surfaceElevated #30232D` |
| Acción | `primary #8B2F63`, pressed `#742650`, highlight `#D98AB3` |
| Texto | `text #F7F1F4`, secundarios `#C7B7C0`, disabled `#8E8188` |
| Estado | success, warning, error, info con fondos soft y texto/borde semánticos |
| Estructura | `border #493842`, `borderStrong #826477`, `focus #D98AB3` |
| Overlay | `rgba(10, 7, 9, 0.72)` solo en tokens/configuración legítima |
| Elevación | `small` para cards; `medium` para modal; sombras neutras en Tailwind |
| Variantes | primary, secondary, ghost, destructive; `danger` queda alias compatible sin consumidores vigentes |

No se cambió la paleta base ni se añadió tema alternativo.

## 9. Tokens

`mobile/src/ui/tokens.json` sigue siendo fuente autoritativa; `tokens.ts` solo exporta esa fuente y Tailwind la consume.

- Referencias de color, spacing, radios y tipografía de Tailwind derivan de `tokens.json`.
- `primaryDeep`, `primaryPressed`, `secondary`, `accent`, `textSubtle`, `textDisabled`, `muted`, `xl` y otros aliases/valores tienen uso limitado o indirecto; se conservan por compatibilidad pública y no se eliminan en auditoría visual.
- No se encontraron referencias productivas a una segunda paleta.
- Sombras rgba de `tailwind.config.js` son configuración legítima alineada con sombras neutrales Mulberry Night; no son colores de componente residuales.
- Spacing efectivo: `4/8/12/16/24/32`, con `40/48` para separaciones de auth/marca existentes.
- Radios: `8` controles, `16` superficies, `999` pill.

## 10. Tipografía

- display `32/40/700`: título de Home/detalle.
- heading `24/32/700`: secciones y formularios.
- title `18/24/700`: cards y encabezados.
- body `16/24/400`: lectura y contenido.
- bodySecondary `14/20/400`: ayuda y metadata secundaria.
- caption `12/16/500`: metadata no crítica.
- label `13/18/600`: labels y estados.
- button `15/20/700`: acciones.

No existen headings duplicados introducidos por E.7, fuentes nuevas ni `numberOfLines`. Labels permanecen visibles. Textos de error, instrucciones y estado de audio no tienen altura rígida. Wrapping, fuente aumentada y textos largos requieren prueba física.

## 11. Spacing, densidad y superficies

- `Screen` aporta inset y gutter global una sola vez.
- Auth conserva superficie contenida y scroll con teclado.
- Home conserva resumen único y card de creación; no se comprimen targets.
- Detalle usa secciones claras para información, ubicación, fotos y audio.
- Importación conserva box delimitado, contador y CTA próximos.
- `ExampleBox` no se altera: `maxHeight={360}` es decisión validada físicamente en E.6.6, con límite en rotación/fuente aumentada.
- Cards anidadas de previews/estados quedan clasificadas como deuda menor, sin evidencia de rotura; no se hace reescritura masiva.

## 12. Feedback y estados

- `AppFeedback`: success/error/info/warning; error `alert`; todos live `polite`; mensajes multilínea.
- `StateMessage`: neutral, error y success; error ahora `alert`; retry permanece como botón cercano.
- Loading no se confunde con vacío: títulos separados para consulta/carga.
- Importación distingue inicial, loading, error/retry, vacío, seleccionada, ya importada, busy y resultado.
- Home distingue restore, empty, filter empty, offline, sync y conflicto/revisión.
- Detalle distingue carga, error/not found, error de imagen, audio recording/stopping/preview/playing/persisting y empty.

## 13. Accesibilidad

Verificación estática:

- botones: role button, labels contextuales donde hace falta, state disabled/busy, target visual mínimo 44 px y `hitSlop`;
- inputs: labels visibles y `accessibilityLabel` derivada del label; errores junto al campo;
- tabs: role tablist/tab y `selected`/`disabled`;
- filas importables: role checkbox y `checked`/`disabled`;
- resúmenes: role summary solo en `TaskSummary` y `ResultSummary`;
- secciones: títulos con role header;
- feedback/errores: live region y alert donde corresponde;
- modal: `accessibilityViewIsModal`, cancelación por back y acciones nombradas;
- imágenes informativas: labels de preview, miniatura y foto autenticada;
- audio: duración y estados en texto, no solo color;
- keys: `localId`, `identity`, `audio.id`, `externalId`, `operationId`; sin índices;
- no se agregaron `accessible` falsos, silenciamiento global de warnings ni affordances duplicadas.

La prueba RNTL de role alert usa el prop observable porque la versión instalada no expone ese role mediante `getByRole`; no se relaja la implementación accesible.

## 14. Responsive y texto aumentado

Inspección estática:

- Auth: `KeyboardAvoidingView` + `ScrollView`, contenido grow, sin altura fija.
- Home: `FlatList` única, flex en resumen/header, imagen de preview particular `180px`.
- Detalle: `ScrollView` única, contenido multiline; previews `h-52` y miniaturas `h-40` son media, no texto.
- Importación: `ScrollView` global y scroll interno de `ExampleBox` autorizado por E.6.6.
- Controles: min-height 44/48 y flex; no se detectaron columnas rígidas para texto.
- `max-w-xl` de auth limita ancho, no altura ni lectura.
- No existen `numberOfLines`, `minHeight`/`maxHeight` aplicados a mensajes; `maxHeight` solo delimita `ExampleBox`.

Validación física pendiente para teléfono estrecho, rotación, fuente aumentada, gesto en extremos de `ExampleBox`, CTA e inset inferior.

## 15. Safe area y barras del sistema

- Root: un `SafeAreaProvider`.
- Cada pantalla visible: un `Screen` con `SafeAreaView` y cuatro edges.
- Auth, Home, detalle e importación no agregan otro consumidor de safe area.
- Stack usa `contentStyle` desde `colors.background`.
- StatusBar usa `style="light"` sobre fondo oscuro.
- Teclado usa composición existente de Auth; modal usa overlay propio.

No se ejecutaron emulador, Gradle, EAS ni Development Build; navegación Android, nav bar, rotación y flashes quedan pendientes de validación física.

## 16. Botones e inputs

`AppButton` mantiene API `primary | secondary | danger | destructive | ghost`, `md | lg`, `loading`, `disabled`, `fullWidth`, labels y callbacks. `danger` permanece solo como alias de compatibilidad; consumidores vigentes usan `destructive`.

- Primary: crear/guardar/confirmar/importar.
- Secondary: importar, adjuntar, añadir.
- Ghost: volver, editar, quitar, acciones alternativas.
- Destructive: eliminar.
- Loading: role y busy permanecen; ancho no depende del texto mientras aparece spinner.
- Focus: borde `focus` explícito junto al patrón existente de input.
- Disabled: superficie y texto dedicados, no solo opacity.

Login, registro y editor Home mantienen labels, placeholders, Zod, callbacks, secure text, teclado, multiline, `onSubmitEditing`, loading y bloqueo de doble acción. No se modificaron validaciones ni payloads.

## 17. Cards, contenido y multimedia visual

- `TaskCard` mantiene una sola affordance de apertura (`Ver detalles`) y acciones separadas.
- `TaskSummary` es una superficie única.
- Detalle mantiene `DetailSection`/`AttachmentSection` sin mover lógica.
- Imágenes autenticadas conservan fallback local/remoto, retry y headers; E.7 solo añade label.
- Preview Home conserva tamaño particular y ahora tiene label.
- Audio local B.2.1 no cambia transporte, metadata, filesystem, reproducción ni sincronización; estados permanecen expresados con texto.
- No se implementó audio remoto B.2.2.

## 18. Navegación

- Root y rutas no cambian.
- `AppHeader` mantiene volver con callback único.
- Home conserva navegación a importación y detalle.
- Login/registro conservan links y redirect.
- Modal conserva back/cancelación.
- No se añadieron affordances de navegación ni callbacks nuevos.

## 19. Contraste

Ratios calculados localmente con colores finales de `tokens.json`, sRGB y redondeo a dos decimales:

| Par | Ratio |
|---|---:|
| text / background | 16.77:1 |
| text / surface | 15.49:1 |
| textSecondary / surface | 9.01:1 |
| textSecondary / surfaceMuted | 8.27:1 |
| textOnPrimary / primary | 7.82:1 |
| primaryHighlight / background | 7.33:1 |
| primaryHighlight / primarySoft | 5.68:1 |
| error / errorSoft | 4.33:1 |
| success / successSoft | 5.28:1 |
| warning / warningSoft | 6.25:1 |
| info / infoSoft | 5.68:1 |
| disabledText / disabledSurface | 4.08:1 |
| focus / surface | 6.77:1 |
| borderStrong / surface | 3.32:1 |

El objetivo AA se alcanza en pares textuales evaluados. `borderStrong` fue elevado mínimamente porque el valor anterior daba `2.42:1` en inputs. `border` normal no se usa como único indicador de estado; no se declara certificación WCAG completa. Contraste de foco real, anti-aliasing, fuentes aumentadas y colores nativos requieren dispositivo.

## 20. Pruebas

- Focalizada E.7: `yarn workspace task-manager-mobile test --runInBand src/ui/__tests__` — 2 suites / 10 tests pass.
- Cobertura agregada: role alert y header de sección; label de `AuthenticatedImage`.
- Pruebas existentes de importación, selección, callback único, estado busy, summary, keys y ausencia de warning se mantienen.
- No snapshots decorativos.
- La línea base anterior y sus conteos quedan registrados en sección 2.

## 21. Gates

Resultados reales de cierre:

| Comando | Resultado |
|---|---|
| `git diff --check` | Pass |
| `git status --short` | 6 archivos tracked modificados y este informe nuevo; solo cambios esperados de E.7 |
| `git diff --stat` | 6 archivos tracked; 29 inserciones / 20 eliminaciones. El informe nuevo es untracked y no aparece en `git diff --stat` |
| `git diff -- mobile/src/services backend backend/prisma package.json mobile/package.json yarn.lock` | Salida vacía |
| `yarn workspace task-manager-mobile test --runInBand` | 14 suites / 127 tests pass |
| `yarn workspace task-manager-backend test --runInBand` | 8 suites / 80 tests pass |
| `yarn typecheck` | Pass: mobile + backend |
| `yarn typecheck:tests` | Pass |
| `yarn lint` | Pass |
| `yarn test` | Backend: 8 suites / 80 tests. Mobile: 14 suites / 127 tests. |

Los logs `[auth]` observados en la suite mobile son los conocidos y documentados; no aparecieron errores de test, warnings de keys ni warnings de `VirtualizedLists`.

No se ejecutaron Docker, Gradle, EAS ni emuladores.

## 22. Limitaciones

- No hay validación física E.7 disponible en este checkout.
- Pendientes: lector de pantalla, foco nativo, fuente aumentada, rotación, teléfono estrecho, teclado/fill, nav bar Android, flashes, gestos y Metro.
- `ExampleBox` usa `maxHeight=360` y `.map()` sin virtualización por decisión E.6.6; no es solución para miles de registros.
- La auditoría es estática/instrumental parcial; no equivale a certificación WCAG completa.
- Logs de auth conocidos siguen fuera de alcance y no son regresión visual.

## 23. Checklist físico final

### Global

- [ ] StatusBar clara sobre fondo oscuro.
- [ ] Safe area superior/inferior sin doble padding.
- [ ] Fondo sin flashes claros al navegar.
- [ ] Volver y transiciones sin affordances duplicadas.
- [ ] Rotación portrait/landscape.
- [ ] Teléfono estrecho.
- [ ] Fuente aumentada.
- [ ] Modo avión y mensajes offline.
- [ ] Mensajes largos sin corte.
- [ ] Doble toque no duplica acciones.

### Auth

- [ ] Login.
- [ ] Registro.
- [ ] Teclado y campos inferiores visibles.
- [ ] Autofill Android.
- [ ] Errores completos y cercanos.
- [ ] Loading/disabled/busy.
- [ ] Navegación entre formularios.

### Home

- [ ] Saludo y resumen.
- [ ] Filtros y selected.
- [ ] Crear/editar.
- [ ] Completar/reabrir.
- [ ] Eliminar y cancelar modal.
- [ ] Sincronizar.
- [ ] Conflictos/revisión.
- [ ] Empty general.
- [ ] Retry.
- [ ] Miniaturas y labels.

### Detalle

- [ ] Ubicación.
- [ ] Dos imágenes.
- [ ] Retry de imagen.
- [ ] Eliminar imagen.
- [ ] Grabar audio local.
- [ ] Preview.
- [ ] Guardar.
- [ ] Reproducir.
- [ ] Eliminar audio.
- [ ] Modal.
- [ ] Volver.

### Importación

- [ ] Scroll global.
- [ ] `ExampleBox`.
- [ ] Scroll interno.
- [ ] Primera y última fila.
- [ ] Selección/deselección.
- [ ] Ya importadas.
- [ ] Contador.
- [ ] CTA.
- [ ] Error/retry.
- [ ] Sin warning de listas en Metro.

### Accesibilidad

- [ ] Labels útiles.
- [ ] Roles correctos.
- [ ] selected/checked.
- [ ] disabled/busy.
- [ ] live regions.
- [ ] Modal aislado.
- [ ] Targets táctiles.
- [ ] Contraste en dispositivo.
- [ ] Lector de pantalla si está disponible.

### Logs

- [ ] Sin warnings de keys.
- [ ] Sin warning de VirtualizedLists.
- [ ] Sin errores React.
- [ ] Solo logs conocidos documentados.

## 24. Invariantes y áreas protegidas

- Servicios móviles no modificados.
- Backend, Prisma y migraciones no modificados.
- SQLite, repositorios, sincronización, conflictos, GPS, cámara, audio funcional, endpoints y transporte no modificados.
- Validación Zod, autenticación, SecureStore y navegación no modificados.
- Dependencias, `package.json` y `yarn.lock` no modificados.
- `ExampleBox` vigente: scroll interno no virtualizado y `maxHeight` explícito.
- Callbacks, guards, keys estables y safe area preservados.
- Stash protegido presente e intacto.
- No commit ni push.

## 25. Estado final y preparación

Gates automatizados obligatorios pasan. Código preparado para validación física.

**Estado final:** `LISTO PARA VALIDACIÓN FÍSICA E.7`

La documentación general puede incorporar este informe como cierre del rediseño: Mulberry Night queda como sistema único, con correcciones visuales/accesibles mínimas y límites físicos explicitados.
