# ETAPA UI 3 — Home y navegación

## Objetivo

Transformar la pantalla principal en una experiencia clara y profesional.

---

# Home

Revisar:

- header;
- saludo/título;
- resumen;
- acciones;
- lista de tareas;
- filtros;
- navegación.

La información importante debe ser visualmente prioritaria.

---

# Jerarquía

La pantalla debe responder rápidamente:

1. ¿Dónde estoy?
2. ¿Qué tareas tengo?
3. ¿Qué puedo hacer?
4. ¿Qué tareas están pendientes?
5. ¿Cómo creo una tarea?

---

# Crear tarea

El CTA principal debe ser evidente.

Utilizar:

- botón;
- FAB;
- o acción equivalente.

No utilizar múltiples CTAs compitiendo visualmente.

---

# Filtros

Mejorar:

- All;
- Active;
- Completed.

El filtro seleccionado debe ser evidente.

Mantener persistencia existente.

---

# Empty states

Diseñar estados específicos:

## Sin tareas

Mostrar:

- mensaje;
- explicación;
- CTA para crear tarea.

## Sin tareas activas

Mostrar mensaje específico.

## Sin tareas completadas

Mostrar mensaje específico.

No mostrar una pantalla vacía.

---

# Loading

Mostrar skeleton o loading apropiado.

Evitar flashes innecesarios.

---

# Error

Mostrar:

- mensaje;
- retry.

No mostrar stack traces.

---

# Navegación

Revisar:

- back;
- transitions;
- headers;
- navegación entre pantallas.

Mantener navegación existente.

---

# Definition of Done

- [ ] Home rediseñada.
- [ ] CTA principal claro.
- [ ] Filtros claros.
- [ ] Empty states.
- [ ] Loading.
- [ ] Error + retry.
- [ ] Navegación consistente.
- [ ] Sin regresiones funcionales.

# Styling

Construir la pantalla utilizando NativeWind/TailwindCSS.

Utilizar:

- spacing tokens;
- typography;
- colors;
- cards;
- buttons;
- badges;
- icon buttons.

Evitar estilos específicos de pantalla cuando puedan resolverse mediante componentes reutilizables.

La pantalla debe sentirse parte del mismo Design System establecido en UI 1.

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
