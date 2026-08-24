# Delivery Lunch API

Backend del sistema de pedidos de almuerzo de **Sabores Angelicales**. Expone las operaciones utilizadas por el cliente, administración, cocina y dashboard de `delivery-lunch-front`.

## Funcionalidades

- Menús diarios y catálogo de platos.
- Creación de pedidos con validación y descuento de stock.
- Validación administrativa antes de enviar pedidos a cocina.
- Gestión del ciclo de preparación, entrega y cancelación.
- Autenticación JWT y autorización por roles `admin` y `kitchen`.
- Actualizaciones en tiempo real mediante Server-Sent Events (SSE).
- Estadísticas de ventas, ingresos, platos, horas punta y cancelaciones.
- Subida de imágenes a Cloudinary.
- Notificaciones de pedidos mediante CallMeBot/WhatsApp.

## Stack

- NestJS 11 sobre Express
- TypeScript 5
- Node.js 22
- MongoDB Atlas y Mongoose 8
- Passport y JWT
- RxJS para SSE
- Multer y Cloudinary
- class-validator y class-transformer

## Requisitos

- Node.js 22, según `.nvmrc`
- npm
- MongoDB Atlas
- Credenciales de Cloudinary para subir imágenes
- Credenciales de CallMeBot si se habilitan notificaciones por WhatsApp

## Configuración local

```bash
nvm use
npm install
cp .env.example .env
```

Variables disponibles:

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `MONGODB_URI` | Sí | Cadena de conexión de MongoDB Atlas. |
| `MONGODB_DB_NAME` | Sí | Nombre de la base de datos. |
| `PORT` | No | Puerto HTTP. El valor predeterminado es `3500`. |
| `JWT_SECRET` | Sí | Secreto utilizado para firmar los JWT. |
| `JWT_EXPIRES_IN` | No | Tiempo de expiración del token, por ejemplo `7d`. |
| `ADMIN_USERNAME` | Sí | Nombre del usuario administrador. |
| `ADMIN_PASSWORD_HASH` | Sí | Hash bcrypt de la contraseña del administrador. |
| `KITCHEN_USERNAME` | No | Nombre del usuario de cocina. |
| `KITCHEN_PASSWORD_HASH` | No | Hash bcrypt de la contraseña del usuario de cocina. |
| `CLOUDINARY_CLOUD_NAME` | Sí para uploads | Cloud name de Cloudinary. |
| `CLOUDINARY_API_KEY` | Sí para uploads | API key de Cloudinary. |
| `CLOUDINARY_API_SECRET` | Sí para uploads | API secret de Cloudinary. |
| `WHATSAPP_NOTIFY_PHONE` | No | Teléfono de destino para notificaciones. |
| `CALLMEBOT_API_KEY` | No | API key de CallMeBot. |

## Ejecución

```bash
# Desarrollo con recarga
npm run start:dev

# Desarrollo sin watch
npm run start

# Build y ejecución de producción
npm run build
npm run start:prod

# Poblar datos iniciales
npm run seed
```

La API local queda disponible normalmente en `http://localhost:3500`.

## Endpoints

### Acceso público

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/` | Comprobación básica del servicio. |
| `POST` | `/auth/login` | Inicia sesión y devuelve `access_token`. |
| `GET` | `/menu/today` | Obtiene el menú del día; devuelve `[]` si no existe. |
| `GET` | `/menu/:fecha` | Obtiene el menú de una fecha `YYYY-MM-DD`; devuelve `[]` si no existe. |
| `POST` | `/orders` | Crea un pedido. |
| `PATCH` | `/dishes/:id/stock` | Actualiza el stock de un plato. |

### Requiere JWT

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/menu` | Crea un menú. |
| `POST` | `/menu/:id/copy?fecha=YYYY-MM-DD` | Copia un menú a otra fecha. |
| `PATCH` | `/menu/:id` | Actualiza un menú. |
| `DELETE` | `/menu/:id` | Elimina un menú. |
| `POST` | `/dishes` | Crea un plato. |
| `PATCH` | `/dishes/:id` | Actualiza un plato. |
| `DELETE` | `/dishes/:id` | Elimina un plato. |
| `POST` | `/upload/image` | Sube una imagen a Cloudinary. |

