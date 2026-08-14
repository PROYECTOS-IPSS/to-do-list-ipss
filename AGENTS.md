# AGENTS.md — Task Manager Mobile

## 1. Propósito del proyecto

Construir una aplicación móvil de gestión de tareas utilizando **React Native + Expo + TypeScript**, acompañada de una API REST desarrollada con **Express + TypeScript**, persistencia mediante **Prisma + PostgreSQL** y autenticación segura.

El proyecto tiene como objetivo principal cumplir el nivel **Sobresaliente (90–100%)** de la rúbrica de evaluación de la Unidad 2 de Desarrollo de Aplicaciones Móviles.

La aplicación debe integrar de forma real y funcional tres capacidades/periféricos del dispositivo:

1. **Cámara**
2. **GPS / ubicación**
3. **Micrófono / audio**

Estas funcionalidades no deben existir únicamente para demostrar uso de APIs nativas: cada una debe tener una utilidad concreta dentro del sistema de tareas.

---

# 2. Objetivos de evaluación

El desarrollo debe cubrir explícitamente los siguientes indicadores de la rúbrica:

| Indicador                          | Puntaje máximo | Objetivo      |
| ---------------------------------- | -------------: | ------------- |
| Integración de periféricos         |             20 | Sobresaliente |
| Gestión de permisos                |             20 | Sobresaliente |
| Pruebas de periféricos             |             12 | Sobresaliente |
| Integración con servicios web/APIs |             28 | Sobresaliente |
| Pruebas de servicios web/APIs      |             20 | Sobresaliente |
| **TOTAL**                          |        **100** | **90–100%**   |

El agente debe considerar estos indicadores como requisitos funcionales y técnicos del proyecto.

Una funcionalidad no debe considerarse terminada simplemente porque "funciona". Debe contemplar:

- implementación;
- estados de carga;
- manejo de errores;
- permisos;
- validación;
- casos de denegación;
- seguridad;
- pruebas;
- documentación.

---

# 3. Concepto de la aplicación

La aplicación será un **Task Manager móvil**.

Los usuarios podrán:

- registrarse;
- iniciar sesión;
- cerrar sesión;
- mantener una sesión persistente;
- crear tareas;
- visualizar tareas;
- editar tareas;
- completar tareas;
- eliminar tareas;
- asociar fotografías;
- asociar una ubicación;
- grabar notas de voz;
- reproducir notas de voz.

Cada usuario debe poder acceder exclusivamente a sus propios datos.

---

# 4. Stack tecnológico obligatorio

## Aplicación móvil

- React Native
- Expo
- TypeScript
- Expo Router
- Async Storage para configuraciones del usuario

## Capacidades nativas

Utilizar las librerías oficiales/adecuadas del ecosistema Expo para:

- cámara;
- ubicación;
- audio;
- almacenamiento seguro.

Preferir APIs modernas y mantenidas. Antes de instalar una librería, comprobar compatibilidad con la versión de Expo utilizada.

## Backend

- Node.js
- Express
- TypeScript
- Nodemon

## Base de datos

- PostgreSQL
- Prisma ORM

## Validación

- Zod

## Autenticación

- JWT
- almacenamiento seguro de credenciales/tokens mediante `expo-secure-store`
- hash seguro de contraseñas mediante una librería apropiada

## Testing

- Jest
- Supertest
- React Native Testing Library

## Pruebas manuales de API

- Postman

---

# 5. Arquitectura general

La arquitectura debe separar claramente aplicación móvil, API, lógica de negocio, acceso a datos y capacidades nativas.

```text
┌─────────────────────────────────────────┐
│              React Native               │
│                  Expo                   │
│                TypeScript               │
├─────────────────────────────────────────┤
│ UI / Screens / Components               │
│ Hooks                                   │
│ Feature Services                        │
│ Native Services                         │
└───────────────────┬─────────────────────┘
                    │
                  HTTPS
                    │
┌───────────────────▼─────────────────────┐
│             Express API                 │
│              TypeScript                 │
├─────────────────────────────────────────┤
│ Routes                                  │
│ Middleware                              │
│ Controllers                             │
│ Services                                │
│ Validation / Zod                        │
│ Authentication                          │
└───────────────────┬─────────────────────┘
                    │
                 Prisma
                    │
┌───────────────────▼─────────────────────┐
│              PostgreSQL                 │
└─────────────────────────────────────────┘
```

