# Requests para Insomnia — Delivery Lunch API

Importa el archivo `insomnia-collection.json` en Insomnia para tener todos los requests listos.

**Cómo importar:**

1. Abre **Insomnia**
2. Click en **"Create"** → **"Import"**
3. Selecciona `insomnia-collection.json`
4. Elige el environment: **Local** o **Production (Fly.io)**
5. Tras hacer login, copia el token y pégalo en la variable `jwt_token` del environment activo

---

## Environments

| Environment         | `base_url`                            | `jwt_token`         |
| ------------------- | ------------------------------------- | ------------------- |
| Local               | `http://localhost:3500`               | (llenar tras login) |
| Production (Fly.io) | `https://delivery-lunch-back.fly.dev` | (llenar tras login) |

---

## Auth

### POST /auth/login

**URL:** `{{ base_url }}/auth/login`
**Headers:** `Content-Type: application/json`

```json
{
  "username": "admin",
  "password": "tu_password_aqui"
}
```

> Copia el `access_token` de la respuesta y pégalo en `jwt_token` del environment.

---

## Menu

### GET /menu/today

**URL:** `{{ base_url }}/menu/today`
**Auth:** No requerida

---

### GET /menu/:fecha

**URL:** `{{ base_url }}/menu/2026-04-14`
**Auth:** No requerida

---

### POST /menu — Create Menu

**URL:** `{{ base_url }}/menu`
**Headers:** `Content-Type: application/json`, `Authorization: Bearer {{ jwt_token }}`

```json
{
  "fecha": "2026-04-14",
  "ensalada": ["Ensalada surtida", "Ensalada chilena", "Repollo con zanahoria"],
  "pan": "Pan amasado",
  "postre": ["Flan de vainilla", "Jalea light"]
}
```

---

### POST /menu/:id/copy — Copy Menu

**URL:** `{{ base_url }}/menu/MENU_ID_AQUI/copy?fecha=2026-04-15`
**Headers:** `Authorization: Bearer {{ jwt_token }}`

> Reemplaza `MENU_ID_AQUI` con el `_id` del menú a copiar y ajusta la fecha de destino.

---

### PATCH /menu/:id — Update Menu

**URL:** `{{ base_url }}/menu/MENU_ID_AQUI`
**Headers:** `Content-Type: application/json`, `Authorization: Bearer {{ jwt_token }}`

```json
{
  "ensalada": ["Ensalada surtida", "Apio con palta"],
  "pan": "Pan integral",
  "postre": ["Postre del dia"]
}
```

---

### DELETE /menu/:id

**URL:** `{{ base_url }}/menu/MENU_ID_AQUI`
**Headers:** `Authorization: Bearer {{ jwt_token }}`

> Devuelve `204 No Content`.

---

## Dishes

### POST /dishes — Create Dish

**URL:** `{{ base_url }}/dishes`
**Headers:** `Content-Type: application/json`, `Authorization: Bearer {{ jwt_token }}`

```json
{
  "menuId": "MENU_ID_AQUI",
  "nombre": "Pollo asado con arroz y papas fritas",
  "precio": 5500,
  "imagen_url": "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?q=80&w=400&auto=format&fit=crop",
  "opciones": [],
  "es_hipo": false,
  "stock": 10
}
```

---

### POST /dishes — Create Dish (Hipo)

**URL:** `{{ base_url }}/dishes`
**Headers:** `Content-Type: application/json`, `Authorization: Bearer {{ jwt_token }}`

```json
{
  "menuId": "MENU_ID_AQUI",
  "nombre": "Hipo (elige proteina)",
  "precio": 5500,
  "imagen_url": "https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=400&auto=format&fit=crop",
  "opciones": ["Pollo asado", "Cerdo mongoliano", "Atun"],
  "es_hipo": true,
  "stock": 5
}
```

---

### PATCH /dishes/:id — Update Dish

**URL:** `{{ base_url }}/dishes/DISH_ID_AQUI`
**Headers:** `Content-Type: application/json`, `Authorization: Bearer {{ jwt_token }}`

```json
{
  "nombre": "Pollo asado con fideos",
  "precio": 5500,
  "imagen_url": "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?q=80&w=400&auto=format&fit=crop",
  "es_hipo": false
}
```

---

### PATCH /dishes/:id/stock — Update Stock

**URL:** `{{ base_url }}/dishes/DISH_ID_AQUI/stock`
**Headers:** `Content-Type: application/json`
**Auth:** **No requerida** (endpoint público)

```json
{
  "stock": 8
}
```

---

### DELETE /dishes/:id

