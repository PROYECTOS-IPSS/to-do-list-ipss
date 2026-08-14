# ETAPA UI 4 — Tareas

## Objetivo

Mejorar significativamente la visualización y edición de tareas.

---

# Task Card

Cada tarea debe mostrar claramente:

- título;
- descripción si existe;
- estado;
- fecha si existe;
- ubicación si existe;
- imagen si existe;
- audio si existe.

No saturar la card.

---

# Estados

Una tarea completada debe diferenciarse claramente.

Usar:

- iconografía;
- typography;
- opacity;
- badge;
- check.

No depender únicamente del color.

---

# Task Detail

Crear una jerarquía clara:

## Header

- título;
- estado;
- acciones.

## Información

- descripción;
- fecha;
- metadata.

## Multimedia

- imágenes;
- audio.

## Ubicación

Mostrar:

- ubicación asociada;
- precisión cuando exista.

No agregar mapas todavía.

---

# Acciones

Separar claramente:

- completar;
- editar;
- eliminar.

Eliminar debe requerir confirmación.

---

# Edición

Los campos deben:

- conservar valores;
- mostrar loading;
- mostrar errores;
- confirmar guardado.

---

# Feedback

Después de guardar:

Mostrar feedback breve.

Ejemplo:

"Tarea actualizada."

Evitar alerts innecesarios.

---

# Performance

Evitar:

- renders innecesarios;
- requests duplicadas;
- cargar multimedia innecesariamente.

---

# Definition of Done

- [ ] Task cards mejoradas.
- [ ] Detail mejorado.
- [ ] Estado visual claro.
- [ ] Multimedia organizada.
- [ ] Ubicación organizada.
- [ ] Acciones claras.
- [ ] Confirmación eliminación.
- [ ] Loading.
- [ ] Error.
- [ ] Feedback.
- [ ] Sin requests duplicadas.
