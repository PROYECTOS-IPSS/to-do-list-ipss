# Arquitectura — Task Manager Mobile

## 1. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Mobile | React Native + Expo + TypeScript |
| Navegación | Expo Router |
| Estado local | React hooks + AsyncStorage (prefs no sensibles) |
| Auth segura | JWT + expo-secure-store |
| Backend | Node.js + Express + TypeScript + Nodemon |
| Validación | Zod |
| ORM | Prisma |
| Base de datos | PostgreSQL |
| Testing | Jest + Supertest + React Native Testing Library |
| Pruebas manuales API | Postman |

---

## 2. Estructura de carpetas

```text
to-do-list/
├── app/                          # Expo Router
│   ├── _layout.tsx               # Auth provider + router guard
│   ├── index.tsx                 # Entrypoint: decide login o tabs
│   ├── (auth)/                   # Rutas públicas
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Rutas privadas
│   │   ├── index.tsx             # Dashboard / tareas cercanas
│   │   ├── tasks.tsx             # Lista de tareas
│   │   └── profile.tsx           # Perfil + logout
│   └── tasks/                    # Rutas anidadas de tareas
│       ├── create.tsx
│       ├── [id].tsx              # Detalle
│       └── edit.tsx
│
├── src/
│   ├── components/               # UI reutilizable
│   ├── features/
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── camera/
│   │   ├── location/
│   │   └── audio/
│   ├── services/                 # Llamadas a API y APIs nativas
│   │   ├── api/
│   │   ├── auth/
│   │   ├── camera/
│   │   ├── location/
│   │   └── audio/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── constants/
│
├── backend/
│   ├── src/
│   │   ├── config/               # prismaClient, env
│   │   ├── middleware/           # auth, errorHandler, validate
│   │   ├── routes/               # montaje de endpoints
│   │   ├── controllers/          # parse req / build res
│   │   ├── services/             # lógica de negocio + Prisma
│   │   ├── schemas/              # Zod
│   │   ├── utils/                # jwt, hash, errors
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── tests/                    # Supertest
│
├── tests/                        # Tests móviles
├── app.json
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 3. Flujo de autenticación

```text
Mobile                          Backend
  | POST /api/auth/register        |
  |------------------------------->|
  |                                | Zod validate
  |                                | bcrypt.hash
  |                                | Prisma.user.create
  |<-------------------------------| 201 Created
  |                                |
  | POST /api/auth/login           |
  |------------------------------->|
  |                                | Zod validate
  |                                | bcrypt.compare
  |                                | jwt.sign
  |<-------------------------------| 200 + token
  |                                |
  | guardar token en SecureStore   |
  | incluir token en Authorization: Bearer
```

### Endpoints de autenticación

```text
POST /api/auth/register   → 201 Created
POST /api/auth/login      → 200 OK + { token, user }
GET  /api/auth/me         → 200 OK + user
POST /api/auth/logout     → 204 No Content
```

---

## 4. Modelo de datos (Prisma)

```prisma
model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  tasks         Task[]
}

model Task {
  id                String      @id @default(uuid())
  userId            String
  title             String
  description       String?
  completed         Boolean     @default(false)
  latitude          Float?
  longitude         Float?
  locationAccuracy  Float?
  locationTimestamp DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  user    User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  images  TaskImage[]
  audios  TaskAudio[]

  @@index([userId])
}

model TaskImage {
  id        String   @id @default(uuid())
  taskId    String
  url       String
  filename  String
  mimeType  String
  size      Int
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
}

model TaskAudio {
  id        String   @id @default(uuid())
  taskId    String
  url       String
  duration  Float
  mimeType  String
  size      Int
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
}

---

## 5. API REST

### Autenticación

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Tareas

```text
POST   /api/tasks        → 201 Created
GET    /api/tasks        → 200 OK
GET    /api/tasks/:id    → 200 OK
PATCH  /api/tasks/:id    → 200 OK
DELETE /api/tasks/:id    → 204 No Content
```

### Multimedia (definida, implementación en etapas posteriores)

```text
POST /api/tasks/:id/images
GET  /api/tasks/:id/images
DELETE /api/tasks/:id/images/:imageId

POST /api/tasks/:id/audios
GET  /api/tasks/:id/audios
DELETE /api/tasks/:id/audios/:audioId
```

