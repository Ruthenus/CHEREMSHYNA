from django.db import models
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    name = models.CharField(_('назва'), max_length=120)
    slug = models.SlugField(_('slug'), max_length=120, unique=True)
    emoji = models.CharField(_('emoji'), max_length=20, blank=True, default='')
    order = models.PositiveIntegerField(_('порядок сортування'), default=0)
    is_active = models.BooleanField(_('активна'), default=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = _('категорія')
        verbose_name_plural = _('категорії')

    def __str__(self):
        return f'{self.emoji} {self.name}'.strip() if self.emoji else self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='products',
        verbose_name=_('категорія'),
    )
    external_id = models.CharField(_('зовнішній ID'), max_length=100, unique=True)
    name = models.CharField(_('назва'), max_length=255)
    slug = models.SlugField(_('slug'), max_length=255, unique=True)
    description = models.TextField(_('опис'), blank=True, default='')
    price = models.DecimalField(_('ціна'), max_digits=10, decimal_places=2)
    price_display = models.CharField(_('відображення ціни'), max_length=60, blank=True, default='')
    unit = models.CharField(_('одиниця вимірювання'), max_length=20, default='кг')
    emoji = models.CharField(_('emoji'), max_length=20, blank=True, default='')
    image = models.ImageField(_('зображення'), upload_to='products/', null=True, blank=True)
    is_available = models.BooleanField(_('в наявності'), default=True)
    is_featured = models.BooleanField(_('рекомендований'), default=False)
    stock = models.PositiveIntegerField(_('залишок на складі'), default=0)
    created_at = models.DateTimeField(_('створено'), auto_now_add=True)

    class Meta:
        ordering = ['-is_featured', 'name']
        verbose_name = _('товар')
        verbose_name_plural = _('товари')

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.price_display:
            self.price_display = f'{self.price} ₴/{self.unit}'
        super().save(*args, **kwargs)
