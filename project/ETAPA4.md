# ETAPA 4 — Cámara e imágenes

## Objetivo

Integrar la cámara del dispositivo y permitir adjuntar fotografías a las tareas.

---

# Flujo

Task
↓
Adjuntar fotografía
↓
Permiso
↓
Cámara
↓
Captura
↓
Preview
↓
Confirmar
↓
Upload
↓
TaskImage

---

# Permisos

Utilizar las APIs oficiales de Expo compatibles con la versión instalada.

Solicitar permiso solamente cuando el usuario intente utilizar la cámara.

Manejar:

- concedido;
- denegado;
- restringido;
- error.

---

# TaskImage

Crear:

id
taskId
url
filename
mimeType
size
createdAt

---

# Storage

No guardar imágenes binarias en PostgreSQL salvo justificación explícita.

PostgreSQL:

metadata + URL

Storage:

archivo

---

# UX

Implementar:

- tomar fotografía;
- preview;
- confirmar;
- cancelar;
- eliminar.

---

# Seguridad

Validar:

- MIME;
- tamaño;
- usuario;
- tarea;
- asociación correcta.

---

# Testing

Probar:

- permiso concedido;
- permiso denegado;
- captura;
- cancelación;
- error;
- archivo válido;
- archivo inválido;
- archivo demasiado grande;
- usuario autorizado;
- usuario no autorizado.

---

# Definition of Done

- [ ] Cámara.
- [ ] Permiso contextual.
- [ ] Denegación.
- [ ] Captura.
- [ ] Preview.
- [ ] Cancelación.
- [ ] Upload.
- [ ] TaskImage.
- [ ] Storage.
- [ ] Validación.
- [ ] Autorización.
- [ ] Manejo de errores.
- [ ] Tests.
- [ ] TypeScript sin errores.
- [ ] Lint sin errores.

---

# NO IMPLEMENTAR

- GPS.
- Audio.
- AsyncStorage.
- Mapas complejos.

---

# Condición para avanzar

Una tarea autenticada debe poder tener fotografías y otro usuario no debe poder acceder a ellas.
