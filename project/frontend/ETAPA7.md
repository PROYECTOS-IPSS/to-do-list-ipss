# ETAPA UI 7 — Accesibilidad y polish final

## Objetivo

Realizar una revisión visual completa antes de considerar terminado el rediseño.

---

# Accesibilidad

Revisar:

- contraste;
- tamaños de fuente;
- touch targets;
- labels;
- iconos;
- estados;
- feedback.

Los elementos interactivos deben ser fáciles de tocar.

---

# Responsive

Probar:

- teléfono pequeño;
- teléfono grande;
- diferentes densidades;
- teclado abierto;
- contenido largo.

Evitar:

- overflow;
- texto cortado;
- botones fuera de pantalla;
- elementos superpuestos.

---

# Estados

Toda pantalla importante debe contemplar:

- loading;
- success;
- empty;
- error.

---

# Consistencia

Comparar todas las pantallas.

Verificar:

- mismos botones;
- mismos colores;
- mismos spacing;
- mismos headers;
- mismos cards;
- mismos mensajes;
- mismos iconos.

---

# Performance

Revisar:

- renders;
- listas;
- imágenes;
- audio;
- memoria;
- requests.

No hacer optimizaciones prematuras.

---

# Testing final

Ejecutar:

npm test
npm run typecheck
npm run lint

Generar Android build.

Probar manualmente:

- login;
- crear tarea;
- editar;
- completar;
- eliminar;
- cámara;
- GPS;
- audio;
- filtros;
- errores;
- permisos.

---

# Definition of Done

- [ ] Accesibilidad revisada.
- [ ] Responsive revisado.
- [ ] Todos los estados revisados.
- [ ] UI consistente.
- [ ] Performance aceptable.
- [ ] Tests PASS.
- [ ] TypeScript PASS.
- [ ] ESLint PASS.
- [ ] Android Build PASS.
- [ ] Validación manual PASS.

# TailwindCSS / NativeWind

Utilizar las capacidades de NativeWind para adaptar la UI a diferentes tamaños de pantalla cuando sea posible.

Revisar:

- spacing;
- tamaños;
- flex layouts;
- safe areas;
- touch targets;
- typography;
- orientación;
- pantallas pequeñas;
- pantallas grandes.

Evitar dimensiones absolutas innecesarias.

No utilizar valores arbitrarios si una utilidad Tailwind existente resuelve el caso.

# REGLA DE ESTILOS — OBLIGATORIA

El proyecto utiliza TailwindCSS mediante NativeWind.

NativeWind/TailwindCSS es el sistema de estilos PRINCIPAL y PREFERIDO.

Para cualquier nuevo trabajo de UI:

1. Intentar resolver el estilo mediante clases NativeWind.
2. Reutilizar componentes existentes.
3. Reutilizar tokens definidos en Tailwind.
4. Crear nuevos tokens solamente cuando exista una necesidad real.
5. Evitar valores arbitrarios.
6. Evitar estilos inline.
7. Evitar StyleSheet cuando NativeWind pueda resolver el problema.

StyleSheet solamente puede utilizarse cuando:

- NativeWind no soporte adecuadamente la propiedad;
- React Native requiera un objeto de estilo;
- exista una limitación técnica comprobable.

Toda utilización excepcional de StyleSheet debe estar justificada.

NO introducir:

- otra librería de UI;
- otro sistema de tokens;
- CSS paralelo;
- estilos duplicados;
- componentes visuales con sistemas de estilos independientes.

El objetivo es que toda la aplicación evolucione hacia un único lenguaje visual basado en TailwindCSS/NativeWind.
