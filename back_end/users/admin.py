from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserPreference


class PreferenceInline(admin.TabularInline):
    model = UserPreference
    extra = 0

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('email',)
    list_display = ('email', 'name', 'phone', 'city', 'is_staff')
    search_fields = ('email', 'name', 'phone')
    inlines = [PreferenceInline]
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Профіль', {'fields': ('name', 'phone', 'city', 'birthday', 'photo')}),
        ('Права', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'password1', 'password2', 'is_staff', 'is_superuser'),
        }),
    )
    filter_horizontal = ('groups', 'user_permissions')


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'tag')