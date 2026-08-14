# ETAPA 2 — PostgreSQL, Prisma y CRUD

## Objetivo

Implementar la base de datos y el CRUD completo de tareas.

---

# Modelo

## User

- id
- name
- email
- passwordHash
- createdAt
- updatedAt

## Task

- id
- userId
- title
- description
- completed
- latitude
- longitude
- locationAccuracy
- locationTimestamp
- createdAt
- updatedAt

---

# API

Implementar:

POST /api/tasks

GET /api/tasks

GET /api/tasks/:id

PATCH /api/tasks/:id

DELETE /api/tasks/:id

---

# Arquitectura

Las peticiones deben seguir:

route
↓
controller
↓
service
↓
Prisma
↓
PostgreSQL

No colocar consultas Prisma directamente dentro de las rutas.

---

# Validación

Utilizar Zod.

Validar:

- title;
- description;
- IDs;
- completed;
- coordenadas cuando existan.

Nunca confiar directamente en datos enviados por el cliente.

---

# HTTP

Utilizar códigos apropiados:

200
201
204
400
404
422
500

---

# Mobile

Implementar interfaz básica:

- lista;
- crear;
- detalle;
- editar;
- completar;
- eliminar.

Debe existir manejo de:

- loading;
- error;
- empty state.

---

# Autenticación temporal

La autenticación definitiva corresponde a ETAPA3.

Si es necesario identificar un usuario durante desarrollo, utilizar únicamente una solución temporal claramente marcada.

NO convertirla en la solución definitiva.

---

# Definition of Done

- [ ] Prisma schema funcional.
- [ ] Migraciones funcionales.
- [ ] CRUD completo.
- [ ] Zod.
- [ ] HTTP correcto.
- [ ] Manejo de errores.
- [ ] Mobile consume API.
- [ ] Crear funciona.
- [ ] Editar funciona.
- [ ] Completar funciona.
- [ ] Eliminar funciona.
- [ ] Listar funciona.
- [ ] TypeScript sin errores.
- [ ] Lint sin errores.

---

# NO IMPLEMENTAR

- JWT.
- SecureStore.
- Cámara.
- GPS.
- Audio.
- Upload.
- AsyncStorage.

---

# Condición para avanzar

Debe funcionar:

React Native
↓
Express
↓
Prisma
↓
PostgreSQL
