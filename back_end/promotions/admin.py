from django.contrib import admin
from .models import Promotion


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'type', 'badge', 'badge_color', 'is_active', 'order')
    list_filter = ('type', 'is_active')
    search_fields = ('title', 'slug', 'description', 'badge')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ('is_active', 'order')
