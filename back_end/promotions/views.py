# Прибрано PromoCodeViewSet: моделі промокоду немає,
# тож схема Swagger і будь-який запит на /codes/ падали б з помилкою.
from rest_framework import permissions, viewsets

from .models import Promotion
from .serializers import PromotionSerializer


class PromotionViewSet(viewsets.ReadOnlyModelViewSet):
    """Публічний перегляд активних акцій. GET /api/promotions/promos/."""

    queryset = Promotion.objects.filter(is_active=True)
    serializer_class = PromotionSerializer
    permission_classes = [permissions.AllowAny]