# Viajes a Medida

Prototipo de la **Plataforma para la cotización asistida y ensamblaje de viajes a medida**, Trabajo Final de Grado de Ingeniería en Software (Universidad Siglo 21).

El cliente de una agencia de viajes minorista carga su pedido con un asistente por pasos e indica sus prioridades. La plataforma combina alojamientos, traslados y excursiones del catálogo de la agencia, calcula el precio estimado de cada opción y las ordena según lo que el cliente priorizó. El agente revisa, ajusta y valida la propuesta antes de que el cliente la vea.

> Los datos de proveedores y tarifas incluidos son **ficticios**, creados con fines de demostración.

## Funcionalidades

| Quién | Qué puede hacer | Historias de usuario |
| --- | --- | --- |
| Cliente | Cargar su solicitud en 4 pasos (viaje, pasajeros, prioridades y confirmación), con comentarios opcionales | HU-01, HU-02 |
| Cliente | Recibir un código de seguimiento en pantalla y por correo | HU-03 |
| Cliente | Consultar su solicitud con el código y su apellido (bloqueo después de 3 intentos fallidos) | HU-04 |
| Cliente | Ver el estado y, cuando la propuesta está validada, las opciones con su precio | HU-05, HU-06 |
| Agente | Ingresar con correo y contraseña | HU-07 |
| Agente | Cargar el catálogo a mano o importando la plantilla estándar (CSV) | HU-08 |
| Agente | Ver las solicitudes, filtrarlas por estado y abrir su detalle | HU-10 |
| Agente | Armar las opciones automáticamente y ver el desglose del precio | HU-11, HU-12 |
| Agente | Cargar el aéreo, reemplazar, agregar o quitar servicios, descartar opciones y validar la propuesta | HU-13, HU-14 |
| Agente | Cambiar el estado de la solicitud, solo a los estados permitidos | HU-15 |

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Presentación | React, Vite, React Router |
| Aplicación | Node.js, Express, Zod, JSON Web Token, bcrypt |
| Datos | PostgreSQL, Prisma ORM |
| Correo | Resend (opcional) |
| Pruebas | Vitest, REST Client |

## Requisitos

- **Node.js** 22 o superior (versión LTS): https://nodejs.org
- **PostgreSQL** 16 o superior: https://www.postgresql.org/download
- **Git**: https://git-scm.com

## Puesta en marcha

El sistema son dos programas que corren a la vez: la **API** (puerto 3000) y el **frontend** (puerto 5173). Cada uno necesita su propia terminal.

### 1. Obtener el código

```bash
git clone https://github.com/tinoiacc/viajes-a-medida.git
cd viajes-a-medida
```

### 2. La API y la base de datos

```bash
cd api
npm install
```

Crear el archivo de configuración a partir de la plantilla:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# macOS / Linux
cp .env.example .env
```

Abrir `api/.env` y completar `DATABASE_URL` con la contraseña del usuario `postgres` de tu PostgreSQL. Si la contraseña tiene caracteres especiales, se escriben codificados (`@` = `%40`, `#` = `%23`).

Crear las tablas, cargar los datos de demostración y levantar la API:

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Tiene que aparecer `API escuchando en http://localhost:3000`. Dejar esta terminal abierta.

### 3. El frontend

En **otra terminal**, desde la raíz del proyecto:

```bash
cd web
npm install
npm run dev
```

Abrir **http://localhost:5173** en el navegador.

### 4. Ingresar como agente

En el menú **Agentes**:

| Usuario | Contraseña |
| --- | --- |
| `agente@demo.com` | `Agente#2026` |

## Datos de demostración

`npx prisma db seed` vacía la base y carga:

- **Destinos:** San Carlos de Bariloche, San Martín de los Andes y El Calafate.
- **Proveedores:** Andes Receptivo (USD) y Lagos del Sur (ARS), importados desde los CSV de `datos-demo/`.
- **Parámetros comerciales:** margen 15 %, tasa 3 % e impuesto 2,5 % sobre el alojamiento.

Las tarifas tienen vigencia **del 1 de noviembre de 2026 al 31 de marzo de 2027**: las solicitudes de prueba tienen que caer en ese rango. **El Calafate no tiene servicios** a propósito, para ver el aviso de "No hay servicios disponibles". `proveedor_lagos.csv` trae **3 filas inválidas** a propósito, para ver la validación de la importación.

