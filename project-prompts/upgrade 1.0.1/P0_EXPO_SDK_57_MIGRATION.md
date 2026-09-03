Trabaja directamente en este repositorio. Ejecuta el bloque **P0 — Modernización y estabilización de Task Manager Mobile**, migrando la aplicación desde Expo SDK 54 hasta Expo SDK 57.

No te limites a proponer un plan: inspecciona, implementa, verifica y documenta los cambios. Resuelve autónomamente las decisiones rutinarias. Detente únicamente ante un bloqueo real, una operación destructiva o una decisión que exceda este alcance.

## Objetivo

Conservar las funcionalidades actuales sobre Expo SDK 57 y dejar una instalación reproducible, un development build Android compilable y controles de calidad ejecutables.

Actualizar significa seleccionar versiones compatibles entre sí, no instalar indiscriminadamente `latest`.

## Contexto conocido

Es un monorepo npm con:

- `mobile/`: React Native, TypeScript, Expo Router, NativeWind.
- `backend/`: Express, Prisma, PostgreSQL.
- Autenticación con JWT y SecureStore.
- CRUD de tareas, fotografías, GPS y notas de voz.
- Pruebas Jest y Supertest.

La instalación observada presenta:

- Expo 54.0.37.
- React Native 0.81.5.
- Reanimated 3.19.5.
- NativeWind 4.2.6.
- Dos versiones de react-native-css-interop: 0.1.22 y 0.2.6.
- Error de Babel: `Cannot find module 'react-native-worklets/plugin'`.

El ZIP original tenía NativeWind 4.1.23 y react-native-css-interop 0.1.22. Comprueba el estado actual: estos datos son antecedentes, no sustituyen la inspección.

## 1. Inspección y protección del trabajo

- Lee `AGENTS.md` y las instrucciones aplicables.
- Revisa Git, manifests, lockfile, workspaces, Babel, Metro, TypeScript, ESLint, Jest, Expo y Android.
- Identifica cambios locales existentes y consérvalos. No ejecutes reset, clean ni checkout que descarte trabajo.
- Si es seguro, crea una rama `chore/expo-sdk-57`; no cambies una rama de trabajo ajena sin necesidad.
- No hagas commits, pushes ni publicaciones automáticamente.
- No leas ni muestres secretos de `.env`, credenciales o keystores.
- Mantén npm y el lockfile raíz.

Esta tarea autoriza cambios de dependencias, configuración móvil, adaptación del código a APIs nuevas, configuración nativa y pruebas necesarias para la migración. También autoriza actualizar las secciones de documentación e instrucciones que describan versiones o comandos ya obsoletos. Conserva las demás restricciones.

## 2. Establecer una línea base

- Reproduce o identifica la causa concreta del error de Babel.
- Si hace falta, restaura temporalmente la combinación original de NativeWind y css-interop para verificar SDK 54.
- No instales Worklets junto a Reanimated 3 como parche.
- Ejecuta los controles disponibles y registra cuáles pasan y cuáles fallan antes de migrar.
- Comprueba por separado las suites backend y mobile: el script raíz original solo ejecutaba backend.
- Si algún control inicial está bloqueado, documenta el motivo y continúa cuando sea posible sin perder trazabilidad.

## 3. Migración compatible hasta SDK 57

Consulta documentación oficial de Expo, React Native, Reanimated y NativeWind. Verifica requisitos de Node, Java, Android SDK y herramientas de compilación.

Migra incrementalmente:

1. SDK 54 → 55.
2. SDK 55 → 56.
3. SDK 56 → 57.

En cada salto:

- Revisa las notas de migración y cambios incompatibles.
- Instala las versiones del SDK y alinea sus dependencias desde el workspace correcto.
- Usa las herramientas de Expo para comprobar y corregir compatibilidad.
- Verifica Metro, typecheck y los controles relevantes antes de continuar.
- Registra las versiones y los problemas resueltos.

