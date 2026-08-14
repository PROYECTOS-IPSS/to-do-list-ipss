# ETAPA 5 — GPS y ubicación

## Objetivo

Integrar el GPS para asociar opcionalmente una tarea con una ubicación.

---

# Datos

Obtener:

latitude
longitude
accuracy
timestamp

---

# Flujo

Task
↓
Asociar ubicación
↓
Permiso
↓
GPS
↓
Validación
↓
Guardar
↓
PostgreSQL

---

# Permisos

Solicitar ubicación únicamente cuando sea necesaria.

Manejar:

- concedido;
- denegado;
- GPS no disponible;
- error;
- precisión insuficiente.

Una tarea debe poder existir sin ubicación.

---

# Validación

latitude:

-90 → 90

longitude:

-180 → 180

accuracy:

> = 0

timestamp:

válido.

---

# Precisión

Mostrar la precisión cuando corresponda.

Ejemplo:

Ubicación obtenida
Precisión aproximada: 12 m

---

# Funcionalidad adicional

Si no aumenta innecesariamente la complejidad, implementar:

"Tareas cercanas"

Calcular distancia entre:

ubicación actual

y

ubicaciones de tareas.

No implementar mapas si no son necesarios.

---

# Testing

Probar:

- permiso concedido;
- permiso denegado;
- coordenadas válidas;
- coordenadas inválidas;
- accuracy;
- accuracy insuficiente;
- timestamp;
- GPS no disponible;
- error.

---

# Definition of Done

- [ ] GPS funcional.
- [ ] Permiso contextual.
- [ ] Denegación.
- [ ] Latitude.
- [ ] Longitude.
- [ ] Accuracy.
- [ ] Timestamp.
- [ ] Validación.
- [ ] API.
- [ ] PostgreSQL.
- [ ] Tests.
- [ ] TypeScript sin errores.
- [ ] Lint sin errores.

---

# NO IMPLEMENTAR

- Audio.
- AsyncStorage.
- Geofencing.
- Background location.

---

# Condición para avanzar

Una tarea debe poder almacenar y recuperar una ubicación válida.
