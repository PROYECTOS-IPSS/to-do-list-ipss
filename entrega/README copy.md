# Task Manager — Guía de instalación y ejecución

Aplicación móvil académica para gestionar tareas con autenticación, persistencia local, sincronización con un backend, ubicación GPS, fotografías e importación de tareas de demostración.

## Datos de la entrega

- **Asignatura:** Desarrollo de Aplicaciones Móviles
- **Unidad:** Unidad III
- **Docente:** Boris Belmar Muñoz
- **Integrantes:** Alonso García Espinoza / Enrique González Venegas
- **Repositorio:** https://github.com/PROYECTOS-IPSS/to-do-list-ipss
- **APK incluido:** `task-manager-development.apk`

## Opción recomendada: usar el APK incluido

La entrega incluye un **APK Development Build** para que no sea necesario instalar Android Studio, configurar Gradle ni compilar el proyecto antes de probarlo.

> **Importante:** este APK es un Development Build. Para ejecutar la aplicación necesita conectarse a Metro, mientras que el backend y PostgreSQL se ejecutan mediante Docker Compose en el computador.

### Requisitos

- Computador y dispositivo Android conectados a la misma red local.
- Docker Engine o Docker Desktop con Docker Compose v2.
- Node.js `v24.15.0` o una versión compatible con el proyecto.
- Yarn Classic `1.22.22`.
- Git.
- Dispositivo Android con permiso para instalar aplicaciones desde fuentes externas.

No es necesario instalar Android Studio para utilizar el APK incluido.

## 1. Obtener el proyecto

Clonar el repositorio y entrar en su directorio:

```bash
git clone https://github.com/PROYECTOS-IPSS/to-do-list-ipss.git
cd to-do-list-ipss
```

## 2. Instalar dependencias

Desde la raíz del proyecto:

```bash
yarn install --frozen-lockfile
```

## 3. Obtener la IP local del computador

El celular no puede usar `localhost` para comunicarse con el backend del computador. Se debe utilizar la dirección IPv4 del computador dentro de la red local.

En Linux:

```bash
hostname -I
```

En Windows PowerShell:

```powershell
ipconfig
```

Seleccionar la IPv4 correspondiente a la conexión Wi-Fi o Ethernet activa. Evitar direcciones de VPN, Docker, máquinas virtuales o interfaces de loopback.

Ejemplo:

```text
192.168.1.50
```

## 4. Preparar la configuración

Reemplazar `IP_LAN_DEL_PC` por la dirección obtenida anteriormente:

```bash
yarn setup --non-interactive --api-url http://IP_LAN_DEL_PC:3000
```

Ejemplo:

```bash
yarn setup --non-interactive --api-url http://192.168.1.50:3000
```

Este comando prepara el archivo `.env` raíz. Los secretos existentes no deben publicarse ni adjuntarse a la entrega.

Si cambia la red o la IP del computador, repetir el comando con la nueva dirección antes de iniciar Metro.

## 5. Instalar el APK en Android

Copiar `task-manager-development.apk` al dispositivo Android, abrirlo e instalarlo. Android podría solicitar autorización para instalar aplicaciones desde esa fuente.

También puede instalarse mediante ADB, si se encuentra disponible:

```bash
adb install -r ./entrega/task-manager-development.apk
```

No abrir todavía la aplicación, o dejarla esperando hasta que el siguiente comando haya iniciado los servicios.

## 6. Iniciar Docker, el backend y Metro

Desde la raíz del proyecto:

```bash
yarn dev:docker
```

Este comando:

1. construye e inicia PostgreSQL y el backend mediante Docker Compose;
2. ejecuta las migraciones Prisma pendientes;
3. espera que `GET /ready` confirme la conexión con PostgreSQL;
4. inicia Expo/Metro en el computador para el Development Build.

Esperar hasta que la terminal indique que Metro está disponible. Mantener esta terminal abierta durante toda la prueba.

## 7. Abrir la aplicación

1. Confirmar que el celular y el computador estén en la misma red local.
2. Abrir **Task Manager** en el dispositivo.
3. Seleccionar el servidor de desarrollo mostrado por Expo, si la aplicación lo solicita.
4. Esperar que finalice la primera descarga del bundle JavaScript.

La primera carga puede tardar más que las siguientes.

## Verificación rápida

Para comprobar las funciones principales:

1. Registrar una cuenta e iniciar sesión.
2. Crear una tarea de texto.
3. Crear o editar una tarea agregando ubicación GPS.
4. Capturar y asociar una fotografía.
5. Cerrar y volver a abrir una tarea para comprobar la persistencia local.
6. Pulsar **Sincronizar** y revisar que la tarea permanezca visible.
7. Completar, reabrir, editar y eliminar una tarea.
8. Abrir **Tareas de ejemplo**, consultar la fuente, seleccionar registros e importarlos.

La captura de fotografías y el GPS requieren aceptar los permisos solicitados por Android.

## Comandos útiles

