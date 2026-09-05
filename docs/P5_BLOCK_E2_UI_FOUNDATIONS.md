# P5 — Bloque E.2: fundamentos visuales Mulberry Calm

## 1. Línea base

Checkout `fix/ui`, HEAD `a136b1b docs: definir auditoría funcional y sistema visual`. Working tree ya contenía modificación documental de E.1; no había cambios productivos inesperados. Stash intacto:

`stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable`

Línea base registrada en E.1: `yarn typecheck` pass; `yarn lint` pass; `yarn test` pass con backend 8 suites/80 tests y mobile 13 suites/122 tests.

## 2. Decisión visual

Implementado **Mulberry Focus + superficies Mulberry Soft**: fondo claro cálido, mulberry para CTA/foco, superficies blancas o rosa niebla, bordes suaves, sombras neutrales de baja opacidad y estados semánticos. No se implementaron dark mode, gradientes, iconos nuevos, FAB, animaciones complejas, fuentes ni dependencias.

## 3. Archivos modificados

- `mobile/src/ui/tokens.json`: fuente autoritativa actualizada.
- `mobile/src/ui/components.tsx`: primitives compartidos actualizados de forma compatible.
- `mobile/tailwind.config.js`: sombras neutrales alineadas con tokens.
- `mobile/app/_layout.tsx`: StatusBar `dark` para fondo claro.
- `docs/P5_BLOCK_E2_UI_FOUNDATIONS.md`: este informe.

No se modificaron pantallas estructuralmente ni lógica, servicios, contratos, datos, navegación, backend, SQLite, autenticación, sincronización, multimedia, dependencias o lockfile.

## 4. Tokens finales

`tokens.json` sigue siendo única fuente; `tokens.ts` mantiene exports existentes. Se añadieron/m mapearon tokens semánticos:

- Superficies: `background #FAF7F9`, `surface #FFFFFF`, `surfaceMuted #F5EAF0`, `surfaceElevated #FFFFFF`.
- Acción: `primary #8B2F63`, `primaryPressed #742650`, `primaryDeep #5F1F45`, `primarySoft #F5EAF0`, `textOnPrimary #FFFFFF`, `focus #8B2F63`.
- Texto: `text #292127`, `textMuted/textSecondary/muted #756872`, `disabledText #756872`.
- Estado: `success #477A67`, `successSoft #E7F0EC`, `warning #7A4A12`, `warningSoft #F7EEDC`, `error #B64250`, `errorSoft #F8E7E9`, `info #5F1F45`, `infoSoft #F5EAF0`.
- Estructura: `border #E2D7DD`, `borderStrong #BBA8B2`, `disabledSurface #EEE8EC`, overlay mulberry neutral.

Aliases antiguos (`surfaceElevated`, `secondary`, `accent`, `textSecondary`, `muted`, `textDisabled`, `bodySecondary`) se conservan para no romper pantallas durante migración posterior.

## 5. Contraste

Decisiones de contraste aplicadas:

- blanco sobre `primary` y `primaryPressed` para CTA;
- carbón sobre fondo/surface;
- `textMuted` se mantiene para texto secundario sobre blanco, no para información crítica;
- `warning` se oscurece desde `#A76B25` a `#7A4A12` para texto pequeño;
- error y success tienen fondos suaves para feedback, además de texto/borde;
- disabled usa superficie/texto diferenciados, no únicamente opacity;
- `borderStrong`/`focus` separan control normal y foco.

Ratios se diseñaron contra WCAG AA; no se añadió dependencia ni script nuevo. Validación instrumental final de todos los pares y fuente aumentada queda para E.7, especialmente en dispositivo.

## 6. Tipografía, spacing y radios

Tipografía del sistema, sin fuente nueva:

- display 32/40 700;
- heading 24/32 700;
- title 18/24 700;
- body 16/24 400;
- bodySmall y alias bodySecondary 14/20 400;
- label 13/18 600;
- caption 12/16 500;
- button 15/20 700.

