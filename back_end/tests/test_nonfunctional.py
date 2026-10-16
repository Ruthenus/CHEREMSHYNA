"""Безпека, кількість SQL-запитів, пагінація, битий ввід."""
from django.conf import settings
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from catalog.models import Category, Product
from orders.models import Order
from .helpers import WEDNESDAY, login_client, make_user, seed, today_is


class SecurityTests(APITestCase):
    """Секрети, анонім, ін'єкції, CORS, однакова відповідь логіна."""

    def test_secret_key_is_not_django_insecure_default(self):
        """Ключ із середовища, не шаблон django-insecure-."""
        self.assertFalse(settings.SECRET_KEY.startswith('django-insecure-'))
        self.assertGreaterEqual(len(settings.SECRET_KEY), 50)

    def test_password_is_hashed(self):
        """У базі лежить хеш, не пароль із фікстури."""
        user = make_user()
        self.assertNotEqual(user.password, 'Kx9#mQz7')
        self.assertTrue(user.password.startswith((
            'pbkdf2_', 'argon2', 'bcrypt', 'scrypt',
        )))

    def test_protected_endpoints_reject_anonymous(self):
        """Профіль, вихід і замовлення без сесії — 401."""
        protected = [
            ('get', '/api/auth/me/'),
            ('patch', '/api/auth/me/'),
            ('post', '/api/auth/logout/'),
            ('get', '/api/orders/'),
            ('post', '/api/orders/'),
            ('post', '/api/orders/preview/'),
            ('get', '/api/orders/1/'),
        ]
        for method, url in protected:
            with self.subTest(url=url, method=method):
                call = getattr(self.client, method)
                r = call(url, {}, format='json')
                self.assertEqual(r.status_code, 401)

    def test_token_of_deleted_user_rejected(self):
        """Токен видаленого користувача більше не дійсний."""
        user = make_user()
        login_client(self.client)
        user.delete()
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_sql_injection_strings_are_harmless(self):
        """Рядки пошуку не виконуються як SQL."""
        seed()
        payloads = (
            "' OR 1=1 --",
            "'; DROP TABLE catalog_product; --",
            '%',
            '_',
        )
        for payload in payloads:
            with self.subTest(payload=payload):
                r = self.client.get('/api/products/', {'search': payload})
                self.assertEqual(r.status_code, 200)
        self.assertTrue(Product.objects.exists())

    def test_html_in_quick_order_is_stored_as_text_and_returned_as_json(self):
        """HTML у заявці — текст у JSON, не сторінка."""
        payload = '<script>alert(1)</script>'
        r = self.client.post(
            '/api/orders/quick/',
            {'name': 'x', 'phone': '+380501234567', 'order': payload},
            format='json',
        )
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r['Content-Type'].startswith('application/json'))
        self.assertEqual(Order.objects.get().comment, payload)

    def test_cors_allows_frontend_origin(self):
        """Vite на :62550 або * у режимі DEBUG."""
        r = self.client.get(
            '/api/health/',
            HTTP_ORIGIN='http://localhost:62550',
        )
        origin = r['Access-Control-Allow-Origin']
        self.assertIn(origin, ('*', 'http://localhost:62550'))

    def test_malformed_json_gives_400_not_500(self):
        """Битий JSON — 400, не трасування сервера."""
        r = self.client.post(
            '/api/auth/login/',
            data='{broken',
            content_type='application/json',
        )
        self.assertEqual(r.status_code, 400)

    def test_login_is_not_user_enumerable(self):
        """Невірний пароль і невідомий email дають той самий JSON."""
        make_user()
        wrong_pw = self.client.post(
            '/api/auth/login/',
            {'email': 'ivan@example.com', 'password': 'x'},
            format='json',
        )
        no_user = self.client.post(
            '/api/auth/login/',
            {'email': 'nobody@example.com', 'password': 'x'},
            format='json',
        )
        self.assertEqual(wrong_pw.json(), no_user.json())


