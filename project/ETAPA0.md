# ETAPA 0 — Arquitectura y planificación

## Objetivo

Definir la arquitectura técnica completa del proyecto antes de implementar funcionalidades.

Esta etapa es exclusivamente de análisis y planificación.

NO implementar todavía cámara, GPS, audio, autenticación ni CRUD funcional.

---

## Contexto

La aplicación será un Task Manager móvil orientado a cumplir el nivel Sobresaliente de la rúbrica de la Unidad 2 de Desarrollo de Aplicaciones Móviles.

La aplicación debe utilizar:

- React Native
- Expo
- TypeScript
- Expo Router
- Express
- Nodemon
- Prisma
- PostgreSQL
- Zod
- JWT
- Expo SecureStore
- AsyncStorage

Periféricos:

1. Cámara
2. GPS / ubicación
3. Micrófono / audio

---

# Arquitectura

La arquitectura general será:

React Native + Expo
|
| HTTP/HTTPS
↓
Express + TypeScript
|
↓
Prisma
|
↓
PostgreSQL

---

# Mobile

La aplicación móvil debe separar:

- pantallas;
- componentes reutilizables;
- features;
- hooks;
- servicios;
- tipos;
- utilidades;
- acceso a APIs nativas.

---

# Backend

El backend debe separar:

- routes;
- controllers;
- services;
- schemas;
- middleware;
- configuración;
- acceso a Prisma.

Las rutas no deben contener lógica de negocio compleja.

---

# Modelo conceptual

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

## TaskImage

- id
- taskId
- url
- filename
- mimeType
- size
- createdAt

## TaskAudio

- id
- taskId
- url
- duration
- mimeType
- size
- createdAt

---

# Relaciones

User 1 ─── N Task

Task 1 ─── N TaskImage

Task 1 ─── N TaskAudio

---

# Almacenamiento

PostgreSQL será la fuente de verdad para los datos estructurados.

Las imágenes y audios NO deben almacenarse como blobs dentro de PostgreSQL salvo que exista una justificación técnica explícita.

El archivo debe almacenarse en un sistema de almacenamiento y PostgreSQL debe conservar su metadata y referencia.

---

# Almacenamiento local

Expo SecureStore:

- JWT;
- tokens;
- información sensible relacionada con autenticación.

AsyncStorage:

- preferencias;
- filtros;
- configuración;
- caché no sensible.

Nunca almacenar contraseñas o JWT en AsyncStorage.

---

# API

## Auth

POST /api/auth/register

POST /api/auth/login

GET /api/auth/me

POST /api/auth/logout

## Tasks

POST /api/tasks

GET /api/tasks

GET /api/tasks/:id

PATCH /api/tasks/:id

DELETE /api/tasks/:id

Los endpoints de multimedia se definirán antes de implementar cámara y audio.

---

# Seguridad

La arquitectura debe contemplar:

- hash de contraseñas;
- JWT;
- SecureStore;
- autorización por usuario;
- Zod;
- variables de entorno;
- validación de archivos;
- límites de tamaño;
- protección de secretos.

---

# Rúbrica

La arquitectura debe permitir demostrar:

- uso de múltiples periféricos;
- permisos;
- precisión de GPS;
- integración con APIs;
- seguridad;
- pruebas;
- validación;
- manejo de errores.

---

# Definition of Done

- [ ] Arquitectura definida.
- [ ] Modelo de datos definido.
- [ ] Relaciones definidas.
- [ ] API definida.
- [ ] Autenticación definida.
- [ ] Estrategia de almacenamiento definida.
- [ ] Estrategia de permisos definida.
- [ ] Estrategia de testing definida.
- [ ] Correspondencia con la rúbrica definida.

---

# NO IMPLEMENTAR

- Cámara.
- GPS.
- Audio.
- Login.
- Registro.
- CRUD.
- AsyncStorage.
- Upload de archivos.

---

# Condición para avanzar

La arquitectura debe estar documentada y ser coherente con todas las etapas siguientes.
