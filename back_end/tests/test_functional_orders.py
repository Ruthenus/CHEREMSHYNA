"""Замовлення: ціна на сервері, знижки, залишок, швидка заявка."""
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from catalog.models import Product
from orders.models import Order
from .helpers import (
    DEMO_STOCK,
    FRIDAY,
    WEDNESDAY,
    login_client,
    make_user,
    seed,
    today_is,
)

PHONE = '+380501234567'


def body(*pairs, **extra):
    """Тіло POST /api/orders/: лише id і кількість, без ціни."""
    data = {
        'items': [
            {'product_id': pid, 'quantity': qty}
            for pid, qty in pairs
        ],
        'customer_name': 'Іван',
        'phone': PHONE,
        'delivery_type': 'pickup',
        'comment': '',
    }
    data.update(extra)
    return data


class OrderBase(APITestCase):
    """Сід і вхід покупця. Ковбаса 189 грн, сир 280 грн."""

    @classmethod
    def setUpTestData(cls):
        seed()
        cls.sausage = Product.objects.get(name='Ковбаса Черемшина')
        cls.cheese = Product.objects.get(name='Сир Гауда')

    def setUp(self):
        self.user = make_user()
        login_client(self.client)


class CreateOrderTests(OrderBase):
    """POST /api/orders/. Суму і залишок рахує сервер."""

    def test_create_order_computes_total_on_server(self):
        """Дві ковбаси: 378 грн, статус «Нове», знімок позиції."""
        with today_is(WEDNESDAY):
            r = self.client.post(
                '/api/orders/',
                body((self.sausage.id, 2)),
                format='json',
            )
        self.assertEqual(r.status_code, 201, r.content)
        data = r.json()
        self.assertEqual(data['total'], 378)
        self.assertEqual(
            data['items'],
            [{'name': 'Ковбаса Черемшина', 'qty': 2, 'price': 189}],
        )
        self.assertEqual(data['status'], 'Нове')
        self.assertIn('id', data)

    def test_client_supplied_price_is_ignored(self):
        """Ціна і total у тілі запиту не впливають на чек."""
        payload = body((self.sausage.id, 1))
        payload['items'][0]['price'] = 1
        payload['total'] = 1
        with today_is(WEDNESDAY):
            r = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(r.json()['total'], 189)

    def test_stock_is_decremented(self):
        """Три штуки списуються з демо-залишку."""
        with today_is(WEDNESDAY):
            self.client.post(
                '/api/orders/',
                body((self.sausage.id, 3)),
                format='json',
            )
        self.sausage.refresh_from_db()
        self.assertEqual(self.sausage.stock, DEMO_STOCK - 3)

    def test_insufficient_stock_rejected_and_nothing_written(self):
        """Не вистачає залишку: 400, замовлення не створене."""
        Product.objects.filter(pk=self.sausage.pk).update(stock=1)
        r = self.client.post(
            '/api/orders/',
            body((self.sausage.id, 2)),
            format='json',
        )
        self.assertEqual(r.status_code, 400)
        # У тексті помилки назва товару, не його id.
        self.assertIn('Ковбаса Черемшина', r.json()['items'])
        self.assertEqual(Order.objects.count(), 0)
        self.sausage.refresh_from_db()
        self.assertEqual(self.sausage.stock, 1)

    def test_product_with_zero_stock_cannot_be_ordered(self):
        """Нульовий залишок не продається."""
        Product.objects.filter(pk=self.sausage.pk).update(stock=0)
        r = self.client.post(
            '/api/orders/',
            body((self.sausage.id, 1)),
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_same_product_twice_is_merged(self):
        """Два рядки одного id зливаються в одну позицію."""
        with today_is(WEDNESDAY):
            r = self.client.post(
                '/api/orders/',
                body((self.sausage.id, 1), (self.sausage.id, 2)),
                format='json',
            )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['items'][0]['qty'], 3)

    def test_merged_quantity_over_99_rejected(self):
        """Після злиття кількість не може перевищити 99."""
        r = self.client.post(
            '/api/orders/',
            body((self.sausage.id, 60), (self.sausage.id, 60)),
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_quantity_boundaries(self):
        """0, від'ємне і 100 не проходять серіалізатор."""
        for qty in (0, -1, 100):
            with self.subTest(qty=qty):
                r = self.client.post(
                    '/api/orders/',
                    body((self.sausage.id, qty)),
                    format='json',
                )
                self.assertEqual(r.status_code, 400)

    def test_empty_items_rejected(self):
        """Порожній кошик не створює замовлення."""
        r = self.client.post('/api/orders/', body(), format='json')
        self.assertEqual(r.status_code, 400)

    def test_unknown_product_rejected(self):
        """Невідомий product_id — 400."""
        r = self.client.post(
            '/api/orders/',
            body((999999, 1)),
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_unavailable_product_rejected(self):
        """Знятий з вітрини товар не можна замовити."""
        Product.objects.filter(pk=self.sausage.pk).update(is_available=False)
        r = self.client.post(
            '/api/orders/',
            body((self.sausage.id, 1)),
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_invalid_phone_rejected(self):
        """Телефон: не менше 10 і не більше 15 цифр."""
        for phone in ('123', 'abc', '1' * 16):
            with self.subTest(phone=phone):
                r = self.client.post(
                    '/api/orders/',
                    body((self.sausage.id, 1), phone=phone),
                    format='json',
                )
                self.assertEqual(r.status_code, 400)

    def test_invalid_delivery_type_rejected(self):
        """Лише pickup і delivery."""
        r = self.client.post(
            '/api/orders/',
            body((self.sausage.id, 1), delivery_type='drone'),
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_requires_auth(self):
        """Без сесії замовлення не створюється."""
        self.client.credentials()
        r = self.client.post(
            '/api/orders/',
            body((self.sausage.id, 1)),
            format='json',
        )
        self.assertEqual(r.status_code, 401)

    def test_delivery_address_extracted_from_comment(self):
        """Префікс «Адреса доставки:» стає полем address."""
        comment = 'Адреса доставки: вул. Тестова, 1\nБез дзвінка'
        with today_is(WEDNESDAY):
            r = self.client.post(
                '/api/orders/',
                body(
                    (self.sausage.id, 1),
                    delivery_type='delivery',
                    comment=comment,
                ),
                format='json',
            )
        self.assertEqual(r.status_code, 201)
        order = Order.objects.get(pk=r.json()['id'])
        self.assertEqual(order.address, 'вул. Тестова, 1')
        self.assertEqual(order.comment, comment)
        self.assertEqual(order.user, self.user)

    def test_pickup_has_no_address(self):
        """Самовивіз не витягує адресу навіть із коментаря."""
        with today_is(WEDNESDAY):
            r = self.client.post(
                '/api/orders/',
                body(
                    (self.sausage.id, 1),
                    comment='Адреса доставки: x',
                ),
                format='json',
            )
        order = Order.objects.get(pk=r.json()['id'])
        self.assertEqual(order.address, '')


class DiscountTests(OrderBase):
    """POST /api/orders/preview/. Знижки не складаються."""

    def _preview(self, *pairs):
        """Попередній підсумок без запису в базу."""
        r = self.client.post(
            '/api/orders/preview/',
            {
                'items': [
                    {'product_id': pid, 'quantity': qty}
                    for pid, qty in pairs
                ],
            },
            format='json',
        )
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_no_discount_on_regular_day(self):
        """У середу сир іде за повною ціною."""
        with today_is(WEDNESDAY):
            data = self._preview((self.cheese.id, 2))
        self.assertEqual(
            data,
            {'subtotal': 560.0, 'discount': 0.0, 'total': 560.0},
        )

    def test_cheese_friday_discounts_only_cheese(self):
        """У п'ятницю −10% лише від суми сирів."""
        with today_is(FRIDAY):
            data = self._preview((self.cheese.id, 2), (self.sausage.id, 1))
        self.assertEqual(data['subtotal'], 749.0)
        # 10% від 560 грн сиру, ковбаса без знижки.
        self.assertEqual(data['discount'], 56.0)
        self.assertEqual(data['total'], 693.0)

    def test_birthday_discount_15_percent_on_everything(self):
        """Іменини: −15% на все замовлення."""
        self.user.birthday = date(1990, 10, 7)
        self.user.save()
        with today_is(WEDNESDAY):
            data = self._preview((self.sausage.id, 1))
        self.assertEqual(data['discount'], 28.35)
        self.assertEqual(data['total'], 160.65)

    def test_birthday_and_friday_do_not_stack(self):
        """Разом із п'ятницею лишається більша знижка, не сума."""
        self.user.birthday = FRIDAY
        self.user.save()
        with today_is(FRIDAY):
            data = self._preview((self.cheese.id, 1))
        # 15% від 280, а не 10% + 15%.
        self.assertEqual(data['discount'], 42.0)

    def test_created_order_stores_discount(self):
        """У базі total до знижки, у відповіді — сума до сплати."""
        with today_is(FRIDAY):
            r = self.client.post(
                '/api/orders/',
                body((self.cheese.id, 2)),
                format='json',
            )
        order = Order.objects.get(pk=r.json()['id'])
        self.assertEqual(order.total, Decimal('560.00'))
        self.assertEqual(order.discount, Decimal('56.00'))
        self.assertEqual(order.final_total, Decimal('504.00'))
        self.assertEqual(r.json()['total'], 504)

    def test_preview_has_no_side_effects(self):
        """Preview не створює замовлення і не чіпає stock."""
        with today_is(WEDNESDAY):
            self._preview((self.sausage.id, 5))
        self.assertEqual(Order.objects.count(), 0)
        self.sausage.refresh_from_db()
        self.assertEqual(self.sausage.stock, DEMO_STOCK)

    def test_preview_requires_auth(self):
        """Без сесії попередній підсумок недоступний."""
        self.client.credentials()
        r = self.client.post(
            '/api/orders/preview/',
            {'items': [{'product_id': self.sausage.id, 'quantity': 1}]},
            format='json',
        )
        self.assertEqual(r.status_code, 401)


class OrderHistoryTests(OrderBase):
    """GET /api/orders/ — лише свої, новіші зверху."""

    def _make(self, qty=1):
        """Одне замовлення в середу, без знижки."""
        with today_is(WEDNESDAY):
            r = self.client.post(
                '/api/orders/',
                body((self.sausage.id, qty)),
                format='json',
            )
        return r.json()

    def test_list_returns_only_own_orders_newest_first(self):
        """Чуже замовлення не потрапляє в історію."""
        first, second = self._make(1), self._make(2)
        # Явний час: порядок не залежить від точності годинника.
        Order.objects.filter(pk=first['id']).update(
            created_at=timezone.now() - timedelta(days=1),
        )
        other = make_user('other@example.com', 'Інший')
        self.client.credentials()
        login_client(self.client, 'other@example.com')
        self.client.post(
            '/api/orders/',
            body((self.sausage.id, 1)),
            format='json',
        )
        self.client.credentials()
        login_client(self.client)
        r = self.client.get('/api/orders/')
        ids = [row['id'] for row in r.json()['results']]
        self.assertEqual(ids, [second['id'], first['id']])
        self.assertEqual(Order.objects.filter(user=other).count(), 1)

    def test_list_item_shape_for_cabinet(self):
        """Поля, які читає вкладка «Замовлення» в кабінеті."""
        self._make()
        order = self.client.get('/api/orders/').json()['results'][0]
        for key in (
            'id', 'date', 'status', 'total',
            'items', 'comment', 'is_quick',
        ):
            self.assertIn(key, order)
        self.assertRegex(order['date'], r'^\d{4}-\d{2}-\d{2}$')

    def test_detail_of_foreign_order_is_404(self):
        """Чужий id виглядає як відсутній, не як 403."""
        mine = self._make()
        make_user('other@example.com', 'Інший')
        self.client.credentials()
        login_client(self.client, 'other@example.com')
        r = self.client.get(f"/api/orders/{mine['id']}/")
        self.assertEqual(r.status_code, 404)

    def test_detail_of_own_order(self):
        """Своя деталь віддає кількість зі знімка."""
        mine = self._make(2)
        r = self.client.get(f"/api/orders/{mine['id']}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['items'][0]['qty'], 2)

    def test_history_requires_auth(self):
        """Список замовлень без сесії — 401."""
        self.client.credentials()
        self.assertEqual(self.client.get('/api/orders/').status_code, 401)

    def test_order_keeps_price_snapshot(self):
        """Зміна ціни в каталозі не переписує старий чек."""
        mine = self._make()
        Product.objects.filter(pk=self.sausage.pk).update(
            price=Decimal('999'),
        )
        item = self.client.get(f"/api/orders/{mine['id']}/").json()
        self.assertEqual(item['items'][0]['price'], 189)


class QuickOrderTests(OrderBase):
    """POST /api/orders/quick/. Без входу і без зміни stock."""

    def test_anonymous_quick_order(self):
        """Гість створює заявку без user і без позицій."""
        self.client.credentials()
        r = self.client.post(
            '/api/orders/quick/',
            {'name': 'Гість', 'phone': PHONE, 'order': '2 кг ковбаси'},
            format='json',
        )
        self.assertEqual(r.status_code, 201)
        order = Order.objects.get(pk=r.json()['id'])
        self.assertTrue(order.is_quick)
        self.assertIsNone(order.user)
        self.assertEqual(order.comment, '2 кг ковбаси')

    def test_quick_order_validation(self):
        """Порожні поля, поганий телефон і занадто довгий текст."""
        self.client.credentials()
        bad = [
            {'name': '', 'phone': PHONE, 'order': 'x'},
            {'name': 'Гість', 'phone': '12', 'order': 'x'},
            {'name': 'Гість', 'phone': PHONE, 'order': ''},
            {'name': 'Гість', 'phone': PHONE, 'order': 'я' * 2001},
            {},
        ]
        for payload in bad:
            with self.subTest(payload=str(payload)[:40]):
                r = self.client.post(
                    '/api/orders/quick/',
                    payload,
                    format='json',
                )
                self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_quick_order_does_not_touch_stock(self):
        """Текст заявки не списує ковбасу зі складу."""
        self.client.credentials()
        self.client.post(
            '/api/orders/quick/',
            {'name': 'Гість', 'phone': PHONE, 'order': 'ковбаса'},
            format='json',
        )
        self.sausage.refresh_from_db()
        self.assertEqual(self.sausage.stock, DEMO_STOCK)

    def test_logged_in_quick_order_visible_in_cabinet(self):
        """Якщо токен був, заявка видна в історії без позицій."""
        r = self.client.post(
            '/api/orders/quick/',
            {'name': 'Іван', 'phone': PHONE, 'order': 'сир'},
            format='json',
        )
        self.assertEqual(r.status_code, 201)
        history = self.client.get('/api/orders/').json()['results']
        self.assertEqual(len(history), 1)
        self.assertTrue(history[0]['is_quick'])
        self.assertEqual(history[0]['items'], [])

    def test_expired_token_on_public_endpoint_gives_401(self):
        """Битий Bearer дає 401 навіть на публічному POST.

        api.js після цього повторює запит уже без токена.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Bearer expired.or.bad')
        r = self.client.post(
            '/api/orders/quick/',
            {'name': 'Гість', 'phone': PHONE, 'order': 'x'},
            format='json',
        )
        self.assertEqual(r.status_code, 401)
