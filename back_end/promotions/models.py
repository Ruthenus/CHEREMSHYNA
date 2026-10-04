from django.db import models
from django.utils.translation import gettext_lazy as _


class Promotion(models.Model):
    class PromoType(models.TextChoices):
        BIRTHDAY = 'birthday', _('Знижка на день народження')
        SUBSCRIPTION = 'subscription', _("М'ясний абонемент")
        CHEESE_FRIDAY = 'cheese_friday', _("Сирна п'ятниця")
        FREE_COFFEE = 'free_coffee', _('Кава в подарунок')
        OTHER = 'other', _('Інша акція')

    title = models.CharField(_('назва акції'), max_length=200)
    slug = models.SlugField(_('slug'), max_length=200, unique=True)
    type = models.CharField(
        _('тип акції'),
        max_length=30,
        choices=PromoType.choices,
        default=PromoType.OTHER,
    )
    description = models.TextField(_('опис'), blank=True, default='')
    badge = models.CharField(_('текст бейджа'), max_length=50, blank=True, default='')
    badge_color = models.CharField(_('колір бейджа'), max_length=30, blank=True, default='')
    is_active = models.BooleanField(_('активна'), default=True)
    order = models.PositiveIntegerField(_('порядок сортування'), default=0)
    created_at = models.DateTimeField(_('створено'), auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']
        verbose_name = _('акція')
        verbose_name_plural = _('акції')

    def __str__(self):
        return self.title
