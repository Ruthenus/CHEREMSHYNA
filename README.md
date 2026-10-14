# Гастроном «Черемшина» — вебдодаток

## Опис проєкту

«Черемшина» — онлайн-магазин з акцентом на м'ясні вироби: каталог, кошик, реєстрація, замовлення й особистий кабінет. Бекенд віддає JSON, фронтенд малює сайт. Контракт API: [front_end/API_CONTRACT.md](front_end/API_CONTRACT.md).

Курсовий командний проєкт IT STEP Academy з вебпрограмування.

---

## Команда розробки

- **Качуровський Руслан Русланович** — Project Manager / Team Lead, Full Stack Developer, QA/QC

- **Залуга Максим Петрович** — Front-end Developer (Deployment Responsibility)

- **Скрильников Микита Сергійович** — Back-end Developer, Database Designer


---

## Технологічний стек

### Back end

- Python 3.12+
- Django 6.1.1
- Django REST Framework 3.18.1
- SimpleJWT (access, refresh, відкликання сесії через `auth_revision`)
- drf-spectacular 0.30.0 (Swagger, ReDoc, OpenAPI)
- django-filter 26.2: фільтр категорії й пошук у каталозі
- django-cors-headers 4.9.0
- Pillow 12.3.0: ImageField товарів
- python-dotenv: ключ і прапорці з `.env`
- SQLite локально

### Front end

- React 19.3.0, react-dom
- Vite 8.3, порт dev-сервера 62550, проксі `/api` і `/media` на Django
- React Router DOM 7.18
- Axios 1.20: єдиний клієнт, Bearer, оновлення токена на 401, токени в localStorage
- Bootstrap 5.3, styled-components 6.5
- Vitest 5, jsdom, @testing-library/react
- ESLint 10 з плагінами react-hooks і react-refresh

### Архітектура

- Розділення `back_end` / `front_end`
- Доменні додатки Django: `catalog`, `orders`, `users`, `promotions`, `config`
- Контракт API як єдина межа між шарами
- JWT у браузері, профіль і замовлення з сервера

### Тестування

- Django `manage.py test` (тека `back_end/tests`)
- Vitest + Testing Library

### Розгортання

Локально сайт і API — два процеси, як у розділі вище.

Прод збирається з гілки `ruslan/team-workflow`: Gunicorn за nginx, той самий домен для `/` і `/api`. У збірці фронтенду `VITE_API_BASE_URL` лишають порожнім. Секрети й `ALLOWED_HOSTS` беруться з оточення сервера, не з `.env.example`.

## Структура проєкту

```
CHEREMSHYNA/
├── architecture/
├── back_end/
│   ├── catalog/                # категорії, товари, seed_data
│   ├── config/                 # settings, urls, .env
│   ├── orders/                 # замовлення, швидка заявка, preview
│   ├── promotions/             # акції
│   ├── users/                  # реєстрація, логін, профіль
│   ├── tests/
│   ├── .env.example
│   ├── manage.py
│   └── requirements.txt
├── front_end/
│   ├── src/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   ├── components/         # каталог, кошик, замовлення, кабінет
│   │   └── context/            # AuthContext
│   ├── API_CONTRACT.md
│   └── package.json
├── LICENSE.txt
└── README.md
```

## Основні функції

- Пошук і фільтр товарів за категорією
- Кошик у браузері, стеля кількості 99 і не вище залишку
- Реєстрація та вхід за email, JWT з оновленням access
- Оформлення замовлення і швидка заявка без повного кошика
- Попередня сума зі знижкою до підтвердження
- Знижка на день народження (−15%) і «сирна п’ятниця» (−10% на сири)
- Особистий кабінет: замовлення, профіль, акції
- Адмінка Django і Swagger


## Встановлення та запуск

Сайт і API — два процеси. Корінь http://127.0.0.1:8000/ навмисно відповідає 404: там лише API.

### Вимоги

- Python 3.12+
- Node.js 20.19+ або 22.12+ (Vite 8 / ESLint 10)
- Два термінали
- Visual Studio або PyCharm + WebStorm

### Бекенд

```bash
cd back_end
python -m venv .venv
```

Windows, PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
python manage.py runserver
```

macOS і Linux: `source .venv/bin/activate`, далі ті самі команди. Копія ключа: `cp .env.example .env`.

`.env` у `.gitignore`, після `git clone` його не буде. 
Без `DJANGO_SECRET_KEY` Django зупиниться з текстом «Не знайдено DJANGO_SECRET_KEY». Залежності ставте з `requirements.txt`: там є `django-filter`, без нього проєкт не стартує.

- Перевірка: http://127.0.0.1:8000/api/health/
- Swagger: http://127.0.0.1:8000/api/docs/
- ReDoc: http://127.0.0.1:8000/api/redoc/
- Схема: http://127.0.0.1:8000/api/schema/
- Адмінка: http://127.0.0.1:8000/admin/ (спочатку `createsuperuser`, логін — email)

Локальний ключ із `.env.example` лише для розробки. На публічний сервер його не копіюйте.

### Фронтенд

У другому терміналі, поки `runserver` працює:

```bash
cd front_end
npm install
npm run dev
```

Сайт: http://localhost:62550/. Запити `/api` і `/media` Vite пересилає на Django.

```bash
npm run lint
npm run build
```

Або через Visual Studio: один термінал для Django, другий для `npm run dev`.

## Запуск тестів

Бекенд (функціональні, нефункціональні, системні), з теки `back_end`:

```bash
python manage.py test tests -v 2
```

Фронтенд (Vitest). Залежності тестів уже в `package.json`:

```bash
cd front_end
npm install
npm test
```

Звіт: [TEST_REPORT.md](TEST_REPORT.md).

## Робота з даними

Окремих міграцій після клону створювати не треба, якщо моделі не змінювались:

```bash
python manage.py migrate
python manage.py seed_data
```

Повторний `seed_data` повертає демо-ціни, описи й залишок 50, бо ці поля стоять у `defaults`. Правки з адмінки переживуть сід лише якщо прибрати їх із `defaults`.

Нова міграція, якщо модель змінено:

```bash
python manage.py makemigrations
python manage.py migrate
```

## Патерни та принципи

- Розділення читання каталогу і запису замовлення
- Ціна й знижка рахуються на сервері, не в кошику браузера
- Знімок ціни в позиції замовлення (`product_price`), подальша зміна прайсу старе замовлення не переписує
- Сесія: access JWT, refresh і `auth_revision` після виходу
- Ідемпотентний сід через `update_or_create` за `external_id`

## Ліцензія

Apache License 2.0. Текст: [LICENSE.txt](LICENSE.txt).

Курсовий проєкт IT STEP Academy, 2026.

## Контакти

- Репозиторій: https://github.com/Ruthenus/CHEREMSHYNA
- Замовник: Чернігівська філія IT STEP Academy