React, React Native, Expo Router y módulos expo-\* deben corresponder al SDK instalado.

Migra Reanimated y Worklets como un conjunto compatible. Verifica que NativeWind, css-interop, Babel y Metro sean compatibles con ese conjunto. No cambies de sistema de estilos ni migres innecesariamente a otra versión mayor de NativeWind.

Evita `--force`, `--legacy-peer-deps` y overrides que simplemente oculten incompatibilidades.

No cambies Express, Prisma, el esquema de datos ni las migraciones del backend. Si la resolución del monorepo obliga a modificar dependencias compartidas, limita y explica esos cambios.

## 4. Preservar Android y el comportamiento

Antes de ejecutar prebuild:

- Revisa las personalizaciones de `mobile/android/`.
- Identifica permisos, package/applicationId, configuración de red, recursos, plugins y ajustes Gradle.
- Determina qué puede expresarse mediante app config o config plugins.
- No elimines ni regeneres carpetas nativas sin preservar y poder restaurar sus personalizaciones.
- Inspecciona las diferencias resultantes; no uses prebuild como reparación ciega.

Conserva identificadores, diseño, textos en español, navegación y funcionalidades.

No agregues offline-first, sincronización, importación externa ni nuevas funcionalidades. No incorpores una refactorización general.

Corrige regresiones introducidas por la migración. Los defectos previos ajenos a ella deben quedar documentados como pendientes; corrígelos solo si impiden verificar esta migración y explica por qué.

## 5. Verificación real

Al terminar, ejecuta:

- Instalación reproducible con el lockfile final, mediante `npm ci` en un entorno adecuado.
- Expo Doctor y comprobación de dependencias.
- Typecheck de mobile y backend.
- ESLint.
- Suite backend.
- Suite mobile.
- Bundling/exportación Android para comprobar Babel y Metro.
- Compilación local del development build Android si están disponibles las herramientas.

Ajusta el script de pruebas raíz para que incluya ambas suites y falle si cualquiera falla. Mantén comandos para ejecutarlas por separado.

No desactives reglas ni excluyas pruebas para conseguir resultados verdes. No uses `any`, `@ts-ignore` o `@ts-nocheck` para esconder errores.

Agrega pruebas de regresión cuando hayas cambiado comportamiento susceptible de fallar; evita pruebas que solo comprueben versiones o repliquen la implementación.

Si hay un emulador o dispositivo autorizado disponible, verifica:

- Arranque y navegación.
- Registro, login, restauración de sesión y logout.
- Crear, editar, completar, reabrir y eliminar tareas.
- Captura y cancelación de fotografías.
- GPS concedido, denegado y desactivado.
- Grabar, previsualizar y reproducir audio.

Usa datos de prueba y no borres datos reales. Si falta backend, base de datos, emulador o hardware, distingue explícitamente qué quedó bloqueado. Un bundle correcto no equivale a una app compilada ni a periféricos verificados.

No uses EAS remoto ni servicios de pago sin autorización.

## 6. Documentación y cierre

Crea `docs/P0_EXPO_SDK_57_MIGRATION.md` con:

- Estado inicial y causa del error de Babel.
- Tabla de versiones iniciales y finales.
- Cambios relevantes por salto de SDK.
- Adaptaciones nativas y personalizaciones conservadas.
- Comandos ejecutados y resultados reales.
- Defectos previos, bloqueos y verificaciones manuales pendientes.
- Instrucciones exactas para instalar, iniciar backend/mobile y reconstruir Android.
- Procedimiento de reversión seguro, sin descartar trabajo previo.

Actualiza README y las secciones técnicas pertinentes de AGENTS.md para que describan el estado final.

Finaliza con un resumen breve de cambios, verificaciones y pendientes. No declares completada la migración si el proyecto no alcanza SDK 57 o quedan fallos que impiden compilarlo; informa el punto exacto alcanzado.

No avances al bloque de nuevas funcionalidades.
