# ETAPA 3 — Autenticación y seguridad

## Objetivo

Implementar registro, login, JWT, sesión persistente y autorización.

---

# Endpoints

POST /api/auth/register

POST /api/auth/login

GET /api/auth/me

POST /api/auth/logout

---

# Registro

Validar:

- nombre;
- email;
- contraseña;
- email único.

Las contraseñas deben almacenarse mediante hash seguro.

Nunca almacenar contraseñas en texto plano.

---

# Login

Flujo:

email + password
↓
Express
↓
usuario
↓
verificación hash
↓
JWT
↓
Mobile

Nunca devolver passwordHash.

---

# JWT

Implementar:

- generación;
- validación;
- expiración;
- middleware;
- rutas protegidas.

---

# Autorización

El userId debe provenir de la sesión autenticada.

Nunca confiar en un userId enviado por el cliente para determinar propiedad.

Un usuario NO puede:

- leer tareas ajenas;
- editar tareas ajenas;
- eliminar tareas ajenas;
- acceder a imágenes ajenas;
- acceder a audios ajenos.

---

# SecureStore

Guardar el JWT utilizando:

expo-secure-store

Nunca almacenar JWT en AsyncStorage.

---

# Navegación

Separar:

(auth)
(tabs)

Sin sesión:

Login/Register

Con sesión:

Aplicación

Logout:

Login

---

# Persistencia

Al iniciar:

1. Obtener token.
2. Validar sesión.
3. Obtener usuario.
4. Mostrar aplicación.
5. Si el token es inválido, eliminarlo.

---

# Definition of Done

- [ ] Registro.
- [ ] Login.
- [ ] Logout.
- [ ] /me.
- [ ] JWT.
- [ ] Hash.
- [ ] SecureStore.
- [ ] Rutas protegidas.
- [ ] Autorización.
- [ ] Sesión persistente.
- [ ] Token inválido manejado.
- [ ] PasswordHash nunca expuesto.

---

# NO IMPLEMENTAR

- Cámara.
- GPS.
- Audio.
- AsyncStorage.
- Upload multimedia.

---

# Condición para avanzar

Dos usuarios deben poder utilizar la aplicación y solamente acceder a sus propios datos.
