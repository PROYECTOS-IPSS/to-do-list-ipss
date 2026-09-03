# Entorno local Docker Compose

## Prerrequisitos

- Docker Engine/Desktop con Compose v2.
- Node.js `v24.15.0` o compatible con proyecto.
- Yarn Classic `1.22.22`.
- APK Development Build instalado para usar celular/emulador.
- Celular y host en misma LAN para acceder al backend.

No se instala Docker automáticamente.

## Primera instalación

Desde raíz:

```bash
yarn install --frozen-lockfile
yarn setup
yarn dev:docker
```

`yarn setup` crea `.env` únicamente si falta y completa valores Docker ausentes sin sobrescribir valores existentes. Genera `POSTGRES_PASSWORD` y `JWT_SECRET` con `crypto.randomBytes`. Se puede cambiar solo URL pública sin regenerar secretos:

```bash
yarn setup --non-interactive --api-url http://IP_LAN_DEL_HOST:3000
```

La precedencia es: `--api-url` explícito > valor ya existente en `.env` > candidato LAN solo en modo interactivo con exactamente una interfaz. El parser lee pares `KEY=VALUE`; no ejecuta `.env` como shell.

## Único `.env`

Variables usadas:

```text
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
JWT_SECRET
BACKEND_PORT
EXPO_PUBLIC_API_URL
```

`.env` raíz está ignorado por Git, Docker y EAS. No se copia a `mobile/`. Compose entrega al backend solo credenciales/base/puerto/uploads; Metro recibe únicamente `EXPO_PUBLIC_API_URL`.

`db:5432` solo existe dentro de Compose. El celular usa `EXPO_PUBLIC_API_URL` con IP LAN del host y `BACKEND_PORT`. `localhost` desde celular apunta al propio celular, no al host. La base Docker usa volumen nombrado independiente y no toca PostgreSQL existente del host.

## Uso diario

```bash
yarn dev:docker
yarn logs:docker
yarn status:docker
yarn stop:docker
yarn rebuild:docker
```

`dev:docker` valida, construye e inicia `db`, migraciones (`prisma migrate deploy`) y backend. Espera `GET /ready`, que consulta PostgreSQL, antes de iniciar Metro con Development Client en el host. Ctrl+C detiene Metro y ejecuta `docker compose down`; no elimina volúmenes.

Persistencia lógica:

- `task-manager-dev-postgres`: datos PostgreSQL.
- `task-manager-dev-uploads`: `backend/uploads` multimedia.

No usar `down -v` salvo operación destructiva deliberada. No se migran datos automáticamente desde PostgreSQL anterior.

## EAS local

El flujo existente se conserva. Para exportación JavaScript, Metro o APK, la URL pública debe estar definida explícitamente en el proceso/configuración pública; nunca se pasa `.env` completo al bundle. No se ejecutó EAS en esta tarea.

## Recuperación

- Compose ausente: instalar Docker Compose v2 y repetir `yarn setup`.
- `BACKEND_PORT` ocupado: editar solo `BACKEND_PORT` y actualizar `EXPO_PUBLIC_API_URL` con el mismo puerto.
- Varias interfaces LAN: elegir IP física, no VPN/bridge, y ejecutar `yarn setup --api-url ...`.
- Migración fallida: ejecutar `yarn logs:docker`; backend no se anuncia listo.
- Backend no listo: revisar `yarn status:docker` y logs; no borrar volúmenes.

## Verificación

Ejecutado:

- `docker compose config --quiet`: correcto.
- `yarn setup --non-interactive` dos veces: correcto; configuración idempotente.
- Build real Compose: correcto.
- PostgreSQL saludable: correcto.
- `migrate` terminó con exit 0 y sin migraciones pendientes: correcto.
- `GET http://127.0.0.1:3000/ready`: `200 {"status":"ready"}`.
- Imagen generada con `openssl` y `ca-certificates`; logs de Prisma no mostraron advertencia de OpenSSL.
- `yarn dev:docker` inició backend, readiness y Metro; `timeout --signal=INT` detuvo Metro y Compose, conservando volúmenes.
- `yarn typecheck`, `yarn typecheck:tests` y `yarn lint`: correctos.

Se verificó `yarn stop:docker` y los volúmenes nombrados `task-manager-dev-postgres` y `task-manager-dev-uploads` permanecen existentes. No se probaron registro/login ni persistencia de tarea/archivo en esta ejecución.

## Corrección de arranque
