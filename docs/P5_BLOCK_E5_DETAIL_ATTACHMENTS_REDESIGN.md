# E.5 — Rediseño de detalle y adjuntos

## Skill
Se utilizó `frontend-design`. Influyó en una dirección Mulberry Night disciplinada: superficies oscuras por grupo, acento mulberry solo para foco/preview, tipografía existente sin inventar datos y una firma visual de estados vacíos con borde discontinuo y copy accionable.

## Línea base
- `yarn typecheck`: OK.
- `yarn lint`: OK.
- `yarn test`: backend 8 suites/80 tests; mobile 13 suites/122 tests.
- Rama `fix/ui`; E.4 versionado en HEAD.
- Stash B.2.2 presente y no inspeccionado ni modificado.

## Diagnóstico
Detalle concentraba carga, audio, imágenes y presentación. Usaba tarjetas anidadas, mostraba MIME/bytes y no separaba visualmente información, adjuntos y zona destructiva.

## Invariantes
- Imágenes siguen calculándose y reconciliándose en pantalla; `identity`, `localUri`, URLs remotas protegidas y token no cambian.
- Audio sigue siendo local B.2.1; no se añadió remoto, caché ni sincronización.
- GPS, persistencia, guards, cleanup, modal y callbacks existentes permanecen.
- No se cambiaron servicios, backend, dependencias ni configuración.

## Jerarquía final
Header/estado → título → descripción → metadata → ubicación → fotografías → notas de voz → feedback contextual → zona destructiva visual.

## Componentes extraídos
`DetailSection`, `MetadataRow`, `LocationPanel`, `AttachmentSection`, `InlineEmptyState` y `DangerZone`, todos presentacionales y tipados. `AuthenticatedImage` continúa siendo el límite de imágenes protegidas.

## Ubicación, imágenes y audio
Ubicación usa coordenadas y precisión cuando existen, o estado vacío. Fotografías conservan una representación por identidad y controles individuales. Audio muestra duración legible, preview y grabaciones locales sin MIME, bytes, URI ni estado remoto.

## Acciones, feedback y accesibilidad
Botones existentes conservan guards, loading, labels y confirmación. Feedback global sigue en pantalla; errores de audio siguen contextuales. Targets usan `AppButton` (44 px mínimo), texto multiline y orden de lectura continuo.

## Pruebas y gates
Validación ejecutada tras cambio: mobile typecheck OK; lint OK. Línea base completa quedó OK. No se añadió suite nueva porque contratos de servicios no cambiaron y componentes son composición directa; pruebas de comportamiento existentes siguen cubriendo bordes.

## Revisión del diff y limitaciones
Cambio limitado a `mobile/app/tasks/[id].tsx`, `mobile/src/ui/components.tsx` y este documento. No se ejecutaron Docker, EAS, Gradle ni Android físico. Falta validar físicamente cámara, dos fotos, audio, modo avión, fuente aumentada, teléfono estrecho y rotación.

## Checklist físico
Pendiente en Development Build Android: abrir tarea local/sincronizada, volver, completar/reabrir, GPS añadir/eliminar, captura/preview/dos fotos/sync/retry/eliminar, grabar/detener/preview/guardar/reproducir/dos audios/eliminar/reiniciar, modo avión, modal, mensajes largos, loading/error/not-found, fuente aumentada, estrecho, rotación, doble toque, duplicados y keys.

## Preparación E.6
Componentes de sección y metadata quedan disponibles para futuras pantallas sin acoplamiento a servicios.

## Confirmaciones
Servicios y backend sin cambios. Dependencias y lockfile sin cambios. Sin commit ni push. Stash intacto.
