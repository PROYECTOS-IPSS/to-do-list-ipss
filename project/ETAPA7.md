# ETAPA 7 — Persistencia local, UX y robustez

## Objetivo

Agregar persistencia local no sensible y mejorar la robustez general de la aplicación.

---

# AsyncStorage

Utilizar AsyncStorage para:

- preferencias;
- filtros;
- configuración;
- caché no sensible.

NO almacenar:

- JWT;
- passwords;
- secretos;
- credenciales.

---

# SecureStore

Mantener:

JWT
↓
SecureStore

---

# Caché

PostgreSQL/API:

Fuente de verdad.

AsyncStorage:

Caché local.

La caché nunca debe sobrescribir silenciosamente datos nuevos.

---

# Preferencias

Ejemplos:

- soundEnabled;
- vibrationEnabled;
- selectedTaskFilter.

No crear preferencias innecesarias.

---

# UX

Todas las operaciones deben contemplar:

idle
loading
success
error
empty

Implementar:

- loading;
- empty states;
- retry;
- mensajes de error;
- confirmación de eliminación;
- feedback de guardado;
- feedback al completar.

---

# Red

Si la API no responde:

- no crashear;
- mostrar error;
- permitir retry;
- evitar operaciones duplicadas.

No implementar un sistema offline complejo salvo necesidad.

---

# Imágenes

Optimizar:

- tamaño;
- resolución;
- compresión.

Evitar uploads innecesariamente grandes.

---

# Recursos nativos

Revisar cleanup de:

- cámara;
- audio;
- ubicación;
- listeners.

---

# Rendimiento

Revisar:

- renders;
- requests duplicadas;
- listas;
- memoria;
- multimedia.

---

# Definition of Done

- [ ] AsyncStorage.
- [ ] Preferencias persistentes.
- [ ] JWT en SecureStore.
- [ ] Loading.
- [ ] Error.
- [ ] Empty state.
- [ ] Retry.
- [ ] Errores de red.
- [ ] Confirmaciones.
- [ ] Feedback.
- [ ] Optimización multimedia.
- [ ] Cleanup.
- [ ] Sin datos sensibles en AsyncStorage.

---

# Condición para avanzar

La aplicación debe permanecer estable ante:

- errores de red;
- permisos rechazados;
- ausencia de datos;
- errores de APIs;
- archivos inválidos.