| Acción                      | Comando               |
| --------------------------- | --------------------- |
| Iniciar entorno completo    | `yarn dev:docker`     |
| Ver estado de contenedores  | `yarn status:docker`  |
| Ver logs                    | `yarn logs:docker`    |
| Detener servicios           | `yarn stop:docker`    |
| Reconstruir imágenes Docker | `yarn rebuild:docker` |
| Verificar tipos             | `yarn typecheck`      |
| Ejecutar lint               | `yarn lint`           |
| Ejecutar pruebas            | `yarn test`           |

Al presionar `Ctrl+C` en la terminal de `yarn dev:docker`, Metro se detiene y Docker Compose ejecuta `down` sin borrar los volúmenes persistentes.

## Solución de problemas

### La aplicación no se conecta al backend

Comprobar desde el computador:

```bash
curl http://127.0.0.1:3000/ready
```

La respuesta esperada es:

```json
{ "status": "ready" }
```

Después comprobar usando la IP LAN configurada:

```bash
curl http://IP_LAN_DEL_PC:3000/ready
```

Si `127.0.0.1` funciona, pero la IP LAN no responde:

- verificar la IP configurada;
- confirmar que ambos dispositivos estén en la misma red;
- revisar el firewall del computador;
- evitar redes de invitados que aíslan dispositivos;
- desactivar temporalmente una VPN que cambie la ruta local.

### La aplicación intenta utilizar una IP anterior

Detener el entorno, actualizar la configuración y volver a iniciarlo:

```bash
yarn setup --non-interactive --api-url http://NUEVA_IP_LAN:3000
yarn dev:docker
```

Luego recargar la aplicación desde Metro.

### El puerto 3000 está ocupado

Editar `BACKEND_PORT` en `.env` y utilizar el mismo puerto en la URL pública. Por ejemplo:

```text
BACKEND_PORT=3001
EXPO_PUBLIC_API_URL=http://192.168.1.50:3001
```

Después reconstruir o reiniciar el entorno.

### El Development Build no encuentra Metro

- confirmar que `yarn dev:docker` continúe ejecutándose;
- comprobar que celular y computador compartan la misma LAN;
- permitir el tráfico local en el firewall;
- recargar la aplicación;
- revisar la URL mostrada en la terminal de Expo.

### Docker no inicia

Consultar:

```bash
yarn status:docker
yarn logs:docker
```

No ejecutar `docker compose down -v`, ya que elimina deliberadamente los volúmenes y los datos persistidos.

### El APK no se instala

- habilitar temporalmente la instalación desde la fuente utilizada;
- desinstalar una versión anterior si fue firmada con otra credencial;
- comprobar que el archivo APK se haya descargado completamente;
- como alternativa, instalar con `adb install -r`.

## Compilación manual del Development Build

Esta sección es de respaldo. No es necesaria si se utiliza el APK incluido.

Para evitar problemas de espacio en `/tmp`, crear directorios de trabajo dentro del proyecto o en una unidad con espacio suficiente:

```bash
mkdir -p build-output eas-local-work/tmp eas-local-work/home
```

Generar el APK local con EAS CLI utilizando rutas controladas:

```bash
TMPDIR="$PWD/eas-local-work/tmp" \
EAS_LOCAL_BUILD_WORKINGDIR="$PWD/eas-local-work" \
EAS_LOCAL_BUILD_SKIP_CLEANUP=1 \
npx eas-cli build \
  --platform android \
  --profile development \
  --local \
  --output "$PWD/build-output/task-manager-development.apk"
```

Si el proyecto ya dispone de `eas-cli` mediante Yarn, debe preferirse su comando configurado en lugar de descargar otra versión con `npx`.

El perfil `development` debe existir en `eas.json` y producir un APK instalable. La compilación requiere Android SDK/Java y las herramientas nativas correspondientes, aunque no sean necesarias para ejecutar el APK previamente generado.

## Persistencia y seguridad

- PostgreSQL utiliza un volumen Docker nombrado.
- Los archivos multimedia utilizan un volumen independiente.
- Detener el entorno normalmente no elimina los datos.
- `.env` está ignorado por Git y no debe compartirse.
- Solo `EXPO_PUBLIC_API_URL` se expone a la aplicación móvil.
- Los tokens de autenticación no deben incluirse en URLs, capturas ni documentación pública.

## Alcance conocido de la entrega

- El APK proporcionado es un Development Build y requiere Metro.
- El backend se ejecuta localmente mediante Docker Compose.
- No se entrega un servidor público permanente.
- El funcionamiento depende de que celular y computador puedan comunicarse dentro de la misma red.
- La información importada desde la fuente externa corresponde a datos ficticios de demostración.

## Cierre correcto

Para finalizar la prueba, presionar `Ctrl+C` en la terminal donde se ejecutó:

```bash
yarn dev:docker
```

Si fuera necesario detener los servicios desde otra terminal:

```bash
yarn stop:docker
```

Los volúmenes se conservan para la siguiente ejecución.
