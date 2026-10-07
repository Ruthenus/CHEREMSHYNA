from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
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
    # Завжди «₴/кг», хоч би що введено в адмінці (див. Product.unit_label).
    unit = serializers.CharField(source='unit_label', read_only=True)
    # Число в JSON, щоб картка не показувала рядок '189.00'.
    price = serializers.DecimalField(max_digits=10, decimal_places=2, 
                                     coerce_to_string=False)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description',
            'price', 'price_display', 'unit',
            'emoji', 'image', 'category',
            'is_available', 'is_featured', 'stock',
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_image(self, obj):
        """Повертає URL зображення або None.
        Відносний /media/..., а не http://127.0.0.1:8000/...
        """
        if not obj.image:
            return None
        return obj.image.url
