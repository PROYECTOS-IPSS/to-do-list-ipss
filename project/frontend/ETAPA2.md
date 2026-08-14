# ETAPA UI 2 — Autenticación UX

## Objetivo

Mejorar visualmente y funcionalmente la experiencia de:

- Login;
- Registro;
- Logout;
- recuperación de errores de autenticación.

La lógica de autenticación existente debe mantenerse.

---

# Auditoría

Revisar las pantallas actuales de:

- Login;
- Registro;
- sesión expirada;
- errores;
- loading.

Identificar:

- jerarquía visual;
- campos;
- botones;
- mensajes;
- navegación;
- feedback.

---

# Login

Implementar una interfaz clara:

- título;
- descripción breve;
- email;
- password;
- mostrar/ocultar password;
- botón principal;
- loading;
- error;
- navegación a registro.

Evitar elementos innecesarios.

---

# Registro

Implementar:

- nombre si corresponde;
- email;
- password;
- confirmación si ya existe;
- validaciones;
- loading;
- errores;
- éxito;
- navegación a login.

---

# Errores

No mostrar errores técnicos del backend directamente.

Transformar:

"401 Unauthorized"

en mensajes comprensibles.

Ejemplo:

"El correo o contraseña no son correctos."

---

# Loading

Durante login/registro:

- bloquear submit duplicado;
- mostrar indicador;
- mantener contexto visual.

---

# Password

Implementar:

- mostrar/ocultar;
- estado visual claro;
- accesibilidad.

No almacenar credenciales en AsyncStorage.

Mantener JWT en SecureStore.

---

# Responsive

Comprobar:

- pantallas pequeñas;
- pantallas grandes;
- teclado abierto;
- orientación soportada.

Evitar que el teclado oculte el formulario.

---

# Restricciones

No modificar:

- JWT;
- SecureStore;
- API;
- validaciones backend;
- sesiones;
- permisos.

---

# Definition of Done

- [ ] Login rediseñado.
- [ ] Registro rediseñado.
- [ ] Password UX mejorada.
- [ ] Loading.
- [ ] Error.
- [ ] Feedback.
- [ ] Teclado controlado.
- [ ] Submit duplicado bloqueado.
- [ ] Accesibilidad revisada.
- [ ] TypeScript PASS.
- [ ] ESLint PASS.
- [ ] Tests PASS.
