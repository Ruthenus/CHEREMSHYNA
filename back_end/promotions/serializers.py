# Поля discount_percent / start_date / end_date і модель PromoCode
# у проєкті відсутні. Серіалізатор віддає реальні поля Promotion.
from rest_framework import serializers

from .models import Promotion


class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = [
            'id',
            'title',
            'slug',
            'type',
            'description',
            'badge',
            'badge_color',
            'is_active',
            'order',
        ]