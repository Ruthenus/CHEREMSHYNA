from django.contrib import admin
from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'emoji', 'order', 'is_active')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'category',
        'price',
        'price_display',
        'unit',
        'is_available',
        'is_featured',
        'stock',
    )
    list_filter = ('category', 'is_available', 'is_featured')
    search_fields = ('name', 'external_id', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('price', 'is_available', 'is_featured', 'stock')
