from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from .models import UserPreference

User = get_user_model()

# Cabinet.jsx порівнює українські підписи (з типографським апострофом),
# а в базі лежать службові ключі meat/cheese/…. 
# Віддаємо підписи, приймаємо і ключі, і підписи.
CABINET_LABELS = {
    'meat': 'М’ясо та ковбаси',
    'smoked': 'Копченості',
    'cheese': 'Сири',
    'poultry': 'Птиця',
    'coffee': 'Кава та чай',
    'bread': 'Хліб та випічка',
    'sauces': 'Соуси та приправи',
    'vegetables': 'Овочі',
}


def _preference_alias():
    alias = {}
    for key, label in User.PREFERENCE_CHOICES:
        alias[key] = key
        alias[label] = key
        alias[label.replace("'", '’')] = key
        alias[label.replace('’', "'")] = key
        cabinet = CABINET_LABELS.get(key)
        if cabinet:
            alias[cabinet] = key
    return alias


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreference
        fields = ['tag']


class UserSerializer(serializers.ModelSerializer):
    """Серіалізатор профілю — повертається після login/register 
    та GET /auth/me/."""
    preferences = serializers.SerializerMethodField()
    has_birthday_discount = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'phone', 'city',
            'birthday', 'photo', 'preferences', 'has_birthday_discount',
        ]
        read_only_fields = ['id', 'email', 'has_birthday_discount']

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_preferences(self, obj):
        # Стабільний порядок як у формі кабінету, не випадковий 
        # порядок рядків у SQLite.
        selected = set(obj.preferences.values_list('tag', flat=True))
        return [
            CABINET_LABELS.get(key, key)
            for key, _label in User.PREFERENCE_CHOICES
            if key in selected
        ]


class RegisterSerializer(serializers.ModelSerializer):
    """Реєстрація: name, email, phone, password."""
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['name', 'email', 'phone', 'password']
        extra_kwargs = {
            'email': {
                'error_messages': {
                    'unique': 'Користувач з таким email вже існує',
                }
            }
        }

    def validate(self, attrs):
        # Інакше AUTH_PASSWORD_VALIDATORS у settings ніхто не викликав.
        # Мінімум літер узгоджений із формою реєстрації: 6 (шість), 
        # не дефолтні 8 (вісім) Django.
        user = User(name=attrs.get('name', ''), email=attrs.get('email', ''))
        try:
            validate_password(attrs['password'], user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def validate_email(self, value):
        # Те саме повідомлення, яке вже показує форма реєстрації.
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Користувач з таким email вже існує')
        return value

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
        child=serializers.CharField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = User
        fields = ['name', 'phone', 'city', 'birthday', 'photo', 'preference_tags']

    def validate_preference_tags(self, tags):
        alias = _preference_alias()
        resolved = []
        unknown = []
        for tag in tags:
            key = alias.get(str(tag).strip())
            if not key:
                unknown.append(str(tag))
            elif key not in resolved:
                resolved.append(key)
        if unknown:
            raise serializers.ValidationError(
                'Невідомі вподобання: ' + ', '.join(unknown)
            )
        return resolved

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
