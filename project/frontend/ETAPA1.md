# ETAPA UI 1 — Design System y consistencia visual

## Objetivo

Establecer un sistema visual coherente para toda la aplicación antes de modificar pantallas individualmente.

La aplicación ya tiene sus funcionalidades principales aprobadas.

Esta etapa debe enfocarse exclusivamente en UI/UX y consistencia visual.

---

# Principios

La interfaz debe ser:

- moderna;
- limpia;
- consistente;
- accesible;
- responsive;
- fácil de entender;
- visualmente profesional.

No rediseñar arbitrariamente cada pantalla.

Todas las decisiones deben formar parte de un sistema coherente.

---

# Auditoría inicial

Antes de modificar código:

Revisar:

- colores actuales;
- tipografías;
- tamaños de texto;
- espaciados;
- bordes;
- border radius;
- sombras;
- botones;
- inputs;
- cards;
- modales;
- estados;
- iconos;
- navegación;
- componentes repetidos.

Identificar inconsistencias.

No comenzar modificando pantallas hasta terminar esta auditoría.

---

# Design Tokens

Crear o centralizar tokens para:

## Colors

Definir:

- background;
- surface;
- surface elevated;
- primary;
- primary pressed;
- secondary;
- text;
- text secondary;
- text disabled;
- success;
- warning;
- error;
- border;
- overlay.

Evitar colores hardcodeados repetidos.

---

## Typography

Definir jerarquía:

- display;
- heading;
- title;
- body;
- body secondary;
- caption;
- button;
- label.

Mantener las fuentes existentes si son adecuadas.

No introducir nuevas fuentes innecesariamente.

---

## Spacing

Definir escala consistente.

Ejemplo:

4
8
12
16
20
24
32
40
48

No utilizar valores arbitrarios constantemente.

---

## Radius

Definir:

- small;
- medium;
- large;
- pill.

---

## Shadows

Definir niveles de elevación.

No utilizar sombras excesivamente fuertes.

---

# Componentes base

Identificar o crear componentes reutilizables:

- Button;
- IconButton;
- TextInput;
- Card;
- Badge;
- Divider;
- Modal;
- Loading;
- EmptyState;
- ErrorState;
- ConfirmationDialog;
- ScreenContainer.

No duplicar componentes equivalentes.

---

# Estados

Los componentes interactivos deben contemplar:

- default;
- pressed;
- disabled;
- loading;
- error;
- success cuando corresponda.

---

# Accesibilidad

Revisar:

- contraste;
- tamaño táctil;
- labels;
- feedback visual;
- estados disabled;
- textos legibles.

No depender únicamente del color para comunicar estados.

---

# Restricciones

NO modificar:

- API;
- PostgreSQL;
- Prisma;
- autenticación;
- permisos;
- GPS;
- audio;
- cámara;
- modelo de datos.

No agregar funcionalidades nuevas.

---

# Testing

Ejecutar:

npm test
npm run typecheck
npm run lint

La aplicación debe continuar compilando.

---

# Definition of Done

- [ ] Design tokens definidos.
- [ ] Colores centralizados.
- [ ] Tipografía consistente.
- [ ] Spacing consistente.
- [ ] Radius consistente.
- [ ] Componentes base identificados.
- [ ] Componentes duplicados reducidos.
- [ ] Estados interactivos definidos.
- [ ] Accesibilidad revisada.
- [ ] TypeScript PASS.
- [ ] ESLint PASS.
- [ ] Tests PASS.

---

# Regla

No buscar "hacerlo bonito" mediante cambios aislados.

Construir primero el lenguaje visual que utilizarán las siguientes etapas.
