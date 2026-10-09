# Замість зламаного ModelViewSet (він зберігав неіснуючі поля
# і не рахував ціни) — список / деталь / створення за контрактом фронтенду.
# Ціни й підсумок завжди рахує сервер, а не клієнт.
# Окреме поле адреси в контракті ще не узгоджене:
# адреса приходить у comment з префіксом «Адреса доставки:»
# і додатково зберігається в Order.address.
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers

from catalog.models import Product

from .models import Order, OrderItem
from .serializers import (
    OrderCreateSerializer,
    OrderItemWriteSerializer,
    OrderReadSerializer,
    QuickOrderSerializer,
)

# Префікс, за яким у коментарі шукаємо адресу доставки
ADDRESS_PREFIX = 'Адреса доставки:'


def _money(value):
    """
    Приводить будь-яке грошове значення до Decimal з двома знаками
    після коми (копійки). Використовується всюди, щоб уникнути
    помилок округлення float.
    """
    return Decimal(value).quantize(Decimal('0.01'))


def _extract_address(comment):
    """
    Шукає в тексті коментаря рядок, що починається з ADDRESS_PREFIX,
    і повертає адресу без префікса.
    Якщо такого рядка немає — повертає порожній рядок.
    """
    for line in (comment or '').splitlines():
        stripped = line.strip()
        if stripped.startswith(ADDRESS_PREFIX):
            return stripped[len(ADDRESS_PREFIX):].strip()
    return ''


def _discount_for(user, lines):
    """
    Розрахунок знижки на сервері (клієнту не довіряємо).

    Правила пріоритету:
    1. Якщо в користувача є прапорець has_birthday_discount
       (день народження ± вікно з налаштувань) — знижка −15%
       на всю суму замовлення.
    2. Інакше, якщо сьогодні п'ятниця (weekday == 4) —
       знижка −10% лише на позиції категорії cheeses.
    3. «М'ясний абонемент» і «кава в подарунок» залишаються
       лише інформаційними: у контракті для них немає
       окремого поля подарунка, тому в розрахунку не беруть участі.

    Повертає кортеж (subtotal, discount) — обидва вже округлені.
    """
    subtotal = sum(
        (line['price'] * line['quantity'] for line in lines),
        Decimal('0'),
    )
    discount = Decimal('0')

    if user is not None and getattr(user, 'has_birthday_discount', False):
        # День народження має вищий пріоритет
        discount = _money(subtotal * Decimal('0.15'))
    elif timezone.localdate().weekday() == 4:
        # П'ятниця: знижка тільки на сири
        cheese = sum(
            (
                line['price'] * line['quantity']
                for line in lines
                if line['product'].category.slug == 'cheeses'
            ),
            Decimal('0'),
        )
        discount = _money(cheese * Decimal('0.10'))

    # Захист від ситуації, коли знижка більша за суму
    if discount > subtotal:
        discount = _money(subtotal)

    return _money(subtotal), discount