class RobustnessTests(APITestCase):
    """Юнікод, довгі поля, чужі типи, невідомі маршрути."""

    def setUp(self):
        seed()
        make_user()
        login_client(self.client)

    def test_unicode_and_emoji_in_fields(self):
        """Ім'я з ґ і емодзі зберігається як є."""
        r = self.client.patch(
            '/api/auth/me/',
            {'name': 'Оксана 🧀 Ґудзь', 'city': 'Івано-Франківськ'},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['name'], 'Оксана 🧀 Ґудзь')

    def test_overlong_values_are_rejected_not_truncated(self):
        """Ім'я довше за max_length — 400, не обрізання."""
        r = self.client.patch(
            '/api/auth/me/',
            {'name': 'а' * 151},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_wrong_types_in_order_payload(self):
        """Рядок, числа і null замість items — 400."""
        payloads = (
            {'items': 'abc'},
            {'items': [1, 2]},
            {'items': [{'product_id': 'x', 'quantity': 1}]},
            {'items': [{'product_id': 1, 'quantity': 1.5}]},
            None,
        )
        for payload in payloads:
            with self.subTest(payload=str(payload)):
                r = self.client.post('/api/orders/', payload, format='json')
                self.assertEqual(r.status_code, 400)

    def test_preview_wrong_types(self):
        """Preview теж не ковтає product_id = null."""
        r = self.client.post(
            '/api/orders/preview/',
            {'items': [{'product_id': None, 'quantity': 1}]},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_unknown_routes_return_404(self):
        """Неіснуючий префікс API — 404."""
        self.assertEqual(self.client.get('/api/nope/').status_code, 404)

    def test_orders_quick_not_swallowed_by_detail_route(self):
        """/orders/quick/ не потрапляє в /orders/<id>/."""
        r = self.client.get('/api/orders/quick/')
        self.assertEqual(r.status_code, 405)


class PerformanceTests(APITestCase):
    """Число SQL не росте разом із кількістю рядків."""

    @classmethod
    def setUpTestData(cls):
        seed()

    def test_product_list_has_constant_query_count(self):
        """Список товарів не має N+1 після select_related."""
        with CaptureQueriesContext(connection) as small:
            self.client.get('/api/products/')
        cat = Category.objects.get(slug='sausages')
        Product.objects.bulk_create([
            Product(
                category=cat,
                external_id=f'perf-{i}',
                name=f'P{i}',
                slug=f'perf-{i}',
                price=10,
                stock=5,
            )
            for i in range(40)
        ])
        with CaptureQueriesContext(connection) as large:
            self.client.get('/api/products/')
        self.assertLessEqual(len(small), 4)
        self.assertEqual(len(small), len(large), 'N+1 у списку товарів')

    def test_order_history_has_no_n_plus_one(self):
        """Історія з однією і з шістьма заявками — ті самі запити."""
        make_user()
        login_client(self.client)
        product = Product.objects.get(name='Ковбаса Черемшина')

        def place():
            with today_is(WEDNESDAY):
                self.client.post(
                    '/api/orders/',
                    {
                        'items': [{
                            'product_id': product.id,
                            'quantity': 1,
                        }],
                        'customer_name': 'x',
                        'phone': '+380501234567',
                    },
                    format='json',
                )

        place()
        with CaptureQueriesContext(connection) as one:
            self.client.get('/api/orders/')
        for _ in range(5):
            place()
        with CaptureQueriesContext(connection) as six:
            self.client.get('/api/orders/')
        self.assertEqual(len(one), len(six), 'N+1 в історії замовлень')

    def test_pagination_covers_every_product_exactly_once(self):
        """Сторінки по 48 не гублять і не дублюють id.

        Фронтенд збирає каталог, ідучи за полем next.
        """
        cat = Category.objects.get(slug='sausages')
        Product.objects.bulk_create([
            Product(
                category=cat,
                external_id=f'bulk-{i}',
                name=f'B{i:03}',
                slug=f'bulk-{i}',
                price=10,
                stock=5,
            )
            for i in range(100)
        ])
        total = Product.objects.count()
        seen, url, pages = [], '/api/products/', 0
        while url:
            data = self.client.get(url).json()
            seen += [row['id'] for row in data['results']]
            pages += 1
            nxt = data['next']
            url = nxt[nxt.index('/api/'):] if nxt else None
            self.assertLess(pages, 20)
        self.assertEqual(len(seen), total)
        self.assertEqual(len(set(seen)), total)
        self.assertEqual(pages, -(-total // 48))