Los archivos relacionados con capacidades nativas no deben contener lógica de negocio innecesaria.

Por ejemplo:

```text
Screen
  ↓
Hook
  ↓
Service
  ↓
Expo Native API
```

---

# 6. Estructura recomendada del proyecto

La estructura puede evolucionar durante el desarrollo, pero debe mantener una separación clara de responsabilidades.

```text
project/
│
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   │
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── tasks.tsx
│   │   └── profile.tsx
│   │
│   └── tasks/
│       ├── create.tsx
│       ├── [id].tsx
│       └── edit.tsx
│
├── src/
│   ├── components/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── camera/
│   │   ├── location/
│   │   └── audio/
│   │
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── camera/
│   │   ├── location/
│   │   └── audio/
│   │
│   ├── hooks/
│   │
│   ├── types/
│   │
│   ├── utils/
│   │
│   └── constants/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── schemas/
│   │   ├── utils/
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── tests/
│
├── tests/
│
├── app.json
├── package.json
├── tsconfig.json
├── AGENTS.md
└── README.md
```

No crear una estructura excesivamente compleja sin justificación.

---

# 7. Funcionalidades principales

## 7.1 Autenticación

Implementar:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Registro

Debe validar:

- nombre;
- email;
- contraseña;
- confirmación de contraseña cuando corresponda.

Usando schemas zod antes de enviar peticiones al backend

Nunca almacenar contraseñas en texto plano.

Guardar únicamente un hash seguro usando bcrypt.

### Login

El servidor debe:

1. buscar usuario;
2. verificar credenciales;
3. generar token;
4. devolver respuesta segura;
5. nunca devolver `passwordHash`.

### Persistencia

El token debe almacenarse de forma segura en el dispositivo mediante `expo-secure-store`.

No utilizar almacenamiento inseguro para credenciales.

---

# 8. Autorización

Todas las rutas privadas deben utilizar middleware de autenticación.

Ejemplo conceptual:

```text
Request
   ↓
Authorization: Bearer <token>
   ↓
Auth Middleware
   ↓
Validar JWT
   ↓
Obtener userId
   ↓
Controller
```

Un usuario nunca debe poder:

- consultar tareas de otro usuario;
- modificar tareas de otro usuario;
- eliminar tareas de otro usuario;
- consultar imágenes de otro usuario;
- consultar audios de otro usuario.

La autorización debe verificarse en el backend, nunca confiar únicamente en el cliente.

---

# 9. Sistema de tareas

Implementar CRUD completo.

```text
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Cada tarea debe contener como mínimo:

```text
id
userId
title
description
completed
createdAt
updatedAt
```

Debe ser posible:

- crear;
- listar;
- consultar;
- modificar;
- completar;
- eliminar.

El frontend debe manejar:

- loading;
- success;
- empty state;
- error;
- retry.

---

# 10. Integración con cámara

La cámara es un periférico obligatorio.

Debe utilizarse para permitir al usuario asociar fotografías a tareas.

Flujo esperado:

```text
Crear/editar tarea
       ↓
"Adjuntar fotografía"
       ↓
Comprobar permiso
       ↓
¿Permiso?
 ┌─────┴─────┐
Sí           No
│             │
▼             ▼
Cámara     Solicitar permiso
│             │
▼        ┌────┴────┐
Captura  Acepta   Deniega
│          │         │
▼          ▼         ▼
Preview  Cámara   Explicación
│
▼
Guardar/subir
```

Debe existir:

- solicitud de permiso;
- manejo de permiso denegado;
- manejo de error;
- captura;
- previsualización;
- cancelación;
- asociación con una tarea.

---

# 11. Imágenes y almacenamiento

Las imágenes no deben almacenarse directamente dentro de PostgreSQL como blobs salvo que exista una justificación técnica explícita.

Separar:

```text
Archivo físico
      ↓
Storage
      ↓
URL
      ↓
PostgreSQL
```

PostgreSQL debe almacenar los metadatos necesarios.

Modelo conceptual:

```text
TaskImage
────────────────
id
taskId
url
filename
mimeType
size
createdAt
```

La solución de almacenamiento puede ser local durante el desarrollo y posteriormente adaptarse a un servicio de almacenamiento de objetos.

No introducir servicios externos innecesarios si dificultan el desarrollo académico.

---

# 12. Integración GPS / ubicación

La ubicación es un periférico obligatorio.

Debe utilizarse para asociar opcionalmente una tarea con la ubicación actual del usuario.

Ejemplo:

```text
Nueva tarea

