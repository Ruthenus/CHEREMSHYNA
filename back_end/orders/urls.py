# Явні шляхи замість роутера: quick/ має бути раніше за <id>/.
from django.urls import path

from . import views

urlpatterns = [
    path('', views.OrderListCreateView.as_view(), name='order-list'),
    path('quick/', views.QuickOrderView.as_view(), name='order-quick'),
    path('preview/', views.OrderPreviewView.as_view(), name='order-preview'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
]