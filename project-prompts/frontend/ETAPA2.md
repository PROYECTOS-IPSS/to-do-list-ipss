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

# TailwindCSS / NativeWind

El proyecto utiliza TailwindCSS mediante NativeWind como sistema principal de estilos.

Todo nuevo componente visual debe utilizar clases Tailwind/NativeWind siempre que sea posible.

Centralizar:

- colores;
- typography;
- spacing;
- border radius;
- shadows;
- estados;
- tamaños.

Los tokens deben integrarse con la configuración de Tailwind existente.

Reutilizar clases mediante componentes y utilidades en lugar de repetir combinaciones arbitrarias.

Evitar:

- StyleSheet para estilos que NativeWind pueda resolver;
- estilos inline repetitivos;
- colores hardcodeados;
- valores arbitrarios innecesarios;
- múltiples sistemas de diseño paralelos.

StyleSheet solamente está permitido cuando exista una limitación técnica real de NativeWind/React Native.

Si se utiliza StyleSheet, documentar brevemente por qué NativeWind no es adecuado para ese caso.

# Styling

Toda la UI de autenticación debe construirse utilizando NativeWind/TailwindCSS.

Utilizar componentes base definidos en UI 1.

No crear estilos independientes para login/register.

Inputs, botones, mensajes de error, loading y estados disabled deben reutilizar los tokens y componentes del Design System.

# REGLA DE ESTILOS — OBLIGATORIA

El proyecto utiliza TailwindCSS mediante NativeWind.

NativeWind/TailwindCSS es el sistema de estilos PRINCIPAL y PREFERIDO.

Para cualquier nuevo trabajo de UI:

1. Intentar resolver el estilo mediante clases NativeWind.
2. Reutilizar componentes existentes.
3. Reutilizar tokens definidos en Tailwind.
4. Crear nuevos tokens solamente cuando exista una necesidad real.
5. Evitar valores arbitrarios.
6. Evitar estilos inline.
7. Evitar StyleSheet cuando NativeWind pueda resolver el problema.

StyleSheet solamente puede utilizarse cuando:

- NativeWind no soporte adecuadamente la propiedad;
- React Native requiera un objeto de estilo;
- exista una limitación técnica comprobable.

Toda utilización excepcional de StyleSheet debe estar justificada.

NO introducir:

- otra librería de UI;
- otro sistema de tokens;
- CSS paralelo;
- estilos duplicados;
- componentes visuales con sistemas de estilos independientes.

El objetivo es que toda la aplicación evolucione hacia un único lenguaje visual basado en TailwindCSS/NativeWind.