### Códigos HTTP

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

---

## 6. Seguridad

- Contraseñas hasheadas con bcrypt.
- JWT firmado con secreto en `.env`.
- Token móvil en `expo-secure-store`.
- Middleware `requireAuth` en todas las rutas privadas.
- `userId` extraído del JWT, nunca del body.
- Cada query de tarea incluye `where: { id, userId }`.
- Zod valida body, params y query.
- Errores sin stack trace en producción.
- Validación de archivos: mime type, tamaño máximo.
- `.env` ignorado en Git.

---

## 7. Almacenamiento de archivos

| Tipo | Estrategia |
|------|------------|
| Datos estructurados | PostgreSQL vía Prisma |
| Imágenes | Archivo local fuera de PostgreSQL + metadata |
| Audios | Archivo local fuera de PostgreSQL + metadata |
| JWT / tokens | expo-secure-store |
| Preferencias | AsyncStorage no sensible |

Los archivos se sirven mediante endpoints autenticados que validan ownership; no se publican mediante `express.static`. En producción, el almacenamiento local puede sustituirse por objetos sin cambiar el modelo de metadata.

---

## 8. Estrategia de permisos

| Periférico | Solicitud |
|------------|-----------|
| Cámara | Al presionar "Adjuntar fotografía" en crear/editar tarea |
| Ubicación | Al activar "Asociar ubicación actual" |
| Micrófono | Al presionar "Grabar nota de voz" |

### Reglas

- Nunca solicitar al inicio de la app.
- Si el permiso es denegado, mostrar explicación y opción a configuración.
- Si el permiso opcional es rechazado, la app continúa funcionando.
- No guardar datos sensibles sin necesidad.
- No evadir restricciones del sistema operativo.

---

## 9. Estrategia de testing

### Backend

- Jest + Supertest.
- Tests por feature: auth, tasks, authorization.
- Mock de Prisma para aislar controladores.
- Casos: 2xx, 4xx, 5xx, acceso entre usuarios, JWT inválido.

### Mobile

- React Native Testing Library.
- Tests de componentes y hooks.
- Mocks de APIs nativas: cámara, ubicación, audio.

### Manuales

- Colección Postman para todos los endpoints.
- Evidencia de permisos denegados, errores y éxitos.

---

## 10. Correspondencia con la rúbrica

| Indicador | Puntaje máximo | Cómo se cubre |
|---|---|---|
| Integración de periféricos | 20 | Cámara, GPS y audio asociados realmente a tareas |
| Gestión de permisos | 20 | Solicitud contextual, denegación manejada, app no bloqueada |
| Pruebas de periféricos | 12 | Tests de cámara, GPS y audio con mocks y validaciones |
| Integración con servicios web/APIs | 28 | REST con Express, JWT, Prisma, PostgreSQL, Zod, autorización |
| Pruebas de servicios web/APIs | 20 | Jest + Supertest + Postman |

---

## 11. Decisiones clave

1. **PostgreSQL para todo lo relacional**: usuarios, tareas, metadatos. Archivos binarios fuera de la base.
2. **Expo Router para navegación**: rutas por convención, guards en `_layout.tsx`.
3. **JWT + SecureStore**: sesión persistente y segura.
4. **Servicios separados de pantallas**: la misma API puede usarse desde cualquier pantalla.
5. **Zod en backend y móvil**: UX rápida en cliente, validación obligatoria en servidor.
6. **Permisos diferidos**: nunca al inicio, siempre ligados a una acción concreta.
7. **Tests desde ETAPA 1**: cada funcionalidad se entrega con pruebas, no al final.

---

## 12. Definition of Done de esta etapa

- [x] Arquitectura definida.
- [x] Modelo de datos definido.
- [x] Relaciones definidas.
- [x] API definida.
- [x] Autenticación definida.
- [x] Estrategia de almacenamiento definida.
- [x] Estrategia de permisos definida.
- [x] Estrategia de testing definida.
- [x] Correspondencia con la rúbrica definida.

> Nota: no se escribió código funcional en esta etapa. La implementación comienza en ETAPA 1.
