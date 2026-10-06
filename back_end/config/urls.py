"""
back_end URL Configuration

"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema

from catalog.urls import categories_urlpatterns


class HealthSerializer(serializers.Serializer):
    """Щоб Swagger бачив тіло /api/health/, а не пропускав в'ю."""

    status = serializers.CharField()
    service = serializers.CharField()


@extend_schema(responses=HealthSerializer)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'service': 'cheremshyna'})


api_patterns = [
    path('health/', health_check, name='health-check'),
    # OpenAPI + Swagger UI + ReDoc.
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('auth/', include('users.urls')),
    path('categories/', include(categories_urlpatterns)),
    path('products/', include('catalog.urls')),
    path('orders/', include('orders.urls')),
    path('promotions/', include('promotions.urls')),
]

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(api_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
