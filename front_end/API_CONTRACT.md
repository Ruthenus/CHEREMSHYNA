# API contract (React ↔ Django)

Base: `/api`

Шляхи в таблиці — відносно base. Повний URL з браузера:  
`http://localhost:62550/api/...` → Vite proxy → `http://127.0.0.1:8000/api/...`

|                 |                        |
| --------------- | ---------------------- |
| Фронтенд (Vite) | http://localhost:62550 |
| Django          | http://127.0.0.1:8000  |
| Proxy           | `/api`, `/media` → Django |

## Auth

Захищені ендпоінти: заголовок  
`Authorization: Bearer <access>`  

(`access` з відповіді login/register; також приймається поле `token` — alias для фронту).

| Method    | Path            | Notes                                                                 |
| --------- | --------------- | --------------------------------------------------------------------- |
| GET       | /health/        | `{ "status": "ok", "service": "cheremshyna" }`                        |
| POST      | /auth/register/ | `{ name, email, phone, password }` → `{ user, access, refresh, token }` |
| POST      | /auth/login/    | `{ email, password }` → `{ user, access, refresh, token }`            |
| GET/PATCH | /auth/me/       | профіль (auth); PATCH: `name`, `phone`, `city`, `birthday`, `preference_tags` |
| POST      | /auth/logout/   | auth; `{ "detail": "ok" }`                                            |

`user` містить зокрема: `id`, `email`, `name`, `phone`, `city`, `birthday`, `photo`, `preferences`, `has_birthday_discount`.

## Каталог

| Method | Path                              | Notes                                      |
| ------ | --------------------------------- | ------------------------------------------ |
| GET    | /categories/                      | `id`, `slug`, `name`, `icon`, `order`      |
| GET    | /products/?category=&search=&ordering= | `category` = slug категорії            |
| GET    | /products/:id/                    |                                            |

Поля товару для UI: `id`, `name`, `description`, `price`, `unit`, `image`, `category` (slug).  
Додатково з бекенду: `slug`, `is_available`, `is_featured`.

Списки можуть повертатися як масив або `{ "results": [...] }` (пагінація DRF, `PAGE_SIZE=48`). Фронт нормалізує через `unwrapList`.

## Замовлення

| Method | Path              | Notes                          |
| ------ | ----------------- | ------------------------------ |
| GET    | /orders/          | історія (auth)                 |
| GET    | /orders/:id/      | деталь (auth, лише свої)       |
| POST   | /orders/          | auth; body нижче               |
| POST   | /orders/quick/    | AllowAny                       |

### POST /orders/

```json
{
  "items": [{ "product_id": 1, "quantity": 2 }],
  "customer_name": "Іван",
  "phone": "+380501234567",
  "delivery_type": "pickup",
  "comment": ""
}