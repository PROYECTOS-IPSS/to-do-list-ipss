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
