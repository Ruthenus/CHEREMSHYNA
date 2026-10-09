# Попередні серіалізатори посилались на поля, яких немає в моделях:
#   Order.total_amount (насправді total / final_total), 
#   OrderItem.price (насправді product_price).
# Відповідь приведена до контракту фронтенду:
#   { id, date, status, total, items: [{ name, qty, price }] }.
# Тіло POST /orders/ теж за контрактом: customer_name, phone, 
# delivery_type, comment, items[].
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from .models import Order, OrderItem


class OrderItemReadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='product_name', read_only=True)
    qty = serializers.IntegerField(source='quantity', read_only=True)
    price = serializers.DecimalField(
        source='product_price',
        max_digits=10,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )

    class Meta:
        model = OrderItem
        fields = ['name', 'qty', 'price']


class OrderReadSerializer(serializers.ModelSerializer):
    """Те, що кабінет і історія замовлень уже вміють показати."""

    date = serializers.SerializerMethodField()
    status = serializers.CharField(source='get_status_display', read_only=True)
    # total у відповіді — сума до сплати після серверної знижки.
    total = serializers.DecimalField(
        source='final_total',
        max_digits=10,
        decimal_places=2,
        read_only=True,
        coerce_to_string=False,
    )
    items = OrderItemReadSerializer(many=True, read_only=True)
    # Швидка заявка без позицій інакше в кабінеті була порожньою.
    comment = serializers.CharField(read_only=True)
    is_quick = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'date', 'status', 'total', 'items', 'comment', 
                  'is_quick']

    @extend_schema_field(serializers.DateField())
    def get_date(self, obj):
        # created_at зберігається в UTC. Біля півночі за Києвом
        # .date() без localtime показувало попередній день.
        from django.utils import timezone
        return timezone.localtime(obj.created_at).date().isoformat()


class OrderItemWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    # Без верхньої межі кількість 10**9 не влазить у total (10 цифр).
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    items = OrderItemWriteSerializer(many=True, allow_empty=False)
    customer_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=30)
    delivery_type = serializers.ChoiceField(
        choices=['pickup', 'delivery'],
        required=False,
        default='pickup',
    )
    comment = serializers.CharField(required=False, allow_blank=True, 
                                    default='', max_length=2000)

    def validate_phone(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError('Вкажіть коректний номер телефону (10–15 цифр).')
        return value.strip()


class QuickOrderSerializer(serializers.Serializer):
    """
    POST /orders/quick/ — тіло, узгоджене в контракті: 
    { name, phone, order }.
    """

    name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=30)
    order = serializers.CharField(max_length=2000)

    def validate_phone(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 10 or len(digits) > 15:
            raise serializers.ValidationError('Вкажіть коректний номер телефону (10–15 цифр).')
        return value.strip()
