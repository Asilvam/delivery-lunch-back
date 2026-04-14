# Delivery Lunch API

Backend del sistema de pedidos de almuerzo. Construido con **NestJS v11**, **MongoDB Atlas** y **TypeScript**.

## Stack

- **Framework:** NestJS v11 (Express)
- **Base de datos:** MongoDB Atlas + Mongoose v8
- **Auth:** JWT + Passport.js + RBAC (roles: `admin`, `kitchen`)
- **Upload:** Multer + Cloudinary
- **Real-time:** Server-Sent Events (SSE) con RxJS
- **Validación:** class-validator + class-transformer
- **Node:** v22 (ver `.nvmrc`)

---

## Instalación y configuración local

```bash
# 1. Instalar dependencias
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
| `GET`   | `/menu`             | Todos los menús               |
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
| `GET`   | `/orders`                    | Listar pedidos (filtro: `?estado=...`) |
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

## Probar con Insomnia

1. Abre **Insomnia** → **Create** → **Import**
2. Selecciona el archivo `insomnia-collection.json`
3. Elige el environment: **Local** o **Production (Fly.io)**
4. Ejecuta `POST /auth/login`, copia el `access_token` y pégalo en la variable `jwt_token` del environment

Ver `INSOMNIA_REQUESTS.md` para ejemplos detallados de cada request.

---

## Deploy en Fly.io

El proyecto incluye `Dockerfile` (multi-stage) y `fly.toml` listos para deploy.

```bash
# 1. Instalar flyctl
brew install flyctl

# 2. Login
fly auth login

# 3. Crear la app (solo la primera vez)
fly launch --name delivery-lunch-back --region gru --no-deploy

# 4. Configurar variables de entorno secretas
fly secrets set MONGODB_URI="mongodb+srv://..." \
  MONGODB_DB_NAME="delivery_lunch" \
  JWT_SECRET="..." \
  JWT_EXPIRES_IN="7d" \
  ADMIN_USERNAME="admin" \
  ADMIN_PASSWORD_HASH='$2b$10$...' \
  CLOUDINARY_CLOUD_NAME="..." \
  CLOUDINARY_API_KEY="..." \
  CLOUDINARY_API_SECRET="..." \
  WHATSAPP_NOTIFY_PHONE="..." \
  CALLMEBOT_API_KEY="..."

# 5. Deploy
fly deploy
```

La app quedará disponible en `https://delivery-lunch-back.fly.dev`.

Para deploys posteriores solo se necesita:

```bash
fly deploy
```

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
