# Лише читання акцій. Маршрут codes прибрано разом із неіснуючою моделлю.
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PromotionViewSet

router = DefaultRouter()
router.register(r'promos', PromotionViewSet, basename='promotion')

urlpatterns = [
    path('', include(router.urls)),
]