**URL:** `{{ base_url }}/dishes/DISH_ID_AQUI`
**Headers:** `Authorization: Bearer {{ jwt_token }}`

> Devuelve `204 No Content`.

---

## Orders

### POST /orders — Create Order

**URL:** `{{ base_url }}/orders`
**Headers:** `Content-Type: application/json`
**Auth:** **No requerida** (endpoint público)

```json
{
  "menuId": "MENU_ID_AQUI",
  "fecha": "2026-04-14",
  "cliente": "Juan Pérez",
  "telefono": "+56912345678",
  "total": 5500,
  "items": [
    {
      "platoId": "DISH_ID_AQUI",
      "nombre": "Pollo asado con arroz y papas fritas",
      "cantidad": 1,
      "precio": 5500,
      "selecciones": {}
    }
  ]
}
```

---

### POST /orders — Create Order (Hipo con selección)

**URL:** `{{ base_url }}/orders`
**Headers:** `Content-Type: application/json`

```json
{
  "menuId": "MENU_ID_AQUI",
  "fecha": "2026-04-14",
  "cliente": "María González",
  "telefono": "+56987654321",
  "total": 5500,
  "items": [
    {
      "platoId": "DISH_HIPO_ID_AQUI",
      "nombre": "Hipo (elige proteina)",
      "cantidad": 1,
      "precio": 5500,
      "selecciones": {
        "proteina": "Pollo asado"
      }
    }
  ]
}
```

---

### GET /orders — Get All Orders

**URL:** `{{ base_url }}/orders`
**Headers:** `Authorization: Bearer {{ jwt_token }}`
**Requiere:** JWT + rol `admin`

> Query param opcional: `?estado=pendiente` | `en_preparacion` | `entregado` | `cancelado`

---

### PATCH /orders/:id/status — Update Status

**URL:** `{{ base_url }}/orders/ORDER_ID_AQUI/status`
**Headers:** `Content-Type: application/json`, `Authorization: Bearer {{ jwt_token }}`
**Requiere:** JWT + rol `admin` o `kitchen`

```json
{
  "estado": "en_preparacion"
}
```

> Valores posibles: `pendiente` | `en_preparacion` | `entregado` | `cancelado`

---

### PATCH /orders/:id/cancel — Cancel Order

**URL:** `{{ base_url }}/orders/ORDER_ID_AQUI/cancel`
**Headers:** `Authorization: Bearer {{ jwt_token }}`
**Requiere:** JWT + rol `admin`

---

### PATCH /orders/:id/admin-validate — Admin Validate

**URL:** `{{ base_url }}/orders/ORDER_ID_AQUI/admin-validate`
**Headers:** `Authorization: Bearer {{ jwt_token }}`
**Requiere:** JWT + rol `admin`

---

### GET /orders/stream/admin (SSE)

**URL:** `{{ base_url }}/orders/stream/admin`
**Headers:** `Authorization: Bearer {{ jwt_token }}`, `Accept: text/event-stream`
**Requiere:** JWT + rol `admin`

> Conexión Server-Sent Events. Al conectar hace replay de pedidos pendientes, luego emite eventos en tiempo real.

---

### GET /orders/stream/kitchen (SSE)

**URL:** `{{ base_url }}/orders/stream/kitchen`
**Headers:** `Authorization: Bearer {{ jwt_token }}`, `Accept: text/event-stream`
**Requiere:** JWT + rol `admin` o `kitchen`

---

## Upload

### POST /upload/image

**URL:** `{{ base_url }}/upload/image`
**Body:** `multipart/form-data` — campo: `file` (imagen jpg/png/webp)
**Headers:** `Authorization: Bearer {{ jwt_token }}`
**Requiere:** JWT

> Sube la imagen a Cloudinary y devuelve la URL pública. Usa esa URL en el campo `imagen_url` al crear o actualizar un plato.

---

## Tabla resumen de seguridad

| Nivel                     | Endpoints                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Público**               | `POST /auth/login`, `GET /menu/today`, `GET /menu/:fecha`, `POST /orders`, `PATCH /dishes/:id/stock`                                                        |
| **JWT**                   | `POST /menu`, `POST /menu/:id/copy`, `PATCH /menu/:id`, `DELETE /menu/:id`, `POST /dishes`, `PATCH /dishes/:id`, `DELETE /dishes/:id`, `POST /upload/image` |
| **JWT + admin**           | `GET /orders`, `GET /orders/stream/admin`, `PATCH /orders/:id/cancel`, `PATCH /orders/:id/admin-validate`                                                   |
| **JWT + admin o kitchen** | `GET /orders/stream/kitchen`, `PATCH /orders/:id/status`                                                                                                    |