Spacing conserva nombres consumidos y converge `xl/xxl` a 24; escala principal efectiva 4/8/12/16/24/32, con 40/48 para excepciones existentes. Radios: control 8, surface/card 16, pill 999. No se introdujeron alturas fijas nuevas que corten texto aumentado; textarea recibe mínimo amplio y padding superior.

## 7. Sombras y bordes

Sombras pasan de azul oscuro a neutro `#292127`: small 0.08/elevation 2, medium 0.12/elevation 4. Se añadió token `none`. Tailwind usa los mismos tonos y opacidades aproximadas. `Card` sigue compatible y aún conserva su estructura; reducción de nesting pertenece a E.4/E.5.

## 8. Cambios por componente

- `AppText`: variantes existentes preservadas; nuevos tokens se consumen mediante Tailwind; no impone truncamiento.
- `AppButton`: añade `size` (`md|lg`) y `fullWidth`; añade variante semántica `destructive`; conserva `danger` como alias compatible. Mantiene role, busy/disabled, loading, 44 px y pressed por opacity. Disabled ya no depende solo de opacity.
- `AppInput`: label/error/props nativas preservados; foco usa `focus`; borde normal más legible; multiline recibe mínimo 96 px y padding superior; disabled usa superficie/texto dedicados.
- `Card`: usos y props conservados; superficie clara, borde/radio y sombra suave.
- `AppBadge`: mismos tonos públicos; fondos suaves y texto semántico contrastado.
- `AppFeedback`: multiline/live region/alert solo error preservados; tonos usan fondos suaves y bordes semánticos.
- `StateMessage`: contrato conservado; no se cambió nesting de pantallas.
- `AppConfirmModal`: superficie/radio/overlay actualizados, `accessibilityViewIsModal` añadido, cancel/confirm/loading conservados y confirmación usa `destructive`.
- `Screen`/`AuthScreen`: sin cambios de safe area, keyboard avoiding o scroll.
- `StatusBar`: `style="dark"`, coherente con `background` claro.

## 9. Compatibilidad

Todos los consumidores existentes siguen usando sus imports y clases. No se cambiaron textos, callbacks, rutas ni flujo. `danger` permanece aceptado; migración de consumidores a `destructive` puede hacerse al entrar en composición E.4/E.5. No se dividió `components.tsx` para evitar un diff estructural innecesario.

## 10. Accesibilidad

Preservados roles, estados busy/disabled, labels de inputs, live region, alert exclusivo de error y targets mínimos. Añadido aislamiento semántico del modal. Estados siguen teniendo texto visible. Focus usa color mulberry y error conserva texto. Riesgos pendientes: contraste instrumental completo, fuente aumentada, rotación, foco real y validación Android física.

## 11. Pruebas y gates

No existen pruebas independientes de primitives que justifiquen modificar la suite existente; no se añadieron snapshots decorativos ni se modificaron tests existentes. La cobertura existente ejercitó compatibilidad de servicios y componentes.

Resultados posteriores a E.2:

| Comando | Resultado |
|---|---|
| `yarn typecheck` | Pass: mobile + backend |
| `yarn lint` | Pass |
| `yarn test` | Pass: backend 8 suites/80 tests; mobile 13 suites/122 tests |
| `git diff --check` | Pass |

Los tests mobile mantienen logs de auth en desarrollo ya documentados como P3.

## 12. Limitaciones y checklist físico

No se ejecutaron Android, Gradle, EAS ni build. Pendiente en Development Build:

- login/registro con teclado y fuente aumentada;
- safe area edge-to-edge;
- contraste y lectura de feedback largo;
- rotación;
- targets y doble toque;
- modal Back/foco;
- cámara/GPS/audio y adjuntos sin regresión visual.

No se rediseñó composición de login, registro, Home, detalle, creación ni importación.

## 13. Preparación E.3

E.2 deja primitives y tokens compatibles listos. E.3 puede migrar visualmente login/registro sin tocar contratos auth: aplicar jerarquía Mulberry, revisar teclado/fuente aumentada y eliminar clases directas únicamente dentro de esas pantallas.

# LISTO PARA IMPLEMENTAR E.3