Título:
Comprar materiales

Descripción:
Comprar madera.

[✓] Asociar ubicación actual
```

La información mínima que debe poder obtenerse/validarse:

```text
latitude
longitude
accuracy
timestamp
```

No guardar únicamente coordenadas sin contexto.

La precisión debe utilizarse para determinar si el dato obtenido es razonablemente confiable.

---

# 13. Funcionalidad adicional basada en GPS

Siempre que sea razonable, implementar una funcionalidad que demuestre que el GPS tiene utilidad real.

Ejemplo:

```text
Tareas cercanas

Comprar pintura
350 m

Retirar paquete
1.2 km

Comprar materiales
2.4 km
```

La distancia puede calcularse utilizando las coordenadas de la tarea y la ubicación actual.

No es obligatorio implementar un mapa si esto aumenta innecesariamente la complejidad.

El objetivo es demostrar:

- obtención;
- validación;
- almacenamiento;
- recuperación;
- utilización de datos de ubicación.

---

# 14. Permisos de ubicación

No solicitar ubicación inmediatamente al iniciar la aplicación.

Solicitarla únicamente cuando el usuario active una funcionalidad que realmente la necesite.

Debe contemplarse:

- permiso concedido;
- permiso denegado;
- permiso restringido;
- error de GPS;
- ubicación no disponible;
- precisión insuficiente.

Si el usuario rechaza el permiso, la aplicación debe seguir funcionando.

La ubicación es opcional para una tarea.

---

# 15. Integración de audio

El micrófono es el tercer periférico.

Debe permitir crear una **nota de voz asociada a una tarea**.

Flujo:

```text
Tarea
 ↓
"Grabar nota"
 ↓
Solicitar permiso micrófono
 ↓
Iniciar grabación
 ↓
Mostrar duración
 ↓
Detener
 ↓
Previsualizar/reproducir
 ↓
