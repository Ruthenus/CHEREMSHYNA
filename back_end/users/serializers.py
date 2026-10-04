from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import UserPreference

User = get_user_model()


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['tag']


class UserSerializer(serializers.ModelSerializer):
    """Серіалізатор профілю — повертається після login/register та GET /auth/me/."""
    preferences = serializers.SerializerMethodField()
    has_birthday_discount = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'phone', 'city',
            'birthday', 'photo', 'preferences', 'has_birthday_discount',
        ]
        read_only_fields = ['id', 'email', 'has_birthday_discount']

    def get_preferences(self, obj):
        return list(obj.preferences.values_list('tag', flat=True))


class RegisterSerializer(serializers.ModelSerializer):
    """Реєстрація: name, email, phone, password."""
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'password']

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            phone=validated_data.get('phone', ''),
            password=validated_data['password'],
        )


class LoginSerializer(serializers.Serializer):
    """Логін: email + password."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """PATCH /auth/me/ — оновлення профілю та вподобань."""
    preference_tags = serializers.ListField(
        child=serializers.ChoiceField(choices=[c[0] for c in User.PREFERENCE_CHOICES]),
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = ['name', 'phone', 'city', 'birthday', 'photo', 'preference_tags']

    def update(self, instance, validated_data):
        preference_tags = validated_data.pop('preference_tags', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if preference_tags is not None:
            instance.preferences.all().delete()
            for tag in preference_tags:
                UserPreference.objects.get_or_create(user=instance, tag=tag)

        return instance