### Requiere rol `admin`

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/orders?estado=...` | Lista todos los pedidos; permite filtrar por estado. |
| `GET` | `/orders/stream/admin` | Stream SSE de pedidos nuevos para administración. |
| `PATCH` | `/orders/:id/admin-validate` | Aprueba un pedido y lo envía a cocina. |
| `PATCH` | `/orders/:id/cancel` | Cancela un pedido y restaura su stock. |
| `GET` | `/statistics/summary` | Indicadores generales del periodo. |
| `GET` | `/statistics/top-dishes` | Platos más vendidos. |
| `GET` | `/statistics/peak-hours` | Horas con mayor cantidad de pedidos. |
| `GET` | `/statistics/revenue` | Ingresos agrupados por día. |
| `GET` | `/statistics/cancellations` | Estadísticas de cancelación. |
| `POST` | `/dev-tools/clear-statistics-cache` | Limpia manualmente el caché de estadísticas. |

Los endpoints de estadísticas aceptan `startDate` y `endDate`. `top-dishes` también acepta `limit`.

### Requiere rol `admin` o `kitchen`

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/orders/ByAdminTrue` | Lista pedidos aprobados por administración. |
| `GET` | `/orders/stream/kitchen` | Stream SSE de pedidos aprobados y cambios de estado. |
| `PATCH` | `/orders/:id/status` | Avanza un pedido a preparación o entrega. |

Estados válidos en `/orders/:id/status`: `en_preparacion` y `entregado`. Las cancelaciones administrativas usan `/orders/:id/cancel` para restaurar el stock.

## Insomnia

1. Importa `insomnia-collection.json` en Insomnia.
2. Para desarrollo utiliza el environment local.
3. Para producción configura `base_url` con la URL pública del backend en Heroku.
4. Ejecuta `POST /auth/login` y guarda el `access_token` en la variable `jwt_token`.

Consulta `INSOMNIA_REQUESTS.md` para ver cuerpos y respuestas de ejemplo.

## Deploy en Heroku

El backend se ejecuta en Heroku. El frontend permanece como sitio estático en Cloudflare Pages y consume la URL pública de esta API mediante `VITE_API_BASE_URL`.

```text
delivery-lunch-front (Cloudflare Pages estático)
                         │
                         ▼
             delivery-lunch-back (Heroku)
                  ├── MongoDB Atlas
                  ├── Cloudinary
                  └── CallMeBot
```

### Configuración de la aplicación

Define las variables de entorno desde **Heroku Dashboard → Settings → Config Vars** utilizando los mismos nombres descritos en la sección de configuración local. Heroku entrega `PORT` automáticamente; la aplicación ya lo lee desde `process.env.PORT`.

No guardes secretos reales en Git, `.env.example`, scripts de despliegue ni documentación.

### Build y arranque

Heroku detecta el proyecto mediante `package.json` y ejecuta su script `build`. Para producción, el proceso web debe iniciar el resultado compilado:

```text
web: npm run start:prod
```

El repositorio todavía no contiene un `Procfile` y su script `start` ejecuta Nest CLI. Antes de cambiar o recrear el despliegue, se recomienda agregar el `Procfile` anterior o cambiar `start` a `node dist/main`.

También se recomienda declarar Node.js 22 en `package.json`:

```json
{
  "engines": {
    "node": "22.x"
  }
}
```

Estas recomendaciones describen cambios pendientes; este README no ejecuta ni modifica la aplicación activa de Heroku.

### Consideración para SSE

`OrdersSseService` mantiene sus eventos en memoria. Debe conservarse una sola instancia web mientras se use este diseño. Escalar a más instancias podría separar los eventos de administración y cocina; antes de hacerlo debe implementarse un bus compartido.

> No crear aplicaciones, agregar add-ons, escalar dynos ni cambiar planes con costo sin autorización explícita del propietario.

Documentación oficial: [despliegue de Node.js en Heroku](https://devcenter.heroku.com/articles/deploying-nodejs), [config vars](https://devcenter.heroku.com/articles/config-vars) y [Procfile](https://devcenter.heroku.com/articles/procfile).

## Tests y calidad

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Cobertura
npm run test:cov

# E2E
npm run test:e2e

# Lint con autofix
npm run lint

# Formato
npm run format
```

## Estructura principal

```text
src/
├── auth/          # Login, JWT, guards y roles
├── common/        # Filtros, interceptores y utilidades
├── config/        # Configuración de aplicación y base de datos
├── database/      # Seeds
├── dishes/        # Platos y stock
├── menu/          # Menús diarios
├── orders/        # Pedidos, estados, SSE y WhatsApp
├── statistics/    # Dashboard y agregaciones
├── upload/        # Imágenes en Cloudinary
├── app.module.ts
└── main.ts
```
