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

# Styling

Todo el listado y detalle de tareas debe utilizar NativeWind/TailwindCSS.

Normalizar:

- TaskCard;
- TaskItem;
- filtros;
- botones;
- inputs;
- estados;
- badges;
- acciones;
- modales.

No duplicar estilos entre TaskList y TaskDetail.

Las variantes visuales deben resolverse mediante componentes/props y clases NativeWind.

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
