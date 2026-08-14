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
