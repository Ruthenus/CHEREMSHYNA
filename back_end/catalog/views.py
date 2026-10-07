import django_filters
from django.db import connection
from django.db.models import Q
from rest_framework import generics
from rest_framework.filters import OrderingFilter
from rest_framework.permissions import AllowAny

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryListView(generics.ListAPIView):
    """GET /api/categories/ — список активних категорій."""
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None  # категорій мало, очікується список або results


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category__slug', 
                                         lookup_expr='exact')
    # ?search= шукає і в назві, і в описі.
    search = django_filters.CharFilter(method='filter_search')

    class Meta:
        model = Product
        fields = ['category', 'search', 'is_available', 'is_featured']

    def filter_search(self, queryset, name, value):
        value = (value or '').strip()
        if not value:
            return queryset
        # SQLite у LIKE ігнорує регістр лише для ASCII: «гауда» не знаходило
        # «Гауда». Для SQLite порівнюємо в Python через casefold() 
        # (для MVP-каталогу з сотнями товарів це нормально). 
        # PostgreSQL/MySQL лишаються на icontains.
        if connection.vendor == 'sqlite':
            needle = value.casefold()
            ids = [
                pk
                for pk, title, text in queryset.values_list('pk', 'name', 
                                                            'description')
                if needle in title.casefold() or needle in (text or '').casefold()
            ]
            return queryset.filter(pk__in=ids)
        return queryset.filter(Q(name__icontains=value) | 
                               Q(description__icontains=value))


class ProductListView(generics.ListAPIView):
    """GET /api/products/?category=<slug>&search=<str>&ordering=price|name|-created_at"""
    queryset = Product.objects.filter(is_available=True).select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    filterset_class = ProductFilter
    # ordering_fields саме по собі не працює без OrderingFilter.
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        OrderingFilter,
    ]
    ordering_fields = ['price', 'name', 'created_at']
    ordering = ['-is_featured', 'name']


class ProductDetailView(generics.RetrieveAPIView):
    """GET /api/products/<id>/"""
    queryset = Product.objects.filter(is_available=True).select_related('category')
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