def _prepare_order(items):
    """
    Спільна логіка підготовки кошика для створення замовлення
    і для попереднього підрахунку (preview).

    Що робить:
    1. Зливає однакові product_id (кілька рядків одного товару
       сумуються в одну позицію).
    2. Перевіряє, що жодна позиція не перевищує 99 одиниць.
    3. Завантажує товари з БД (лише is_available=True)
       і перевіряє, що всі product_id існують.
    4. Формує список lines з об'єктом Product, кількістю і ціною.

    Повертає:
      - ((merged, lines), None) — успіх
      - (None, Response) — помилка валідації (готовий Response 400)
    """
    # Зливаємо дублікати product_id
    merged = {}
    for item in items:
        merged[item['product_id']] = (
            merged.get(item['product_id'], 0) + item['quantity']
        )

    # Ліміт 99 одиниць на одну позицію
    # (кілька однакових рядків у тілі запиту обходять max serializer'а)
    if any(quantity > 99 for quantity in merged.values()):
        return None, Response(
            {'items': 'В одній позиції можна замовити не більше 99 одиниць.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Завантажуємо тільки доступні товари разом із категорією
    products = {
        product.id: product
        for product in Product.objects.filter(
            id__in=merged.keys(),
            is_available=True,
        ).select_related('category')
    }

    # Перевіряємо, чи всі запитані id знайдені
    missing = [
        product_id
        for product_id in merged
        if product_id not in products
    ]
    if missing:
        return None, Response(
            {'items': f'Немає в наявності або не знайдено товари: {missing}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Формуємо рядки замовлення з актуальною ціною з БД
    lines = [
        {
            'product': products[product_id],
            'quantity': quantity,
            'price': products[product_id].price,
        }
        for product_id, quantity in merged.items()
    ]
    return (merged, lines), None


class OrderListCreateView(generics.GenericAPIView):
    """
    GET  /api/orders/  — історія замовлень поточного користувача
                         (з пагінацією, якщо налаштована).
    POST /api/orders/  — створення нового замовлення.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = OrderCreateSerializer

    def get_queryset(self):
        # При генерації схеми Swagger немає request.user —
        # без цієї перевірки падає на фільтрі user=.
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()
        return (
            Order.objects
            .filter(user=self.request.user)
            .prefetch_related('items')
        )

    @extend_schema(responses=OrderReadSerializer(many=True))
    def get(self, request):
        """Повертає список замовлень користувача."""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        serializer = OrderReadSerializer(
            page if page is not None else queryset,
            many=True,
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @extend_schema(
        request=OrderCreateSerializer,
        responses={201: OrderReadSerializer},
    )
    def post(self, request):
        """
        Створює замовлення:
        1. Валідує тіло запиту.
        2. Готує і перевіряє кошик (_prepare_order).
        3. Рахує знижку (_discount_for).
        4. В транзакції блокує товари, перевіряє stock,
           зменшує залишок і створює Order + OrderItem.
        """
        payload = OrderCreateSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        prepared, error = _prepare_order(data['items'])
        if error:
            return error
        merged, lines = prepared

        subtotal, discount = _discount_for(request.user, lines)

        comment = data.get('comment') or ''
        # Адресу витягуємо лише для доставки
        address = (
            _extract_address(comment)
            if data.get('delivery_type') == 'delivery'
            else ''
        )

        with transaction.atomic():
            # Блокуємо рядки товарів, щоб уникнути race condition
            # при одночасному зменшенні stock.
            locked = {
                product.id: product
                for product in Product.objects
                .select_for_update()
                .filter(id__in=merged.keys())
            }

            # Перевірка залишку. Клієнту показуємо назви товарів,
            # а не внутрішні id (раніше було «Недостатньо: [17]»).
            short = [
                locked[product_id].name
                for product_id, quantity in merged.items()
                if locked[product_id].stock < quantity
            ]
            if short:
                return Response(
                    {'items': 'Недостатньо на складі: ' + ', '.join(short)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Зменшуємо залишок на складі
            for product_id, quantity in merged.items():
                product = locked[product_id]
                product.stock -= quantity
                product.save(update_fields=['stock'])

            # Створюємо замовлення
            order = Order.objects.create(
                user=request.user,
                name=data['customer_name'].strip(),
                phone=data['phone'],
                email=request.user.email or '',
                city=getattr(request.user, 'city', '') or '',
                address=address,
                comment=comment,
                total=subtotal,
                discount=discount,
                final_total=_money(subtotal - discount),
                is_quick=False,
            )

            # Масове створення позицій (snapshot назви, ціни, одиниці)
            OrderItem.objects.bulk_create([
                OrderItem(
                    order=order,
                    product=line['product'],
                    product_name=line['product'].name,
                    product_price=line['price'],
                    quantity=line['quantity'],
                    unit=line['product'].unit,
                )
                for line in lines
            ])

        # Перечитуємо з prefetch, щоб serializer отримав items
        order = Order.objects.prefetch_related('items').get(pk=order.pk)
        return Response(
            OrderReadSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class _PreviewBodySerializer(serializers.Serializer):
    """Тіло запиту для попереднього підрахунку: лише список items."""
    items = OrderItemWriteSerializer(many=True, allow_empty=False)


class OrderPreviewView(APIView):
    """
    POST /api/orders/preview/

    Повертає subtotal / discount / total зі знижкою
    ДО підтвердження замовлення. Нічого не пише в базу.
    Потрібен, бо екран оформлення раніше показував
    суму кошика без урахування −15% / −10%.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(request=_PreviewBodySerializer, responses={200: dict})
    def post(self, request):
        payload = _PreviewBodySerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        prepared, error = _prepare_order(payload.validated_data['items'])
        if error:
            return error
        _merged, lines = prepared

        subtotal, discount = _discount_for(request.user, lines)
        return Response({
            'subtotal': float(subtotal),
            'discount': float(discount),
            'total': float(_money(subtotal - discount)),
        })


class OrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/orders/<id>/

    Деталі одного замовлення. Доступ лише до власних замовлень.
    """

    serializer_class = OrderReadSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Аналогічно ListCreate — захист для swagger_fake_view
        if getattr(self, 'swagger_fake_view', False):
            return Order.objects.none()
        return (
            Order.objects
            .filter(user=self.request.user)
            .prefetch_related('items')
        )


class QuickOrderView(APIView):
    """
    POST /api/orders/quick/

    Швидка заявка з блоку контактів на сайті.
    Не потребує авторизації. Товарів у замовленні немає —
    текст заявки зберігається в comment, is_quick=True.
    """

    permission_classes = [AllowAny]
    serializer_class = QuickOrderSerializer

    @extend_schema(
        request=QuickOrderSerializer,
        responses={201: OrderReadSerializer},
    )
    def post(self, request):
        payload = QuickOrderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        # Якщо користувач уже залогінений — прив'язуємо заявку до нього
        user = request.user if request.user.is_authenticated else None

        order = Order.objects.create(
            user=user,
            name=data['name'].strip(),
            phone=data['phone'],
            email=getattr(user, 'email', '') or '',
            comment=data['order'].strip(),
            is_quick=True,
        )
        return Response(
            {'id': order.id, 'detail': 'ok'},
            status=status.HTTP_201_CREATED,
        )