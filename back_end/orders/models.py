from decimal import Decimal
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Cart(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='cart',
        verbose_name=_('користувач'),
    )
    session_key = models.CharField(
        _('ключ сесії'),
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
    )
    created_at = models.DateTimeField(_('створено'), auto_now_add=True)
    updated_at = models.DateTimeField(_('оновлено'), auto_now=True)

    class Meta:
        verbose_name = _('кошик')
        verbose_name_plural = _('кошики')

    def __str__(self):
        if self.user:
            return f'Кошик користувача {self.user}'
        return f'Кошик сесії {self.session_key}'

    def total(self) -> Decimal:
        return sum((item.subtotal() for item in self.items.all()), Decimal('0.00'))

    def items_count(self) -> int:
        return sum((item.quantity for item in self.items.all()), 0)


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('кошик'),
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.CASCADE,
        related_name='cart_items',
        verbose_name=_('товар'),
    )
    quantity = models.PositiveIntegerField(_('кількість'), default=1)

    class Meta:
        verbose_name = _('позиція кошика')
        verbose_name_plural = _('позиції кошика')
        unique_together = ('cart', 'product')

    def __str__(self):
        return f'{self.product.name} x {self.quantity}'

    def subtotal(self) -> Decimal:
        return self.product.price * self.quantity


class Order(models.Model):
    class Status(models.TextChoices):
        NEW = 'new', _('Нове')
        CONFIRMED = 'confirmed', _('Підтверджено')
        PROCESSING = 'processing', _('В обробці')
        SHIPPING = 'shipping', _('Доставляється')
        DELIVERED = 'delivered', _('Доставлено')
        CANCELLED = 'cancelled', _('Скасовано')

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        verbose_name=_('користувач'),
    )
    name = models.CharField(_('імʼя клієнта'), max_length=150)
    phone = models.CharField(_('телефон'), max_length=30)
    email = models.EmailField(_('email'), blank=True, default='')
    city = models.CharField(_('місто'), max_length=100, blank=True, default='')
    address = models.CharField(_('адреса доставки'), max_length=255, blank=True, default='')
    comment = models.TextField(_('коментар'), blank=True, default='')
    status = models.CharField(
        _('статус'),
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    total = models.DecimalField(_('загальна сума'), max_digits=10, decimal_places=2, default=Decimal('0.00'))
    discount = models.DecimalField(_('знижка'), max_digits=10, decimal_places=2, default=Decimal('0.00'))
    final_total = models.DecimalField(_('сума до сплати'), max_digits=10, decimal_places=2, default=Decimal('0.00'))
    is_quick = models.BooleanField(_('швидке замовлення'), default=False)
    created_at = models.DateTimeField(_('створено'), auto_now_add=True)
    updated_at = models.DateTimeField(_('оновлено'), auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('замовлення')
        verbose_name_plural = _('замовлення')

    def __str__(self):
        return f'Замовлення #{self.id} — {self.name} ({self.get_status_display()})'


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name=_('замовлення'),
    )
    product = models.ForeignKey(
        'catalog.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_items',
        verbose_name=_('товар'),
    )
    product_name = models.CharField(_('назва товару (снепшот)'), max_length=255)
    product_price = models.DecimalField(_('ціна товару (снепшот)'), max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(_('кількість'), default=1)
    unit = models.CharField(_('одиниця вимірювання'), max_length=20, default='кг')

    class Meta:
        verbose_name = _('позиція замовлення')
        verbose_name_plural = _('позиції замовлення')

    def __str__(self):
        return f'{self.product_name} x {self.quantity}'

    def subtotal(self) -> Decimal:
        return self.product_price * self.quantity
