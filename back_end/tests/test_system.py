"""Здоров'я проєкту, контракт api.js і шлях покупця."""
import re
import unittest
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.urls import Resolver404, resolve
from rest_framework.test import APITestCase

from catalog.management.commands.seed_data import CATEGORIES
from catalog.models import Product
from .helpers import DEMO_STOCK, PASSWORD, WEDNESDAY, seed, today_is

FRONT = Path(settings.BASE_DIR).parent / 'front_end'
API_JS = FRONT / 'src' / 'api.js'
CART_JSX = FRONT / 'src' / 'components' / 'Cart.jsx'


class ProjectHealthTests(APITestCase):
    """check, міграції, health і схема OpenAPI."""

    def test_django_system_check_passes(self):
        """manage.py check не повідомляє про проблеми."""
        call_command('check', stdout=StringIO())

    def test_no_pending_migrations(self):
        """Моделі і файли міграцій збігаються."""
        out = StringIO()
        try:
            call_command(
                'makemigrations',
                '--check',
                '--dry-run',
                stdout=out,
                stderr=out,
            )
        except SystemExit:
            self.fail('Є незастосовані зміни моделей:\n' + out.getvalue())

    def test_health_endpoint(self):
        """Живий процес відповідає ім'ям сервісу."""
        self.assertEqual(
            self.client.get('/api/health/').json(),
            {'status': 'ok', 'service': 'cheremshyna'},
        )

    def test_openapi_schema_builds_and_lists_all_contract_routes(self):
        """Схема містить маршрути, які викликає фронтенд."""
        r = self.client.get('/api/schema/')
        self.assertEqual(r.status_code, 200)
        text = r.content.decode()
        paths = (
            '/api/auth/register/',
            '/api/auth/login/',
            '/api/auth/me/',
            '/api/auth/logout/',
            '/api/categories/',
            '/api/products/',
            '/api/orders/',
            '/api/orders/quick/',
            '/api/orders/preview/',
            '/api/promotions/promos/',
        )
        for path in paths:
            self.assertIn(path, text)

    def test_swagger_and_redoc_pages_open(self):
        """Сторінки Swagger і ReDoc віддають HTML."""
        self.assertEqual(self.client.get('/api/docs/').status_code, 200)
        self.assertEqual(self.client.get('/api/redoc/').status_code, 200)


@unittest.skipUnless(API_JS.exists(), 'front_end не знайдено поруч із back_end')
class FrontendBackendContractTests(APITestCase):
    """Рядки з api.js мають збігатися з urls.py."""

    def _frontend_paths(self):
        """Шляхи api.get/post/... і fetchAll, без query string."""
        src = API_JS.read_text(encoding='utf-8')
        found = re.findall(
            r"api\.(?:get|post|patch|put|delete)\(\s*[`'\"]([^`'\"]+)[`'\"]",
            src,
        )
        found += re.findall(r"fetchAll\(\s*['\"]([^'\"]+)['\"]", src)
        cleaned = set()
        for path in found:
            path = re.sub(r'\$\{[^}]+\}', '1', path)
            cleaned.add(path.split('?')[0])
        return cleaned

    def test_every_frontend_endpoint_resolves(self):
        """Кожен шлях api.js існує в Django."""
        paths = self._frontend_paths()
        self.assertGreaterEqual(len(paths), 10, paths)
        for path in sorted(paths):
            with self.subTest(path=path):
                try:
                    resolve('/api' + path)
                except Resolver404:
                    self.fail(
                        f'api.js викликає /api{path}, '
                        'а Django такого маршруту не має',
                    )

    def test_frontend_category_labels_match_seed(self):
        """Підписи категорій у Cart.jsx ті самі, що в seed_data."""
        cart = CART_JSX.read_text(encoding='utf-8')
        for slug, name, _icon, _order in CATEGORIES:
            with self.subTest(slug=slug):
                self.assertIn(f'{slug}:', cart)
                self.assertIn(name, cart)

    def test_vite_origin_is_allowed_by_cors(self):
        """Preflight із localhost:62550 не відхиляється."""
        r = self.client.options(
            '/api/products/',
            HTTP_ORIGIN='http://localhost:62550',
            HTTP_ACCESS_CONTROL_REQUEST_METHOD='GET',
        )
        self.assertIn(r.status_code, (200, 204))
        self.assertIn('Access-Control-Allow-Origin', r)


