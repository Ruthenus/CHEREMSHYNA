from rest_framework import serializers
from .models import Promotion

class PromotionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Promotion
        fields = ['id', 'title', 'description', 'discount_percent', 'start_date', 'end_date', 'is_active']

class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        fields = ['id', 'code', 'discount_amount', 'is_used', 'valid_until']