from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PromotionViewSet, PromoCodeViewSet

router = DefaultRouter()
router.register(r'promos', PromotionViewSet, basename='promotion')
router.register(r'codes', PromoCodeViewSet, basename='promocode')

urlpatterns = [
    path('', include(router.urls)),
]