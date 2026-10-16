"""Каталог, пошук, сортування і акції."""
from decimal import Decimal

from rest_framework.test import APITestCase

from catalog.management.commands.seed_data import CATEGORIES, PRODUCTS, PROMOS
from catalog.models import Category, Product
from promotions.models import Promotion
from .helpers import DEMO_STOCK, seed


class SeedTests(APITestCase):
    """Команда seed_data: склад демо-даних і повторний запуск."""

    def test_seed_creates_expected_data(self):
        """Стільки категорій, товарів і акцій, скільки в команді."""
        seed()
        self.assertEqual(Category.objects.count(), len(CATEGORIES))
        self.assertEqual(Product.objects.count(), len(PRODUCTS))
        self.assertEqual(Promotion.objects.count(), len(PROMOS))

    def test_seed_is_idempotent(self):
        """Другий запуск не дублює рядки."""
        seed()
        seed()
        self.assertEqual(Product.objects.count(), len(PRODUCTS))
        self.assertEqual(Category.objects.count(), len(CATEGORIES))
        self.assertEqual(Promotion.objects.count(), len(PROMOS))

    def test_seed_slugs_are_ascii_and_unique(self):
        """Slug лише латиницею: модель не приймає кирилицю."""
        seed()
        slugs = list(Product.objects.values_list('slug', flat=True))
        self.assertEqual(len(slugs), len(set(slugs)))
        self.assertTrue(all(s.isascii() and s for s in slugs))

    def test_seed_restores_demo_stock(self):
        """Повторний seed повертає демо-залишок DEMO_STOCK."""
        seed()
        Product.objects.update(stock=0)
        seed()
        stocks = [p.stock for p in Product.objects.all()]
        self.assertTrue(all(stock == DEMO_STOCK for stock in stocks))


