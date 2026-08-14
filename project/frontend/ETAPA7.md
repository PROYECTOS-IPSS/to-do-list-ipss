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