Guardar
```

Debe permitir:

- iniciar grabación;
- detener;
- cancelar;
- reproducir;
- detener reproducción;
- manejar errores;
- mostrar duración;
- asociar el audio a una tarea.

Modelo conceptual:

```text
TaskAudio
────────────────
id
taskId
url
duration
mimeType
size
createdAt
```

El archivo de audio no debe almacenarse directamente en PostgreSQL.

---

# 16. Permisos

Los permisos son parte explícita de la evaluación.

Permisos potenciales:

```text
Cámara
Ubicación
Micrófono
```

Reglas:

1. Solicitar permisos únicamente cuando sean necesarios.
2. Explicar al usuario la finalidad cuando sea apropiado.
3. Manejar denegación.
4. Manejar errores.
5. No bloquear toda la aplicación porque un permiso opcional fue rechazado.
6. No solicitar permisos innecesarios.
7. Respetar las configuraciones del sistema operativo.
8. No almacenar información sensible innecesariamente.
9. No intentar evadir las restricciones de permisos del sistema.

---

# 17. Validación de datos

Utilizar Zod en el backend.

Validar:

- registro;
- login;
- creación de tareas;
- modificación de tareas;
- parámetros;
- query parameters;
- datos recibidos de archivos cuando corresponda.

Nunca confiar en que los datos provenientes de React Native son válidos.

La validación del cliente mejora UX, pero la validación del backend es obligatoria.

---

# 18. API REST

La API debe utilizar una estructura consistente.

Ejemplo:

```text
/api/auth/*
/api/tasks/*
/api/task-images/*
/api/task-audios/*
```

Utilizar correctamente códigos HTTP:

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

No devolver siempre `200` aunque haya ocurrido un error.

---

# 19. Manejo de errores

Las respuestas de error deben ser consistentes.

Ejemplo:

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "La tarea no existe."
  }
}
```

Evitar enviar stack traces al cliente en producción.

Registrar errores en el servidor cuando sea necesario.

---

# 20. Seguridad

Implementar como mínimo:

- hash seguro de contraseñas;
- JWT;
- almacenamiento seguro del token;
- validación Zod;
- autorización por usuario;
- HTTPS en entornos donde corresponda;
- variables de entorno;
- no subir secretos al repositorio;
- no almacenar contraseñas en el cliente;
- no confiar en `userId` enviado por el cliente;
- manejo correcto de errores;
- validación de archivos;
- límites razonables para tamaño de archivos.

Utilizar `.env` para secretos.

Nunca colocar:

```text
DATABASE_URL
JWT_SECRET
API_KEYS
```

directamente en código fuente.

---

# 21. Modelo de base de datos

Utilizar PostgreSQL.

Modelo conceptual:

```text
User
────────────────
id
name
email
passwordHash
createdAt
updatedAt

Task
────────────────
id
userId
title
description
completed
latitude
longitude
locationAccuracy
locationTimestamp
createdAt
updatedAt

TaskImage
────────────────
id
taskId
url
filename
mimeType
size
createdAt

TaskAudio
────────────────
id
taskId
url
duration
mimeType
size
createdAt
```

Relaciones:

```text
User
 │
 └──< Task
       │
       ├──< TaskImage
       │
       └──< TaskAudio
```

Utilizar claves foráneas y relaciones Prisma correctamente.

Los campos opcionales deben ser nullable cuando corresponda.

---

# 22. Por qué PostgreSQL

No utilizar NoSQL simplemente porque existan imágenes o audios.

La información principal es altamente relacional:

```text
Usuario
  ↓
Tareas
  ↓
Imágenes
  ↓
Audios
  ↓
Ubicación
```

Los archivos binarios deben manejarse mediante almacenamiento de archivos/objetos.

PostgreSQL almacena principalmente:

- usuarios;
- tareas;
- relaciones;
- metadatos;
- URLs;
- información de ubicación.

Esto mantiene el modelo consistente y aprovecha Prisma.

---

# 23. Testing de periféricos

Cada periférico debe tener casos de prueba.

## Cámara

Probar como mínimo:

```text
[ ] Permiso concedido
[ ] Permiso denegado
[ ] Captura exitosa
[ ] Usuario cancela
[ ] Error de cámara
[ ] Archivo generado correctamente
[ ] Imagen asociada a la tarea
```

## GPS

```text
[ ] Permiso concedido
[ ] Permiso denegado
[ ] Ubicación obtenida
[ ] Coordenadas válidas
[ ] Accuracy disponible
[ ] Timestamp válido
[ ] Ubicación no disponible
[ ] Precisión insuficiente
```

## Audio

```text
[ ] Permiso concedido
[ ] Permiso denegado
[ ] Grabación iniciada
[ ] Grabación detenida
[ ] Grabación cancelada
[ ] Audio reproducible
[ ] Error de grabación
[ ] Audio asociado a tarea
```

---

# 24. Testing de API

La API debe probarse tanto automáticamente como manualmente.

## Autenticación

```text
[ ] Registro exitoso
[ ] Registro con email inválido
[ ] Registro duplicado
[ ] Contraseña inválida
[ ] Login exitoso
[ ] Login incorrecto
[ ] Token inválido
[ ] Token ausente
```

## Tareas

```text
[ ] Crear tarea
[ ] Obtener tareas
[ ] Obtener tarea
[ ] Editar tarea
[ ] Completar tarea
[ ] Eliminar tarea
[ ] Tarea inexistente
[ ] Acceso a tarea de otro usuario
```

## HTTP

Verificar:

```text
2xx
4xx
5xx
```

y casos como:

```text
timeout
servidor apagado
sin conexión
respuesta inválida
```

---

# 25. Testing de seguridad

Probar explícitamente que:

```text
Usuario A
   ↓
intenta acceder
   ↓
Tarea de Usuario B
   ↓
403 Forbidden
```

o la respuesta de autorización que corresponda al diseño.

También probar:

- JWT inválido;
- JWT expirado;
- ausencia de JWT;
- datos manipulados;
- IDs inexistentes;
- inputs inválidos.

Nunca asumir que ocultar botones en React Native constituye seguridad.

---

# 26. Estados de la aplicación móvil

Todas las operaciones de red y periféricos deben manejar al menos:

```text
idle
loading
success
error
```

No mostrar pantallas vacías mientras una operación está ejecutándose.

Para operaciones importantes, mostrar feedback adecuado.

Ejemplo:

```text
Crear tarea
   ↓
Loading
   ↓
API
   ↓
Success / Error
```

---

# 27. Manejo de conectividad

La aplicación debe manejar correctamente la pérdida de conexión.

Si una petición falla por problemas de red:

- no crashear;
- informar al usuario;
- permitir reintentar;
- no duplicar automáticamente una operación sin control.

No es obligatorio implementar sincronización offline completa salvo que sea necesaria.

---

# 28. Rendimiento

Optimizar cuando exista una necesidad real.

Especialmente:

- no realizar solicitudes HTTP innecesarias;
- evitar renders innecesarios;
- comprimir/redimensionar imágenes cuando corresponda;
- limitar tamaño de archivos;
- liberar recursos de cámara/audio;
- detener grabaciones/reproducciones correctamente;
- limpiar listeners de sensores/APIs;
- evitar memory leaks.

Los recursos nativos deben liberarse cuando el componente deja de utilizarlos.

---

# 29. Gestión del ciclo de vida

Cámara, audio y ubicación deben gestionarse respetando el ciclo de vida de React.

Nunca dejar:

- grabaciones activas;
- reproducción activa;
- listeners;
- watchers de ubicación;
- recursos nativos

cuando la pantalla ya no los necesita.

Usar cleanup apropiado.

---

# 30. Navegación

Utilizar Expo Router.

La aplicación debe separar:

```text
(auth)
(tabs)
tasks
```

Las rutas privadas deben requerir autenticación.

Flujo:

```text
App
 ↓
¿Sesión válida?
 ├── No → Login
 │
 └── Sí → Home
```

Después de cerrar sesión:

```text
Logout
 ↓
Eliminar token seguro
 ↓
Volver a Login
```

---

# 31. UX mínima

La aplicación debe ser funcional y clara.

Debe incluir:

- estados vacíos;
- estados de carga;
- errores comprensibles;
- confirmación antes de eliminar;
- feedback al guardar;
- feedback al completar;
- permisos explicados;
- controles accesibles;
- navegación consistente.

No sacrificar estabilidad por elementos visuales innecesarios.

---

# 32. Reglas de implementación

El agente debe:

1. Preferir soluciones simples y mantenibles.
2. Evitar sobreingeniería.
3. Mantener TypeScript estricto.
4. Evitar `any` salvo justificación explícita.
5. Separar UI, lógica de negocio y acceso a APIs.
6. Validar entradas.
7. Manejar errores explícitamente.
8. Escribir código reutilizable.
9. No duplicar lógica.
10. Mantener componentes pequeños.
11. Mantener servicios independientes de las pantallas.
12. No colocar secretos en el repositorio.
13. No implementar funcionalidades que no aporten a la rúbrica sin justificación.
14. No eliminar funcionalidades existentes para resolver un problema sin investigar primero.
15. No considerar una funcionalidad completa hasta tener pruebas correspondientes.

---

# 33. Reglas específicas para el agente

Antes de implementar una funcionalidad importante:

1. Analizar la arquitectura existente.
2. Identificar archivos afectados.
3. Identificar requisitos de la rúbrica relacionados.
4. Implementar la funcionalidad.
5. Implementar manejo de errores.
6. Implementar permisos si corresponde.
7. Crear pruebas.
8. Ejecutar las pruebas.
9. Corregir errores.
10. Documentar la funcionalidad.

No realizar grandes cambios estructurales sin necesidad.

No cambiar de stack tecnológico sin autorización explícita.

No reemplazar PostgreSQL por MongoDB u otra base de datos sin una razón técnica y autorización explícita.

No reemplazar Expo por React Native CLI salvo que exista una incompatibilidad real que lo requiera.

---

# 34. Matriz de cumplimiento de la rúbrica

## Indicador 1 — Periféricos — 20 puntos

### Cámara

```text
[ ] Acceso a cámara
[ ] Captura
[ ] Preview
[ ] Asociación a tarea
[ ] Manejo de errores
[ ] Liberación de recursos
```

### GPS

```text
[ ] Obtener ubicación
[ ] Latitude
[ ] Longitude
[ ] Accuracy
[ ] Timestamp
[ ] Asociación a tarea
[ ] Utilización posterior de ubicación
```

### Audio

```text
[ ] Acceso a micrófono
[ ] Grabación
[ ] Detención
[ ] Reproducción
[ ] Asociación a tarea
[ ] Manejo de errores
```

---

# 35. Indicador 2 — Permisos — 20 puntos

```text
[ ] Permiso de cámara
[ ] Permiso de ubicación
[ ] Permiso de micrófono
[ ] Solicitud contextual
[ ] Denegación manejada
[ ] Explicación al usuario
[ ] Aplicación continúa funcionando si se rechaza permiso opcional
[ ] No solicitar permisos innecesarios
```

---

# 36. Indicador 3 — Pruebas de periféricos — 12 puntos

```text
[ ] Tests de cámara
[ ] Tests de ubicación
[ ] Tests de audio
[ ] Validación de coordenadas
[ ] Validación de accuracy
[ ] Manejo de datos inválidos
[ ] Pruebas de permisos
[ ] Pruebas de errores
[ ] Pruebas de cancelación
```

---

# 37. Indicador 4 — Servicios web/APIs — 28 puntos

```text
[ ] REST API
[ ] Registro
[ ] Login
[ ] JWT
[ ] CRUD de tareas
[ ] Asociación de imágenes
[ ] Asociación de audios
[ ] Ubicación
[ ] Validación Zod
[ ] Autorización
[ ] PostgreSQL
[ ] Prisma
[ ] Manejo de errores
[ ] Códigos HTTP correctos
[ ] Protección de datos
```

---

# 38. Indicador 5 — Pruebas API — 20 puntos

```text
[ ] Tests de autenticación
[ ] Tests CRUD
[ ] Tests de autorización
[ ] Tests de validación
[ ] Tests 2xx
[ ] Tests 4xx
[ ] Tests 5xx
[ ] Test de recurso inexistente
[ ] Test de JWT inválido
[ ] Test de acceso entre usuarios
[ ] Test de error de red
[ ] Pruebas manuales en Postman
```

---

# 39. Criterio de finalización

El proyecto no debe considerarse terminado hasta cumplir:

```text
[ ] Aplicación móvil inicia correctamente
[ ] Backend inicia correctamente
[ ] PostgreSQL funciona correctamente
[ ] Prisma funciona correctamente
[ ] Registro funciona
[ ] Login funciona
[ ] Logout funciona
[ ] Sesión persistente funciona
[ ] CRUD de tareas funciona
[ ] Cámara funciona
[ ] GPS funciona
[ ] Audio funciona
[ ] Permisos funcionan
[ ] Imágenes pueden asociarse a tareas
[ ] Audios pueden asociarse a tareas
[ ] Ubicación puede asociarse a tareas
[ ] Usuarios están aislados entre sí
[ ] Validación funciona
[ ] Errores son manejados
[ ] Tests pasan
[ ] API fue probada con Postman
[ ] No existen secretos en Git
[ ] README documenta instalación
[ ] README documenta ejecución
[ ] README documenta arquitectura
[ ] README documenta pruebas
[ ] README relaciona funcionalidades con la rúbrica
```

---

# 40. Documentación y evidencia

El proyecto debe facilitar la demostración frente al profesor.

Documentar:

- arquitectura;
- stack;
- instalación;
- ejecución;
- configuración de PostgreSQL;
- variables de entorno;
- endpoints;
- autenticación;
- permisos;
- cámara;
- GPS;
- audio;
- pruebas;
- decisiones de seguridad.

Crear una sección en el README denominada:

```text
## Cumplimiento de la rúbrica
```

y relacionar cada indicador con funcionalidades concretas del proyecto.

Ejemplo:

```text
Indicador 1:
Cámara + GPS + audio

Indicador 2:
Permisos contextuales de cámara,
ubicación y micrófono

Indicador 3:
Tests de periféricos y validación
de precisión GPS

Indicador 4:
REST API + JWT + Prisma +
PostgreSQL + validación Zod

Indicador 5:
Jest + Supertest + Postman
```

---

# 41. Principio principal

El proyecto debe parecer una **aplicación móvil real**, no una colección de demostraciones técnicas.

Cada integración nativa debe tener una finalidad:

```text
Cámara
→ evidencia/fotografía de una tarea

GPS
→ ubicación de una tarea

Audio
→ nota de voz de una tarea
```

Cada integración con el backend debe tener una finalidad:

```text
Auth
→ identificar usuario

Tasks
→ gestionar tareas

Images
→ almacenar referencias a fotografías

Audio
→ almacenar referencias a notas de voz

Location
→ almacenar ubicación asociada
```

La implementación debe priorizar:

**funcionalidad + seguridad + robustez + pruebas + mantenibilidad.**

El objetivo final no es simplemente "hacer funcionar la aplicación", sino construir una implementación que permita demostrar de manera objetiva el cumplimiento de todos los indicadores de la evaluación de Unidad 2.
