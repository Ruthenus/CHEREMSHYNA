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
| POST      | /auth/refresh/  | [ПЕРЕВІРКА] `{ refresh }` → `{ access }`; без Bearer. `api.js` викликає сам при 401 |

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
```

## Стан інтеграції фронтенду

Шар `src/api.js` ходить на ці маршрути. AuthContext більше не
зберігає паролі в localStorage: лишаються ключ сесії `cheremshyna_session`
(профіль) і JWT `cheremshyna_token` / `cheremshyna_refresh`.
Каталог, швидке замовлення, вхід, реєстрація, профіль і історія замовлень
йдуть на Django. Якщо каталог недоступний, картки товарів показують локальний
приклад і текст помилки.

Документація API: `GET /api/docs/` (Swagger), `GET /api/redoc/`, `GET /api/schema/`.

### Уточнення контракту для backend-команди

- `GET/PATCH /auth/me/` повертає безпосередньо об’єкт user.
- `preferences` у відповіді — масив рядків; `preference_tags` у PATCH — масив рядків.
- `birthday` — YYYY-MM-DD або null.
- `GET /orders/` повертає масив або DRF results; кожне замовлення:
  `{ id, date, status, total, items: [{ name, qty, price }] }`.
- `POST /orders/` повертає створене замовлення з id. Ціни та підсумок обчислює сервер.
- Адреса доставки передається у `comment` з префіксом «Адреса доставки:»,
  поки узгоджений контракт не містить окремого поля адреси.
- Запропоноване тіло `POST /orders/quick/`: `{ name, phone, order }`.
  Формат quick-заявки не був визначений у попередньому контракті — потребує узгодження.
  Успіх: JSON або 204; неуспіх: 4xx/5xx з detail або помилками полів.
- `GET /products/` підтримує `category` та `page`, відповідь DRF містить next.
- Каталог використовує slug категорії як id вкладки; товари містять числову або
  десяткову строкову price та is_available. Кількість — ціла кількість одиниць
  продажу (для ₴/кг одна одиниця дорівнює одному кілограму).
- Умови акцій показані інформаційно; знижки має підтверджувати й обчислювати сервер.

## Перевірка

```bash
npm run lint
npm run build
```

Локальний сценарій реєстрації → профіль → каталог → замовлення працює через API
(`/api`, проксі Vite на Django). Перед перевіркою: міграції та `seed_data` (див. README).
