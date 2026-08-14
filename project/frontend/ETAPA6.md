# ETAPA UI 6 — Microinteracciones y animaciones

## Objetivo

Agregar microinteracciones para hacer que la aplicación se sienta pulida.

Las animaciones deben mejorar UX, no ser decorativas.

---

# Animaciones

Considerar:

- aparición de cards;
- transición de estados;
- completar tarea;
- eliminación;
- apertura de detalle;
- feedback de éxito;
- loading.

---

# Principios

Animaciones:

- rápidas;
- naturales;
- discretas.

Evitar:

- animaciones excesivas;
- delays artificiales;
- movimientos que dificulten la interacción.

---

# Feedback

Agregar feedback visual para:

- tarea creada;
- tarea actualizada;
- tarea completada;
- tarea eliminada;
- imagen subida;
- audio subido;
- ubicación asociada.

---

# Haptic

Si ya existe soporte:

Utilizar vibración/haptic de manera moderada.

Ejemplos:

- completar;
- éxito;
- error importante.

No vibrar para cada interacción.

---

# Accesibilidad

Respetar reduced motion si la plataforma lo permite.

---

# Performance

No introducir:

- loops innecesarios;
- timers permanentes;
- listeners sin cleanup.

---

# Definition of Done

- [ ] Animaciones consistentes.
- [ ] Feedback visual.
- [ ] Haptic moderado.
- [ ] Sin problemas de performance.
- [ ] Cleanup correcto.
- [ ] Accesibilidad revisada.
