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

# Styling

Todos los estados visuales deben utilizar NativeWind/TailwindCSS:

- loading;
- error;
- success;
- warning;
- empty;
- disabled;
- pressed.

Crear variantes reutilizables en lugar de definir colores y spacing manualmente en cada pantalla.

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
