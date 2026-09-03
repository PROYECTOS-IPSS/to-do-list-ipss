# P5 — Registro de depuración

| ID | Síntoma | Causa | Corrección/acción | Evidencia |
|---|---|---|---|---|
| P5-001 | lint fallaba en baseline final | constante de campos usada solo como tipo e import HTTP sin uso | eliminados símbolos muertos | `npm run lint` pasa |
| P5-002 | EAS local no produjo APK | Gradle daemon desapareció durante compilación CMake nativa | documentado; requiere repetir con diagnóstico y recursos ajustados | EAS CLI 23.2.0, exit 1 |

No se fabricaron fallos rojos. Warnings de `react-test-renderer`, ts-jest y dependencias deprecated no fueron silenciados.

No hay dispositivo/emulador `adb` conectado y `maestro` no está instalado. Flujo E2E preparado, no ejecutado.
