# Delivery Lunch API

Backend del sistema de pedidos de almuerzo. Construido con **NestJS v11**, **MongoDB Atlas** y **TypeScript**.

## Stack

- **Framework:** NestJS v11 (Express)
- **Base de datos:** MongoDB Atlas + Mongoose v8
- **Auth:** JWT + Passport.js + RBAC (roles: `admin`, `kitchen`)
- **Upload:** Multer + Cloudinary
- **Real-time:** Server-Sent Events (SSE) con RxJS
- **Validación:** class-validator + class-transformer
- **Node:** v24.22.2 LTS (ver `.nvmrc`)

---

## Instalación y configuración local

```bash
# 1. Activar Node.js e instalar dependencias
nvm install
nvm use
npm install

# 2. Copiar variables de entorno
cp .env.example .env
```

Editar `.env` con los valores reales:

| Variable                | Descripción                           |
| ----------------------- | ------------------------------------- |
| `MONGODB_URI`           | Cadena de conexión de MongoDB Atlas   |
| `MONGODB_DB_NAME`       | Nombre de la base de datos            |
| `PORT`                  | Puerto HTTP (default: `3500`)         |
| `JWT_SECRET`            | Secreto para firmar tokens JWT        |
| `JWT_EXPIRES_IN`        | Expiración del token (ej. `7d`)       |
| `ADMIN_USERNAME`        | Usuario administrador                 |
| `ADMIN_PASSWORD_HASH`   | Hash bcrypt del password del admin    |
| `CLOUDINARY_CLOUD_NAME` | Cloud name de Cloudinary              |
| `CLOUDINARY_API_KEY`    | API key de Cloudinary                 |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary              |
| `WHATSAPP_NOTIFY_PHONE` | Teléfono para notificaciones WhatsApp |
| `CALLMEBOT_API_KEY`     | API key de Callmebot                  |

---

## Ejecutar el proyecto

```bash
# Desarrollo (watch mode)
npm run start:dev

# Desarrollo normal
npm run start

# Producción
npm run build
npm run start:prod
```

---

## API Endpoints

### Acceso público (sin auth)

| Método  | Endpoint            | Descripción                   |
| ------- | ------------------- | ----------------------------- |
| `POST`  | `/auth/login`       | Login — devuelve JWT          |
| `GET`   | `/menu/today`       | Menú del día actual           |
| `GET`   | `/menu/:fecha`      | Menú por fecha (`YYYY-MM-DD`) |
| `POST`  | `/orders`           | Crear pedido                  |
| `PATCH` | `/dishes/:id/stock` | Actualizar stock de un plato  |

### Requiere JWT (`Authorization: Bearer <token>`)

| Método   | Endpoint         | Descripción               |
| -------- | ---------------- | ------------------------- |
| `POST`   | `/menu`          | Crear menú                |
| `POST`   | `/menu/:id/copy` | Copiar menú a otra fecha  |
| `PATCH`  | `/menu/:id`      | Actualizar menú           |
| `DELETE` | `/menu/:id`      | Eliminar menú             |
| `POST`   | `/dishes`        | Crear plato               |
| `PATCH`  | `/dishes/:id`    | Actualizar plato          |
| `DELETE` | `/dishes/:id`    | Eliminar plato            |
| `POST`   | `/upload/image`  | Subir imagen a Cloudinary |

### Requiere JWT + rol `admin`

| Método  | Endpoint                     | Descripción                            |
| ------- | ---------------------------- | -------------------------------------- |
| `GET`   | `/orders`                    | Listar pedidos aprobados por admin (filtro: `?estado=...`) |
| `GET`   | `/orders/by-date`            | Listar pedidos aprobados por admin en una fecha específica (`?date=YYYY-MM-DD`) |
| `GET`   | `/orders/stream/admin`       | SSE — stream de pedidos (admin)        |
| `PATCH` | `/orders/:id/cancel`         | Cancelar pedido                        |
| `PATCH` | `/orders/:id/admin-validate` | Validar pedido como admin              |

### Requiere JWT + rol `admin` o `kitchen`

| Método  | Endpoint                 | Descripción                      |
| ------- | ------------------------ | -------------------------------- |
| `GET`   | `/orders/stream/kitchen` | SSE — stream de pedidos (cocina) |
| `PATCH` | `/orders/:id/status`     | Cambiar estado del pedido        |

**Estados de pedido:** `pendiente` | `en_preparacion` | `entregado` | `cancelado`

---

## Filtrado y detalle de pedidos

