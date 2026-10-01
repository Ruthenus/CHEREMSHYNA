"""
back_end URL Configuration
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

urlpatterns = [
    # Uncomment the next line to enable the admin:
    #path('admin/', admin.site.urls)
]
