from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    # Фронтенд очікує поле `icon` (аліас для emoji)
    icon = serializers.CharField(source='emoji', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'slug', 'name', 'icon', 'emoji', 'order']


class ProductSerializer(serializers.ModelSerializer):
    # category повертається як slug (для фільтрації на фронтенді)
    category = serializers.SlugRelatedField(slug_field='slug', read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description',
            'price', 'price_display', 'unit',
            'emoji', 'image', 'category',
            'is_available', 'is_featured', 'stock',
        ]

    def get_image(self, obj):
        """Повертає абсолютний URL зображення або None."""
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