- Para obtener pedidos por estado: `/orders?estado=entregado` (o cualquier estado válido)
- Para obtener pedidos por fecha: `/orders/by-date?date=YYYY-MM-DD`
- Solo se listan pedidos aprobados por admin (`validadoPorAdmin: true`)

---

## Probar con Insomnia

1. Abre **Insomnia** → **Create** → **Import**
2. Selecciona el archivo `insomnia-collection.json`
3. Elige el environment: **Local** o **Production (Heroku)**
4. Ejecuta `POST /auth/login`, copia el `access_token` y pégalo en la variable `jwt_token` del environment

Ver `INSOMNIA_REQUESTS.md` para ejemplos detallados de cada request.

---

## Deploy en Heroku

Usar una aplicación Heroku para este backend y otra para el frontend.
El buildpack `heroku/nodejs` instala dependencias, ejecuta `heroku-postbuild`
y el `Procfile` inicia el código compilado con `npm run start:prod`.
Node.js se selecciona desde `engines.node` en `package.json`.

1. Instala Heroku CLI e inicia sesión con `heroku login`.
2. Desde este repositorio crea la aplicación (reemplaza el nombre de ejemplo):

   ```bash
   heroku create tu-app-backend --buildpack heroku/nodejs
   ```

3. En **Settings → Config Vars**, configura los valores de `.env.example`:
   `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `CLOUDINARY_CLOUD_NAME`,
   `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET`.
   Los hashes son bcrypt, no contraseñas en texto plano.
   Para habilitar cocina agrega `KITCHEN_USERNAME` y `KITCHEN_PASSWORD_HASH`.
   Para WhatsApp agrega `WHATSAPP_NOTIFY_PHONE` y `CALLMEBOT_API_KEY`.
   No configures `PORT`: Heroku lo asigna automáticamente.
   Asegura que MongoDB Atlas permita las conexiones de la aplicación desplegada.
4. Guarda los cambios en Git, incluyendo `package-lock.json`, y despliega:

   ```bash
   git push heroku main
   heroku ps:scale web=1
   heroku logs --tail
   ```

Obtén la URL real con `heroku info`; úsala en el environment de Insomnia y en
`VITE_API_BASE_URL` del frontend. La URL de ejemplo de la colección debe reemplazarse.
Swagger está disponible en `/api-docs`.

Los secretos se configuran en Heroku; `.env` y `.env.local` son solo locales.
El `Dockerfile` queda disponible para builds de contenedor independientes.
Este flujo de Heroku usa el buildpack de Node.js.

Referencias: [Node.js en Heroku](https://devcenter.heroku.com/articles/nodejs-support)
y [proceso de build](https://devcenter.heroku.com/articles/nodejs-classic-buildpack-builds).

---

## Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Cobertura
npm run test:cov

# E2E
npm run test:e2e
```

---

## Estructura del proyecto

```
src/
├── auth/          # Login JWT + guards + estrategia Passport
├── dishes/        # CRUD de platos
├── menu/          # CRUD de menús + copia de menú
├── orders/        # Pedidos + SSE + notificaciones WhatsApp
├── upload/        # Subida de imágenes a Cloudinary
├── common/        # Filtros, interceptores, utilidades
├── config/        # Configuración de app, base de datos y constantes
└── database/      # Seeds
```

## Flujo local con Google y pedidos seguros

Para una demostración aislada ejecuta `nvm use` y `npm run start:local`.
Este comando compila la API y levanta un replica set MongoDB temporal con los platos del menú de ejemplo.
Ignora la URI de base de datos del `.env` y desactiva WhatsApp; no toca datos reales.
El puerto usa `PORT` del entorno o `.env` (3500 si no se configura).
La cuenta de personal de la demo es `admin/admin` y `cocina/cocina`.
Los datos de demostración se eliminan al detener el proceso.

En el frontend, configura `VITE_API_BASE_URL` con el puerto indicado por la API
local, `VITE_GOOGLE_CLIENT_ID` y ejecuta `npm run dev`.
En Google Cloud, autoriza `http://localhost:5173` como origen JavaScript del cliente web.
Si abres el frontend por `http://127.0.0.1:5173`, autoriza también ese origen.
No copies `GOOGLE_CLIENT_SECRET` al frontend. El acceso usa Google Identity Services
con ID tokens, por lo que solo necesita `GOOGLE_CLIENT_ID` en el backend.

