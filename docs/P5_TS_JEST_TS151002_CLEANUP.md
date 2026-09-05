# P5 — Limpieza TS151002 de ts-jest

## 1. Línea base

- Rama inicial: `docs/update`; por autorización explícita se continuó en la rama dedicada `fix/ts-jest-warning`.
- Working tree inicial: limpio.
- `git diff --check` inicial: correcto.
- Stash protegido confirmado únicamente mediante `git stash list`:
  `stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable`.
- No se inspeccionó, aplicó, eliminó, renombró ni recreó el stash.

Suite focalizada ejecutada antes del cambio:

```bash
yarn workspace task-manager-backend test tests/preferences.test.ts --runInBand
```

- Exit code: `0`.
- Resultado: 1 suite aprobada, 4 tests aprobados.
- Apariciones de `TS151002`: `1`.
- La captura mostró el warning emitido por `ts-jest[config]`, no por código productivo.

Warning exacto:

```text
ts-jest[config] (WARN) message TS151002: Using hybrid module kind (Node16/18/Next) is only supported in "isolatedModules: true". Please set "isolatedModules: true" in your tsconfig.json.
```

## 2. Configuración efectiva auditada

Jest backend se configuraba originalmente en `backend/jest.config.cjs` mediante:

```js
preset: 'ts-jest'
```

No existía `tsconfig` explícito en Jest. La implementación instalada de `ts-jest` resuelve, cuando no recibe uno, el primer `tsconfig` desde `rootDir`; para backend era `backend/tsconfig.json`.

Cadena anterior:

```text
backend/tsconfig.json
backend/tsconfig.test.json extends ./tsconfig.json
backend/tests/tsconfig.json extends ../tsconfig.test.json
```

Valores efectivos anteriores de `backend/tsconfig.json`:

| Opción | Valor |
|---|---|
| `target` | `ES2022` |
| `module` | `NodeNext` |
| `moduleResolution` | `NodeNext` |
| `isolatedModules` | no definido, efectivo `false` |
| `strict` | `true` |
| `esModuleInterop` | `true` |
| `noEmit` | `true` |

`backend/tsconfig.test.json` agregaba `types: ["node", "jest"]`, `noEmit: true` e incluía `src/**/*.ts` y `tests/**/*.ts`.

Versiones observadas sin descargar ni actualizar dependencias:

- Jest binario usado por los scripts workspace: `29.7.0`.
- `ts-jest`: `29.4.12`.
- TypeScript resuelto por `ts-jest`: `6.0.3`, en `backend/node_modules/ts-jest/node_modules/typescript`.
- TypeScript del workspace resuelto por Node: `5.9.3`.
- Manifests conservan las declaraciones existentes: Jest `^30.0.5`, `ts-jest` `^29.4.1`, TypeScript `^5.9.2`.

## 3. Causa raíz

`module: "NodeNext"` y `moduleResolution: "NodeNext"` son una configuración híbrida de módulos. `ts-jest` consumía `backend/tsconfig.json`, donde `isolatedModules` no estaba activado. Por eso emitía TS151002 durante cada inicialización de configuración.

## 4. Corrección aplicada

Se dejó la configuración productiva sin cambios y se hizo explícita la configuración propia de pruebas:

`backend/jest.config.cjs`:

```js
transform: {
  '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }]
}
```

`backend/tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "types": ["node", "jest"],
    "rootDir": "..",
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

`rootDir: ".."` es necesario porque las pruebas importan servicios compartidos desde `mobile/`; conserva el alcance de `typecheck:tests` y evita el error TS5011 de TypeScript 6 durante `transpileModule` aislado.

No se cambió `module` ni `moduleResolution`. No se modificaron dependencias ni `yarn.lock`.

No se usó `diagnostics.ignoreCodes: [151002]`: esa opción ocultaría el diagnóstico en vez de corregir la configuración que lo produce. Tampoco se desactivaron diagnósticos, se filtró stderr ni se modificaron APIs de consola.

## 5. Evidencia antes/después

- Antes, suite focalizada: 1 aparición de `TS151002`; 1 suite / 4 tests aprobados.
- Después, suite focalizada: 0 apariciones; 1 suite / 4 tests aprobados.
- Después, backend completo: 0 apariciones; 8 suites / 80 tests aprobados.
- Después, `yarn test`: 0 apariciones; backend 8 suites / 80 tests y mobile 14 suites / 127 tests.
- Total raíz: 22 suites / 207 tests aprobados.
- Los `console.info` de autenticación mobile permanecieron como logs informativos conocidos; no son warnings TS151002.

Las búsquedas de `TS151002|ts-jest[config].*WARN` se realizaron sobre las capturas temporales completas de suite focalizada, backend y `yarn test`.

## 6. Gates completos

Ejecutados en el orden solicitado:

- `git diff --check`: aprobado.
- `yarn workspace task-manager-backend test --runInBand`: 8 suites / 80 tests, aprobado.
- `yarn typecheck`: aprobado.
- `yarn typecheck:tests`: aprobado.
- `yarn lint`: aprobado.
- `yarn test`: backend 8/80, mobile 14/127, total 22/207, aprobado.
- Cero apariciones de TS151002 en backend completo y `yarn test`.

## 7. Alcance

Archivos modificados:

- `backend/jest.config.cjs`
- `backend/tsconfig.test.json`
- `docs/P5_TS_JEST_TS151002_CLEANUP.md`

No cambiaron lógica backend, controladores, servicios, Prisma, API, mobile, Docker, Postman, UI ni `yarn.lock`. No se añadieron dependencias. El cambio no afecta Android, Expo, EAS ni Development Build.

`docs/P5_BLOCK_F1_DOCUMENTATION_POSTMAN.md` no contiene una afirmación de TS151002 que requiriera actualización; solo registra los logs informativos conocidos de autenticación mobile.

## 8. Estado del stash y limitaciones

- `stash@{0}: On fix/audio-feature: backup B2 audio antes de volver al estado estable` continúa presente según `git stash list`.
- No se ejecutó commit ni push.
- No quedan warnings TS151002 en las capturas verificadas.
- No se ejecutó validación Android/EAS porque este cambio es exclusivamente TypeScript/Jest.
