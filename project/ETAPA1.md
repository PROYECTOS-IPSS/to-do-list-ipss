# ETAPA 1 — Inicialización del proyecto

# Expo Development Build

El proyecto utilizará Expo Development Build mediante
expo-dev-client.

NO utilizar Expo Go como entorno principal de desarrollo.

Instalar:

npx expo install expo-dev-client

Configurar EAS Build.

Crear un perfil:

development:
developmentClient: true
distribution: internal

El proyecto debe poder:

1. Generar el development build.
2. Instalarlo en Android.
3. Iniciar Metro con --dev-client.
4. Conectarse al backend local.
5. Ejecutar Fast Refresh.

Comandos esperados:

npx expo start --dev-client

npx eas-cli build --profile development --platform android

Desarrollo rápido:
Expo Dev Client + Metro

Prueba nativa:
Android Emulator / dispositivo físico

## Objetivo

Crear la infraestructura base del proyecto móvil y backend.

Al finalizar esta etapa:

React Native → Express → PostgreSQL

debe poder funcionar correctamente.

NO implementar funcionalidades de negocio.

---

# Stack

## Mobile

- React Native
- Expo
- TypeScript
- Expo Router

## Backend

- Node.js
- Express
- TypeScript
- Nodemon

## Database

- PostgreSQL
- Prisma

---

# Estructura

Crear una estructura clara para separar mobile y backend.

Ejemplo:

project/
├── app/
├── src/
│ ├── components/
│ ├── features/
│ ├── hooks/
│ ├── services/
│ ├── types/
│ └── utils/
│
├── backend/
│ ├── src/
│ │ ├── config/
│ │ ├── controllers/
│ │ ├── middleware/
│ │ ├── routes/
│ │ ├── schemas/
│ │ ├── services/
│ │ └── utils/
│ │
│ ├── prisma/
│ └── tests/
│
├── tests/
├── AGENTS.md
├── ETAPA0.md
├── ETAPA1.md
└── README.md

La estructura puede modificarse si existe una justificación técnica.

---

# Mobile

Configurar:

- Expo;
- TypeScript estricto;
- Expo Router;
- navegación inicial;
- pantalla inicial;
- scripts de desarrollo.

La aplicación debe iniciar correctamente.

---

# Backend

Configurar Express con:

- TypeScript;
- Nodemon;
- JSON middleware;
- manejo centralizado de errores;
- health check.

Crear:

GET /health

Respuesta:

{
"status": "ok"
}

---

# Prisma

Configurar Prisma para PostgreSQL.

Debe ser posible:

- generar Prisma Client;
- ejecutar migraciones;
- conectarse a PostgreSQL.

---

# Variables de entorno

Backend:

PORT
DATABASE_URL
JWT_SECRET

Mobile:

EXPO_PUBLIC_API_URL

Crear:

.env.example

Nunca agregar secretos reales al repositorio.

---

# Scripts

Debe existir una forma clara de:

- iniciar Expo;
- iniciar backend;
- generar Prisma Client;
- ejecutar migraciones;
- ejecutar tests posteriormente.

---

# Definition of Done

- [ ] Expo inicia.
- [ ] TypeScript compila.
- [ ] Expo Router funciona.
- [ ] Backend inicia.
- [ ] Nodemon funciona.
- [ ] /health responde.
- [ ] PostgreSQL funciona.
- [ ] Prisma funciona.
- [ ] Migración inicial funciona.
- [ ] .env.example existe.
- [ ] Secretos no están versionados.
- [ ] Estructura definida.
- [ ] expo-dev-client instalado.
- [ ] EAS configurado.
- [ ] Perfil development creado.
- [ ] Development build generado.
- [ ] Development build instalado.
- [ ] Metro funciona con --dev-client.
- [ ] Fast Refresh funciona.

---

# NO IMPLEMENTAR

- Registro.
- Login.
- JWT funcional.
- CRUD.
- Cámara.
- GPS.
- Audio.
- AsyncStorage.
- Upload.

---

# Condición para avanzar

Mobile, backend y PostgreSQL deben iniciar correctamente.