`POST /auth/google` valida el ID token de Google, registra su identidad y devuelve
un JWT de cliente de 15 minutos. La sesión recordada dura como máximo 30 días,
con un token opaco en cookie HttpOnly (`Secure` en producción, `SameSite=Lax`);
MongoDB guarda solo su hash. `POST /auth/refresh` renueva el JWT sin abrir Google
y sin prolongar esos 30 días. `POST /auth/logout` revoca la sesión del dispositivo,
incluidos los accesos ya emitidos. `POST /orders` requiere ese JWT con rol `customer` y
un header `Idempotency-Key` UUID v4. Admin y cocina mantienen su login separado;
no pueden crear pedidos usando sus tokens de personal.

El frontend conserva el carrito, los datos de contacto y el intento pendiente en
sessionStorage. Ante un envío de resultado incierto, reintenta exactamente el mismo
pedido y key. La API evita duplicados mediante índice único por cuenta y key,
reserva el stock y crea el pedido dentro de una transacción; usa el precio guardado de cada plato y calcula el total según la cantidad. Si el precio cambió desde la carga del carrito, rechaza el envío con `409 PRICE_CHANGED` para que el cliente revise el nuevo total. Para usar una base persistente con `npm run start:dev`,
MongoDB debe estar configurado como replica set; el modo standalone no admite estas transacciones.

### Sesión recordada y Clientes

El navegador usa `/api/auth/google`, `/api/auth/refresh` y `/api/auth/logout` en el
mismo origen del frontend. Vite reenvía estas rutas a `VITE_API_BASE_URL`; en
Cloudflare Pages la función `functions/api/auth/[[path]].ts` usa `BACKEND_ORIGIN`
(o `VITE_API_BASE_URL`) como origen HTTPS del backend. No se envían cookies del
personal. El backend exige `X-Customer-Request: 1` y un `Origin` incluido en
`CUSTOMER_WEB_ORIGINS`. En producción esta lista debe configurarse explícitamente,
por ejemplo `https://sabores.serviciosasm.cl`; en desarrollo se permiten localhost
5173/5175 si la variable no está definida. No hace falta habilitar cookies de
terceros ni cambiar el login de administrador/cocina. El access token de cliente
se mantiene en memoria, no en localStorage ni sessionStorage. Tras actualizar,
las sesiones antiguas de una hora requieren entrar una vez con Google.

**Admin → Clientes** permite buscar por nombre, correo o teléfono, consultar
cantidad de pedidos/aprobados y última compra, bloquear y rehabilitar. Incluye los
pedidos anteriores que tengan `customerGoogleId`, sin deducir identidad por nombre
o teléfono ni modificar sus datos. Los registros sin identidad Google quedan fuera.
Nombre de contacto y teléfono se guardan al crear un pedido válido y se ofrecen al
cliente al volver a identificarse. El bloqueo exige confirmación, admite motivo
interno e invalida todas las sesiones anteriores; rehabilitar exige iniciar sesión
otra vez. Los pedidos registrados siguen su curso y se conservan. Todos los pedidos
nuevos siguen requiriendo aprobación manual. La comprobación de cuenta habilitada
comparte transacción con la reserva de stock y la creación del pedido para evitar
que un bloqueo simultáneo deje pasar un nuevo envío.

Pruebas locales aisladas:

```bash
npm test -- --runInBand
npm run test:e2e -- --runInBand --testPathPatterns="customer-access|menu-pricing-access"
```

Los tests usan MongoDB temporal y notificaciones simuladas. La primera ejecución
puede descargar un binario de MongoDB. El inicio de sesión real con Google se
comprueba manualmente con una cuenta del usuario; los tests simulan la respuesta de Google.

## Menú completo

El precio general del menú (`precioBase`) comienza en $5.500 y se administra por fecha
en **Admin → Menús** (`/admin/menus` en el frontend). Cada plato conserva su precio
real (`precio`). En el home solo los platos que cuestan distinto al precio general
muestran su precio junto a Agregar; los demás muestran únicamente el botón.

Todos los menús incluyen ensalada surtida, pan fresco del día
y postre del día, sin selección de ensalada ni postre. Solo el menú hipocalórico
permite y requiere elegir una proteína de sus opciones disponibles. La API valida
esta elección y calcula el total con los precios guardados al crear el pedido.

`PATCH /menu/:id/prices` requiere JWT de administrador. Recibe `precioBase`,
`platos: [{ id, precio }]` con todos los platos del menú y opcionalmente
`expectedUpdatedAt` para detectar cambios de otro administrador. Los montos deben
ser enteros positivos en CLP. Guarda precio general y precios de platos en una
transacción, sin cambiar existencias ni pedidos ya creados. El frontend envía
`expectedUpdatedAt` y permite elegir un precio especial o volver al precio general.