class CatalogApiTests(APITestCase):
    """GET /api/categories/ і /api/products/. Каталог публічний."""

    @classmethod
    def setUpTestData(cls):
        seed()

    def test_categories_plain_list_with_icon(self):
        """Список без пагінації, порядок за полем order."""
        r = self.client.get('/api/categories/')
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.data, list)
        self.assertEqual(len(r.data), len(CATEGORIES))
        fields = {'id', 'slug', 'name', 'icon', 'order'}
        self.assertTrue(all(fields <= set(cat) for cat in r.data))
        slugs = [cat['slug'] for cat in r.data]
        self.assertEqual(slugs[:2], ['sausages', 'smoked'])

    def test_inactive_category_hidden(self):
        """is_active=False прибирає категорію з вітрини."""
        Category.objects.filter(slug='drinks').update(is_active=False)
        slugs = [c['slug'] for c in self.client.get('/api/categories/').data]
        self.assertNotIn('drinks', slugs)

    def test_products_list_shape_matches_frontend_expectations(self):
        """Ціна — число, category — slug, unit починається з «₴/»."""
        r = self.client.get('/api/products/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], len(PRODUCTS))
        # JSON, а не Decimal з r.data: так ціну бачить фронтенд.
        item = r.json()['results'][0]
        for key in (
            'id', 'name', 'description', 'price',
            'unit', 'image', 'category',
        ):
            self.assertIn(key, item)
        self.assertIsInstance(item['price'], (int, float))
        self.assertIsInstance(item['category'], str)
        self.assertTrue(item['unit'].startswith('₴/'))

    def test_filter_by_category_slug(self):
        """Фільтр category приймає slug, не id."""
        r = self.client.get('/api/products/', {'category': 'cheeses'})
        expected = sum(1 for row in PRODUCTS if row[0] == 'cheeses')
        self.assertEqual(r.data['count'], expected)
        self.assertTrue(
            all(row['category'] == 'cheeses' for row in r.data['results']),
        )

    def test_unknown_category_returns_empty(self):
        """Невідомий slug дає порожню сторінку, не 404."""
        r = self.client.get('/api/products/', {'category': 'nope'})
        self.assertEqual(r.data['count'], 0)

    def test_search_in_name_and_description(self):
        """Пошук б'є і в назву, і в опис."""
        by_name = self.client.get('/api/products/', {'search': 'Гауда'})
        self.assertEqual(by_name.data['count'], 1)
        by_desc = self.client.get(
            '/api/products/',
            {'search': 'дубових дровах'},
        )
        self.assertEqual(by_desc.data['count'], 1)

    def test_search_ignores_case_for_cyrillic(self):
        """Регістр кирилиці знімає Python: SQLite LIKE цього не вміє."""
        for query in ('гауда', 'ГАУДА', 'гАуДа'):
            with self.subTest(query=query):
                r = self.client.get('/api/products/', {'search': query})
                self.assertEqual(r.data['count'], 1)

    def test_blank_search_returns_everything(self):
        """Порожній пошук не фільтрує список."""
        r = self.client.get('/api/products/', {'search': '  '})
        self.assertEqual(r.data['count'], len(PRODUCTS))

    def test_unit_is_always_price_label(self):
        """Адмінка: «кг» стає «₴/кг», готове «₴/л» не подвоюється."""
        cat = Category.objects.get(slug='drinks')
        plain = Product.objects.create(
            category=cat, external_id='a1', name='Адмін-1',
            slug='admin-1', price=10, stock=5,
        )
        labeled = Product.objects.create(
            category=cat, external_id='a2', name='Адмін-2',
            slug='admin-2', price=10, stock=5, unit='₴/л',
        )
        plain_unit = self.client.get(f'/api/products/{plain.pk}/').data
        liter_unit = self.client.get(f'/api/products/{labeled.pk}/').data
        self.assertEqual(plain_unit['unit'], '₴/кг')
        self.assertEqual(liter_unit['unit'], '₴/л')
        self.assertEqual(labeled.price_display, '10 ₴/л')
        self.assertEqual(plain.price_display, '10 ₴/кг')

    def test_ordering_by_price(self):
        """ordering=price і -price справді сортують."""
        asc = self.client.get('/api/products/', {'ordering': 'price'})
        desc = self.client.get('/api/products/', {'ordering': '-price'})
        asc_prices = [row['price'] for row in asc.data['results']]
        desc_prices = [row['price'] for row in desc.data['results']]
        self.assertEqual(asc_prices, sorted(asc_prices))
        self.assertEqual(desc_prices, sorted(desc_prices, reverse=True))

    def test_unavailable_product_hidden_everywhere(self):
        """is_available=False ховає товар і зі списку, і з деталі."""
        product = Product.objects.get(name='Сир Гауда')
        Product.objects.filter(pk=product.pk).update(is_available=False)
        names = [
            row['name']
            for row in self.client.get('/api/products/').data['results']
        ]
        self.assertNotIn('Сир Гауда', names)
        missing = self.client.get(f'/api/products/{product.pk}/')
        self.assertEqual(missing.status_code, 404)

    def test_product_detail(self):
        """Деталь віддає ціну з сіду, не з кошика браузера."""
        product = Product.objects.get(name='Ковбаса Черемшина')
        r = self.client.get(f'/api/products/{product.pk}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Decimal(str(r.data['price'])), Decimal('189'))

    def test_seeded_non_kg_unit_is_not_rewritten(self):
        """«₴/банка» і «₴/л» у сіді лишаються як є."""
        lard = Product.objects.get(name='Смалець Домашній')
        juice = Product.objects.get(name='Сік Яблучний')
        lard_unit = self.client.get(f'/api/products/{lard.pk}/').data['unit']
        juice_unit = self.client.get(f'/api/products/{juice.pk}/').data['unit']
        self.assertEqual(lard_unit, '₴/банка')
        self.assertEqual(juice_unit, '₴/л')

    def test_product_detail_404(self):
        """Невідомий id товару — 404."""
        self.assertEqual(
            self.client.get('/api/products/999999/').status_code,
            404,
        )

    def test_image_is_relative_media_url(self):
        """Картинка — відносний /media/..., не абсолютний хост."""
        product = Product.objects.first()
        Product.objects.filter(pk=product.pk).update(image='products/x.png')
        data = self.client.get(f'/api/products/{product.pk}/').data
        self.assertEqual(data['image'], '/media/products/x.png')

    def test_featured_product_comes_first(self):
        """is_featured піднімає «Ковбасу Черемшина» на початок."""
        first = self.client.get('/api/products/').data['results'][0]
        self.assertEqual(first['name'], 'Ковбаса Черемшина')

    def test_catalog_is_public(self):
        """Без токена список товарів відкритий."""
        self.client.credentials()
        self.assertEqual(self.client.get('/api/products/').status_code, 200)


class PromotionsApiTests(APITestCase):
    """GET /api/promotions/promos/. Запис іззовні заборонений."""

    @classmethod
    def setUpTestData(cls):
        seed()

    def test_list_active_promos(self):
        """Активні акції: заголовок, опис, бейдж і тип."""
        r = self.client.get('/api/promotions/promos/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['count'], len(PROMOS))
        fields = {'title', 'description', 'badge', 'type'}
        self.assertTrue(all(fields <= set(row) for row in r.data['results']))

    def test_inactive_promo_hidden(self):
        """Вимкнена акція не входить у count."""
        Promotion.objects.filter(slug='free-coffee').update(is_active=False)
        r = self.client.get('/api/promotions/promos/')
        self.assertEqual(r.data['count'], len(PROMOS) - 1)

    def test_promos_are_read_only(self):
        """POST на список акцій — 405, не створення запису."""
        r = self.client.post(
            '/api/promotions/promos/',
            {'title': 'x'},
            format='json',
        )
        self.assertEqual(r.status_code, 405)