## Recorrido sugerido

1. **Cliente:** *Armá tu viaje* → Bariloche, del 12 al 19 de diciembre, 2 adultos, prioridad de categoría 4 y ritmo 2. Al enviar, anotar el código.
2. **Agente:** ingresar, abrir la solicitud, **Pasar a En armado** y **Armar opciones**.
3. **Agente:** cargar un aéreo, reemplazar un hotel, agregar la asistencia al viajero y **Validar y enviar propuesta**.
4. **Cliente:** *Consultá tu solicitud* con el código y el apellido: aparecen las opciones.
5. **Agente:** pestaña *Catálogo* → cargar un servicio a mano e importar `datos-demo/proveedor_lagos.csv`.

## Correo electrónico

- **Sin configuración:** los correos se **simulan**. En la terminal de la API aparece `[correo simulado] Para: … | Asunto: …`.
- **Con Resend:** crear una cuenta en https://resend.com, generar una API key y completarla en `api/.env` (`RESEND_API_KEY`). Sin un dominio propio verificado, Resend solo entrega correos a la dirección de la cuenta: usar ese mismo correo al cargar la solicitud.

## Configuración (`api/.env`)

| Variable | Para qué | Ejemplo |
| --- | --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://postgres:CLAVE@localhost:5432/viajes_a_medida?schema=public` |
| `JWT_SECRET` | Clave para firmar las sesiones del agente | Una frase larga y secreta |
| `TIPO_CAMBIO_ARS_USD` | Pesos por dólar para convertir tarifas | `1540` |
| `PORT` | Puerto de la API | `3000` |
| `FRONTEND_URL` | Origen permitido para el frontend (CORS) | `http://localhost:5173` |
| `BLOQUEO_MINUTOS` | Minutos de bloqueo tras 3 intentos fallidos del cliente | `15` |
| `RESEND_API_KEY` | Clave de Resend (opcional) | `re_…` |
| `CORREO_REMITENTE` | Remitente de los correos (opcional) | `Viajes a Medida <onboarding@resend.dev>` |

## Pruebas

**Pruebas automáticas** de la máquina de estados y de los motores de precios y de ensamblaje (31 pruebas):

```bash
cd api
npm test
```

**Pruebas de la API** por criterio de aceptación: abrir `api/pruebas.http` en VS Code con la extensión *REST Client* y ejecutar cada pedido con *Send Request*. Conviene correr `npx prisma db seed` antes, para que los identificadores coincidan.

## Estructura

```
viajes-a-medida/
├── datos-demo/            CSV ficticios de dos proveedores
├── api/                   Backend: Express + Prisma
│   ├── prisma/            Modelo de datos, migraciones y datos de demostración
│   ├── src/
│   │   ├── lib/           Configuración, conexión a la base y utilidades
│   │   ├── middlewares/   Validación, sesión y manejo de errores
│   │   └── modulos/       auth, catalogo, solicitudes, seguimiento, panel,
│   │                      estados, precios, ensamblaje, opciones, notificaciones
│   ├── tests/             Pruebas automáticas
│   └── pruebas.http       Pruebas de la API
└── web/                   Frontend: React + Vite
    └── src/
        ├── lib/           Conexión con la API, sesión y formatos
        ├── componentes/   Piezas reutilizables
        └── paginas/       Pantallas del cliente y del agente
```

## Problemas frecuentes

| Síntoma | Solución |
| --- | --- |
| `npx` ofrece instalar otra versión de Prisma | El comando se corrió fuera de `api`: responder `n` y repetirlo dentro de `api` |
| npm avisa que bloqueó los *install scripts* de Prisma | `npm install-scripts approve prisma @prisma/client @prisma/engines` y `npm install` |
| `@prisma/client did not initialize yet` | `npx prisma generate` dentro de `api` |
| `P1000: Authentication failed` | Revisar la contraseña de `DATABASE_URL` en `api/.env` |
| `EPERM` al migrar (Windows) | Detener la API antes de correr comandos de Prisma |
| `EBUSY` al guardar un archivo (Windows) | Cerrar el Explorador de archivos con el panel de vista previa activado |
| La página dice "No se pudo conectar con el servidor" | La API no está corriendo: levantarla en su terminal |
