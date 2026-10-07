from django.urls import path
from . import views

# Ці маршрути підключаються як /api/products/ з config/urls.py
urlpatterns = [
    path('',      views.ProductListView.as_view(),   name='product-list'),
    path('<int:pk>/', views.ProductDetailView.as_view(), name='product-detail'),
]

# Підключаються як /api/categories/
categories_urlpatterns = [
    path('', views.CategoryListView.as_view(), name='category-list'),
]
