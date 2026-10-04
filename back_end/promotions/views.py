from rest_framework import viewsets, permissions
from .models import Promotion
from .serializers import PromotionSerializer, PromoCodeSerializer

class PromotionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Публічний перегляд активних акцій.
    """
    queryset = Promotion.objects.filter(is_active=True)
    serializer_class = PromotionSerializer
    permission_classes = [permissions.AllowAny]

class PromoCodeViewSet(viewsets.ModelViewSet):
    serializer_class = PromoCodeSerializer
    permission_classes = [permissions.IsAuthenticated]