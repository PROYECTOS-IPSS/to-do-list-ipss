# ETAPA UI 8 — Auditoría visual final

## Objetivo

Realizar una auditoría final de UI/UX sin agregar funcionalidades.

Esta etapa determina si la aplicación está lista para presentación.

---

# Revisar todas las pantallas

Auditar:

- Login;
- Registro;
- Home;
- Task List;
- Task Detail;
- Create Task;
- Edit Task;
- Camera;
- GPS;
- Audio;
- Settings;
- errores;
- empty states;
- loading states.

---

# Criterios

Cada pantalla debe responder:

- ¿Es clara?
- ¿Es consistente?
- ¿Es fácil de usar?
- ¿Existe jerarquía visual?
- ¿Los CTA son evidentes?
- ¿Los errores son comprensibles?
- ¿Los estados están representados?
- ¿Hay elementos innecesarios?
- ¿Hay problemas de alineación?
- ¿Hay problemas de spacing?
- ¿Hay problemas de contraste?

---

# Auditoría técnica

Verificar:

- no duplicación innecesaria;
- no hardcoded styles repetidos;
- no any;
- no ts-ignore;
- no console.log de diagnóstico;
- no código muerto;
- no dependencias innecesarias;
- no listeners sin cleanup.

---

# Regresión

Confirmar que siguen funcionando:

- Auth;
- CRUD;
- ownership;
- cámara;
- GPS;
- audio;
- permisos;
- PostgreSQL;
- API;
- SecureStore;
- AsyncStorage.

---

# Testing

Ejecutar:

npm test
npm run typecheck
npm run lint

Generar Android build.

---

# VERDICT

Usar:

GO

o

NO-GO

Si existe un problema crítico de UX o regresión funcional:

NO-GO.

No avanzar hasta corregirlo.

---

# Definition of Done

- [ ] Todas las pantallas auditadas.
- [ ] Design system aplicado.
- [ ] UX consistente.
- [ ] Accesibilidad revisada.
- [ ] Responsive revisado.
- [ ] Performance revisado.
- [ ] Sin regresiones.
- [ ] Tests PASS.
- [ ] TypeScript PASS.
- [ ] ESLint PASS.
- [ ] Android Build PASS.
- [ ] Auditoría final PASS.

# TailwindCSS / NativeWind Audit

Verificar:

- NativeWind utilizado como sistema principal.
- Tailwind config centraliza tokens.
- No existen sistemas de estilos paralelos innecesarios.
- No existen colores hardcodeados repetidos.
- No existen spacing arbitrarios repetidos.
- No existen StyleSheets innecesarios.
- Componentes reutilizan clases y variantes.
- Estados visuales utilizan el Design System.
- No existen estilos duplicados importantes.

Buscar:

- StyleSheet.create
- style={{
- colores hexadecimales hardcodeados
- valores repetidos de spacing
- borderRadius repetidos
- fontSize repetidos

Cada excepción debe estar técnicamente justificada.

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