class EndToEndScenarioTests(APITestCase):
    """Шлях покупця: вітрина, реєстрація, чек, вихід, повторний вхід."""

    def test_full_customer_journey(self):
        """Один клієнт проходить магазин від каталогу до історії."""
        seed()
        client = self.client

        categories = client.get('/api/categories/').json()
        self.assertEqual(len(categories), len(CATEGORIES))
        products = client.get(
            '/api/products/',
            {'category': 'sausages'},
        ).json()['results']
        self.assertTrue(products)

        reg = client.post(
            '/api/auth/register/',
            {
                'name': 'Марія Петренко',
                'email': 'maria@example.com',
                'phone': '+380671234567',
                'password': PASSWORD,
            },
            format='json',
        )
        self.assertEqual(reg.status_code, 201)
        client.credentials(
            HTTP_AUTHORIZATION='Bearer ' + reg.json()['token'],
        )

        me = client.patch(
            '/api/auth/me/',
            {'city': 'Коломия', 'preference_tags': ['Сири']},
            format='json',
        ).json()
        self.assertEqual(me['preferences'], ['Сири'])

        cart = [
            {'product_id': products[0]['id'], 'quantity': 2},
            {'product_id': products[1]['id'], 'quantity': 1},
        ]
        expected = products[0]['price'] * 2 + products[1]['price']
        with today_is(WEDNESDAY):
            preview = client.post(
                '/api/orders/preview/',
                {'items': cart},
                format='json',
            ).json()
            self.assertEqual(preview['total'], expected)
            order = client.post(
                '/api/orders/',
                {
                    'items': cart,
                    'customer_name': 'Марія',
                    'phone': '+380671234567',
                    'delivery_type': 'delivery',
                    'comment': 'Адреса доставки: вул. Шевченка, 14',
                },
                format='json',
            )
        self.assertEqual(order.status_code, 201, order.content)
        # Сума на екрані оформлення збігається з історією.
        self.assertEqual(order.json()['total'], preview['total'])

        history = client.get('/api/orders/').json()['results']
        self.assertEqual([row['id'] for row in history], [order.json()['id']])
        qty = sum(item['qty'] for item in history[0]['items'])
        self.assertEqual(qty, 3)

        left = Product.objects.get(pk=products[0]['id']).stock
        self.assertEqual(left, DEMO_STOCK - 2)

        logout = client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(logout.status_code, 200)
        self.assertEqual(client.get('/api/orders/').status_code, 401)

        client.credentials()
        login = client.post(
            '/api/auth/login/',
            {'email': 'maria@example.com', 'password': PASSWORD},
            format='json',
        ).json()
        client.credentials(HTTP_AUTHORIZATION='Bearer ' + login['access'])
        self.assertEqual(client.get('/api/orders/').json()['count'], 1)

    def test_two_customers_compete_for_last_item(self):
        """Останню одиницю забирає лише один. Залишок не від'ємний."""
        seed()
        product = Product.objects.get(name='Ковбаса Черемшина')
        Product.objects.filter(pk=product.pk).update(stock=1)
        results = []
        for email in ('a@example.com', 'b@example.com'):
            self.client.credentials()
            self.client.post(
                '/api/auth/register/',
                {'name': 'X', 'email': email, 'password': PASSWORD},
                format='json',
            )
            login = self.client.post(
                '/api/auth/login/',
                {'email': email, 'password': PASSWORD},
                format='json',
            ).json()
            self.client.credentials(
                HTTP_AUTHORIZATION='Bearer ' + login['access'],
            )
            with today_is(WEDNESDAY):
                r = self.client.post(
                    '/api/orders/',
                    {
                        'items': [{
                            'product_id': product.id,
                            'quantity': 1,
                        }],
                        'customer_name': 'X',
                        'phone': '+380501234567',
                    },
                    format='json',
                )
            results.append(r.status_code)
        self.assertEqual(sorted(results), [201, 400])
        product.refresh_from_db()
        self.assertEqual(product.stock, 0)
