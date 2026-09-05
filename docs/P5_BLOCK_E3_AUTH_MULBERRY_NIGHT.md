# P5 — Bloque E.3: Mulberry Night y autenticación

## 1. Estado inicial

E.2 estaba versionado en HEAD `4027aa6 feat(ui): implementar fundamentos visuales Mulberry Calm`. Working tree limpio al inicio. Stash no aplicado ni inspeccionado:

`stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable`

Línea base E.2: typecheck pass; lint pass; backend 8 suites/80 tests; mobile 13 suites/122 tests.

## 2. Cambio de dirección

La única paleta autoritativa pasó de Mulberry Calm claro a **Mulberry Night**. Fondo carbón ciruela, superficies oscuras diferenciadas, texto cálido, mulberry para acción y highlight rosado para foco/enlaces. No se añadió selector de tema ni segundo árbol de tokens.

## 3. Tokens finales

`mobile/src/ui/tokens.json` conserva la fuente única. Valores principales:

| Grupo | Tokens |
|---|---|
| Fondo/superficie | `background #151116`, `surface #211820`, `surfaceMuted #2A1F28`, `surfaceElevated #30232D` |
| Acción | `primary #8B2F63`, `primaryPressed #742650`, `primaryDeep #5F1F45`, `primaryHighlight #D98AB3`, `primarySoft #382330` |
| Texto | `text #F7F1F4`, `textMuted/textSecondary #C7B7C0`, `textSubtle #A995A0`, `textOnPrimary #FFFFFF` |
| Estructura | `border #493842`, `borderStrong #6B5060`, `focus #D98AB3` |
| Estados | success `#72B89A/#203A31`, warning `#E0A65B/#3B2C1C`, error `#E06B78/#41242A`, info `#D98AB3/#382330` |
| Disabled/overlay | `disabledSurface #2A2429`, `disabledText #8E8188`, `overlay rgba(10,7,9,.72)` |

Warning mantiene tono luminoso para indicador sobre fondo oscuro; no se usa como texto sobre superficie clara. PrimaryHighlight se usa en logo y links, no como fondo de CTA con texto blanco.

## 4. Contraste

Se conservaron pares contrastados: texto cálido sobre background/surface, blanco sobre primary, highlight sobre fondos oscuros, estados con texto + fondo semántico y bordes visibles. Disabled usa superficie y texto diferenciados. No se añadió dependencia de contraste.

Validación física/instrumental completa —incluyendo placeholder, fuente aumentada, focus real y estados Android— queda pendiente para E.7; la suite no contiene herramienta WCAG ni pruebas visuales de primitives.

## 5. Componentes y arquitectura

Se añadió `AuthLayout` en `mobile/src/ui/components.tsx` como composición reutilizable: conserva `AuthScreen` para safe area, `KeyboardAvoidingView` y scroll, y proporciona una superficie auth oscura común. No contiene AuthProvider, validación, API ni lógica de negocio.

`AppLogo` usa primarySoft/primaryHighlight. Primitives existentes conservan imports y contratos. E.2 ya había añadido `destructive`, `size` y `fullWidth` a `AppButton`; E.3 mantiene alias `danger`. Feedback, input, card, badge, modal y estados reciben tema oscuro automáticamente vía tokens. Tailwind conserva sombras neutrales oscuras.

No se dividió `components.tsx`: evitar barrel paralelo, ciclos y diff innecesario. `AuthLayout` es el único nuevo consumidor real.

## 6. Login y registro

`mobile/app/auth/login.tsx` y `mobile/app/auth/register.tsx` ahora consumen `AuthLayout` en lugar de duplicar wrapper `AuthScreen` + `Card`. Se preservan exactamente:

- campos, esquemas Zod y validación;
- mensajes existentes;
- loading y bloqueo de reentrada;
- callbacks `login`/`register`;
- redirects;
- `onSubmitEditing`;
- links login/registro;
- teclado, scroll y safe area.

La composición visual conserva estructura funcional y cambia superficie, marca, contraste de inputs, CTA y links. No se rediseñó Home, detalle ni importación. Sus componentes reciben Mulberry Night globalmente; no se reorganizó JSX.

## 7. Status bar y superficie global

`mobile/app/_layout.tsx` usa `StatusBar style="light"` y `contentStyle` desde `colors.background`, evitando hex directo y flashes de Stack claro. `Screen` y `AuthScreen` mantienen un único inset safe-area. No se modificó configuración nativa.

## 8. Teclado y accesibilidad

Preservados `KeyboardAvoidingView`, `ScrollView`, `keyboardShouldPersistTaps="handled"`, dismiss mode y targets de 44 px. Inputs mantienen labels visibles, error textual, multiline y props nativas. Buttons mantienen role, `busy`/`disabled`, loading y bloqueo de doble acción. Links reciben highlight visible. Feedback conserva live region y alert exclusivamente para errores. Modal añade `accessibilityViewIsModal` desde E.2.

Pendiente físico: teléfono pequeño, autofill, fuente aumentada, rotación, foco real, lectura de mensajes largos y submit con teclado abierto.

## 9. Pruebas y gates

No se modificaron tests existentes ni se añadieron snapshots decorativos. La prueba focalizada disponible de mobile pasó:

- `yarn workspace task-manager-mobile test --runInBand`: 13 suites, 122 tests pass.

Gates completos posteriores:

| Comando | Resultado |
|---|---|
| `yarn workspace task-manager-mobile test --runInBand` | 13 suites/122 tests pass |
| `yarn workspace task-manager-backend test --runInBand` vía `yarn test` | 8 suites/80 tests pass |
| `yarn test` | backend 8 suites/80; mobile 13 suites/122 pass |
| `yarn typecheck` | Pass mobile + backend |
| `yarn typecheck:tests` | Pass |
| `yarn lint` | Pass |
| `git diff --check` | Pass |

Persisten logs de auth en desarrollo ya documentados como deuda P3; no son regresión de E.3.

## 10. Limitaciones y checklist físico

No se ejecutaron EAS, Gradle, build Android ni Docker. Antes de cerrar validación física:

- login y registro en teléfono pequeño;
- teclado abierto, submit visible y dismiss;
- rotación y fuente aumentada;
- autofill Android;
- error largo y loading;
- doble toque y botones disabled;
- navegación login/registro y restauración/logout;
- StatusBar clara, fondo sin flashes claros;
- contraste de inputs, placeholder, focus y destructive;
- safe area edge-to-edge.

## 11. Preparación E.4

E.3 deja Mulberry Night único, primitives compatibles y composición auth reutilizable. E.4 puede rediseñar Home por secciones sin tocar lógica offline-first, filtros, sincronización, conflictos ni callbacks.

No se modificó lógica funcional, backend, servicios, autenticación, SecureStore, navegación, sincronización, multimedia, dependencias o lockfile. No hubo commit ni push. Stash B.2.2 permanece intacto.

# LISTO PARA IMPLEMENTAR E.4
