# ETAPA 8 — Testing, auditoría y entrega

## Objetivo

Validar el proyecto completo contra la rúbrica.

No agregar funcionalidades importantes salvo que las pruebas detecten una funcionalidad requerida que falte.

---

# Autenticación

Probar:

- registro;
- email inválido;
- email duplicado;
- password inválido;
- login;
- login incorrecto;
- JWT;
- JWT inválido;
- JWT expirado;
- token ausente;
- logout.

---

# Tasks

Probar:

- crear;
- listar;
- detalle;
- editar;
- completar;
- eliminar;
- ID inexistente;
- datos inválidos.

---

# Autorización

Probar:

Usuario A:

- sus tareas.

Usuario B:

- sus tareas.

Usuario A NO:

- leer tareas de B;
- modificar tareas de B;
- eliminar tareas de B;
- acceder a multimedia de B.

---

# Cámara

Probar:

- permiso;
- denegación;
- captura;
- cancelación;
- error;
- archivo válido;
- archivo inválido;
- tamaño excesivo;
- asociación;
- autorización.

---

# GPS

Probar:

- permiso;
- denegación;
- coordenadas;
- accuracy;
- timestamp;
- precisión;
- GPS no disponible;
- error.

---

# Audio

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

# API

Utilizar:

- Jest;
- Supertest;
- Postman.

Comprobar:

200
201
204
400
401
403
404
409
422
500

También:

- timeout;
- servidor caído;
- respuestas inválidas.

---

# Postman

Crear una colección:

Auth
Tasks
Images
Audio

Cada grupo debe contener:

- casos exitosos;
- casos inválidos;
- autenticación;
- autorización.

---

# TypeScript

Ejecutar verificación de TypeScript.

No utilizar:

@ts-ignore

ni:

any

para ocultar problemas sin una justificación técnica.

---

# Lint

No finalizar con errores de lint.

---

# Seguridad

Comprobar:

- passwords hasheadas;
- JWT;
- SecureStore;
- secretos en .env;
- .env en .gitignore;
- Zod;
- autorización;
- passwordHash no expuesto;
- archivos validados;
- límites de tamaño;
- errores sin información sensible.

---

# Auditoría de rúbrica

## Indicador 1 — Periféricos

20 puntos.

Demostrar:

- cámara;
- GPS;
- audio;
- rendimiento;
- cleanup;
- robustez.

---

## Indicador 2 — Permisos

20 puntos.

Demostrar:

- cámara;
- ubicación;
- micrófono;
- solicitud contextual;
- denegación;
- privacidad;
- manejo de errores.

---

## Indicador 3 — Pruebas de periféricos

12 puntos.

Demostrar:

- pruebas cámara;
- pruebas GPS;
- precisión;
- pruebas audio;
- permisos;
- errores.

---

## Indicador 4 — Servicios web y APIs

28 puntos.

Demostrar:

- REST;
- CRUD;
- JWT;
- PostgreSQL;
- Prisma;
- Zod;
- autorización;
- multimedia;
- validación;
- seguridad.

---

## Indicador 5 — Pruebas de APIs

20 puntos.

Demostrar:

- Jest;
- Supertest;
- Postman;
- casos exitosos;
- 4xx;
- autenticación;
- autorización;
- errores de comunicación;
- seguridad.

---

# README

Actualizar README.md con:

- descripción;
- funcionalidades;
- arquitectura;
- stack;
- instalación;
- variables de entorno;
- PostgreSQL;
- Prisma;
- ejecución;
- endpoints;
- autenticación;
- cámara;
- GPS;
- audio;
- testing;
- Postman;
- seguridad.

Agregar:

## Cumplimiento de la rúbrica

Relacionar cada indicador con:

- funcionalidad;
- implementación;
- prueba;
- evidencia.

---

# Evidencia

Preparar evidencia de:

- registro;
- login;
- CRUD;
- cámara;
- permisos;
- GPS;
- audio;
- API;
- PostgreSQL;
- tests;
- Postman;
- errores;
- seguridad.

---

# Definition of Done

- [ ] Todos los tests pasan.
- [ ] TypeScript sin errores.
- [ ] Lint sin errores.
- [ ] Mobile inicia.
- [ ] Backend inicia.
- [ ] PostgreSQL funciona.
- [ ] Prisma funciona.
- [ ] Auth funciona.
- [ ] CRUD funciona.
- [ ] Cámara funciona.
- [ ] GPS funciona.
- [ ] Audio funciona.
- [ ] Permisos funcionan.
- [ ] Imágenes funcionan.
- [ ] Audio funciona.
- [ ] Ubicación funciona.
- [ ] Usuarios están aislados.
- [ ] Errores están manejados.
- [ ] Seguridad revisada.
- [ ] Postman ejecutado.
- [ ] README actualizado.
- [ ] Rúbrica auditada.

---

# Regla final

El proyecto NO se considera terminado solamente porque las funcionalidades visuales funcionen.

Debe existir:

Funcionalidad

- Seguridad
- Permisos
- Validación
- Testing
- Documentación
