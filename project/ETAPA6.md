# ETAPA 6 — Micrófono y audio

## Objetivo

Integrar el micrófono para grabar y reproducir notas de voz asociadas a tareas.

---

# Flujo

Task
↓
Grabar
↓
Permiso
↓
Recording
↓
Stop
↓
Preview
↓
Upload
↓
TaskAudio

---

# Permisos

Solicitar micrófono únicamente al grabar.

Manejar:

- concedido;
- denegado;
- error;
- dispositivo no disponible.

---

# Funcionalidades

Implementar:

- iniciar;
- detener;
- cancelar;
- reproducir;
- detener reproducción;
- duración;
- eliminar.

---

# TaskAudio

Crear:

id
taskId
url
duration
mimeType
size
createdAt

---

# Storage

No guardar audio binario directamente en PostgreSQL salvo justificación.

Storage:

archivo

PostgreSQL:

metadata + URL

---

# Recursos

Liberar correctamente:

- grabaciones;
- reproducciones;
- listeners.

No dejar recursos activos cuando la pantalla desaparezca.

---

# Seguridad

Validar:

- MIME;
- tamaño;
- duración;
- propietario.

---

# Testing

Probar:

- permiso;
- denegación;
- grabación;
- detención;
- cancelación;
- reproducción;
- error;
- asociación;
- autorización.

---

# Definition of Done

- [ ] Micrófono.
- [ ] Permiso.
- [ ] Grabación.
- [ ] Stop.
- [ ] Cancelación.
- [ ] Reproducción.
- [ ] Duración.
- [ ] Storage.
- [ ] TaskAudio.
- [ ] API.
- [ ] Validación.
- [ ] Autorización.
- [ ] Cleanup.
- [ ] Tests.
- [ ] TypeScript sin errores.
- [ ] Lint sin errores.

---

# NO IMPLEMENTAR

- AsyncStorage.
- Edición avanzada de audio.
- Sincronización offline compleja.

---

# Condición para avanzar

Una tarea debe poder contener y reproducir una nota de voz.
