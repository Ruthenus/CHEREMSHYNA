from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'session_key', 'items_count', 'total', 'updated_at')
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product_name', 'product_price', 'quantity', 'unit', 'subtotal')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'name',
        'phone',
        'status',
        'is_quick',
        'final_total',
        'created_at',
    )
    list_filter = ('status', 'is_quick', 'created_at')
    search_fields = ('name', 'phone', 'email', 'address')
    list_editable = ('status',)
    inlines = [OrderItemInline]
