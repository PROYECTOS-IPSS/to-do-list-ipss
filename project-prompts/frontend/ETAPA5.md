# ETAPA UI 5 — UX de periféricos

## Objetivo

Mejorar exclusivamente la experiencia visual de:

- cámara;
- GPS;
- audio.

Las funcionalidades ya están implementadas y aprobadas.

NO modificar su arquitectura salvo que sea estrictamente necesario para UX.

---

# Cámara

Diseñar estados:

- idle;
- requesting permission;
- camera active;
- capturing;
- preview;
- uploading;
- success;
- error.

Mostrar claramente:

"Tomar foto"

"Usar foto"

"Descartar"

"Subiendo..."

---

# Permisos

Si el permiso está denegado:

Mostrar:

- explicación;
- acción para reintentar;
- mensaje comprensible.

No pedir permisos automáticamente al iniciar.

---

# GPS

Mostrar:

"Agregar ubicación"

Después:

"Ubicación asociada"

Mostrar:

"Precisión aproximada: 12 m"

Estados:

- requesting;
- obtaining;
- success;
- insufficient accuracy;
- unavailable;
- denied;
- error.

---

# Audio

Diseñar:

- record button;
- recording state;
- timer;
- stop;
- cancel;
- preview;
- playback;
- upload;
- delete.

Durante grabación:

Mostrar claramente:

REC
00:07

Al reproducir:

Mostrar:

play/pause;
progress;
duration.

---

# Errores

No mostrar errores técnicos.

Ejemplo:

En lugar de:

"Recording is empty or invalid"

usar:

"No se pudo crear la grabación. Inténtalo nuevamente."

---

# Cleanup

No modificar el comportamiento funcional aprobado.

Verificar visualmente que:

- salir de pantalla detiene reproducción;
- salir durante grabación no deja estado incorrecto;
- volver a entrar inicia correctamente.

---

# Definition of Done

- [ ] Cámara UX mejorada.
- [ ] GPS UX mejorada.
- [ ] Audio UX mejorada.
- [ ] Permisos claros.
- [ ] Estados claros.
- [ ] Errores comprensibles.
- [ ] Feedback.
- [ ] Cleanup conservado.
- [ ] Tests PASS.

# Styling

Las interfaces relacionadas con periféricos deben utilizar NativeWind/TailwindCSS.

Normalizar visualmente:

- botones de captura;
- recording state;
- playback state;
- GPS state;
- permission state;
- error state;
- loading;
- preview;
- upload;
- eliminación.

Los estados funcionales deben tener representación visual consistente con el Design System.

No introducir estilos independientes para cada periférico.

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
