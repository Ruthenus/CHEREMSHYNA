import django_filters
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryListView(generics.ListAPIView):
    """GET /api/categories/ — список активних категорій."""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='exact')
    search = django_filters.CharFilter(field_name='name', lookup_expr='icontains')

    class Meta:
        model = Product
        fields = ['category', 'search', 'is_available', 'is_featured']


class ProductListView(generics.ListAPIView):
    """GET /api/products/?category=<slug>&search=<str>&ordering=<field>"""
    queryset = Product.objects.filter(is_available=True).select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    ordering_fields = ['price', 'name', 'created_at']
    ordering = ['-is_featured', 'name']


class ProductDetailView(generics.RetrieveAPIView):
    """GET /api/products/<id>/"""
    queryset = Product.objects.filter(is_available=True).select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
