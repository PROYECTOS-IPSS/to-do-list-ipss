# P5 — Bloque C.1: usabilidad de interfaz

## Diagnóstico

- `SafeAreaProvider` ya existía en `mobile/app/_layout.tsx`; `Screen` consumía insets con `useSafeAreaInsets` y los mezclaba con `p-lg`. Esto dejaba lógica manual en el contenedor compartido y podía producir espaciado superior inconsistente.
- El filtro inicial era `all`; la preferencia se persistía en AsyncStorage y valores ausentes o inválidos volvían a `all`.
- Home renderizaba un `AppFeedback` debajo de `Tu espacio`; estados de carga/error/lista vacía usaban `StateMessage` dentro del encabezado de la lista. Detalle e importación tienen feedback local, sin duplicar el feedback global de Home.
- `AppFeedback` siempre usaba `accessibilityRole="alert"`, incluso para información y éxito.

## Solución safe area

`Screen` es la única fuente de consumo de safe area. Ahora usa `SafeAreaView` de `react-native-safe-area-context` con los cuatro bordes y `p-lg`; no suma manualmente `insets.top`. El padding visual de tokens se conserva como espacio adicional al inset, sin alturas hardcodeadas. `AuthScreen`, Home, importación y detalle reutilizan `Screen`, por lo que teclado y scroll conservan su comportamiento.

## Política de filtro inicial

- Tipo válido: `pending`, `all`, `completed`.
- Ausente, corrupto o error de lectura: `pending`.
- Selección válida explícita: se conserva en AsyncStorage.
- Orden visual: Pendientes, Todas, Completadas.
- El filtro pendiente excluye tareas completadas; contadores siguen mostrando total, pendientes y completadas.

## Feedback y lifecycle

Home mantiene un punto global debajo de `Tu espacio`; sincronización reemplaza ese mensaje mientras corre y con el resultado al finalizar. Los guards de versión y `mounted` existentes impiden callbacks tardíos. `AppFeedback` admite varias líneas, ancho disponible, región viva `polite` y rol `alert` solo para errores. Feedback de operaciones exclusivas del detalle/importación permanece local.

## Accesibilidad

Los filtros conservan labels y estado seleccionado mediante texto `✓`, roles de botón y `accessibilityState`. Errores importantes anuncian `alert`; cambios informativos anuncian región viva. El mensaje no usa truncamiento ni `numberOfLines`.

## Archivos modificados

- `mobile/src/ui/components.tsx`
- `mobile/src/services/preferences.ts`
- `mobile/app/index.tsx`
- `mobile/src/services/__tests__/preferences.test.ts`
- `docs/P5_BLOCK_C1_UI_USABILITY.md`

No se modificaron backend, contratos HTTP, SQLite, sincronización, multimedia, dependencias, lockfile ni configuración nativa.

## Pruebas

Prueba focalizada añadida para fallback ausente/inválido y conservación de selección válida. Ejecutar los gates indicados por el bloque para obtener conteos actuales.

## Limitaciones

La verificación física requiere dispositivo/emulador y no forma parte de este checkout; no se ejecutan Android, Gradle, Docker ni EAS.

## Checklist físico

- [ ] Abrir login y registro; comprobar separación de barra de estado.
- [ ] Iniciar sesión; comprobar Home.
- [ ] Confirmar Pendientes antes que Todas.
- [ ] Confirmar filtro inicial Pendientes.
- [ ] Crear, editar y eliminar tarea.
- [ ] Sincronizar y leer mensaje completo.
- [ ] Provocar error de red y comprobar visibilidad.
- [ ] Abrir detalle y comprobar ausencia de duplicados.
- [ ] Aumentar tamaño de fuente del sistema.
- [ ] Rotar/cambiar pantalla y comprobar estabilidad.
