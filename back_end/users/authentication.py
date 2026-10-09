# Вихід має гасити і access, не лише прибрати ключ із браузера.
# У токені лежить rev. Після logout він не збігається з User.auth_revision.
from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class RevisionJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if validated_token.get('rev') != user.auth_revision:
            raise InvalidToken('Сесію завершено. Увійдіть знову.')
        return user


class RevisionJWTScheme(OpenApiAuthenticationExtension):
    """Щоб Swagger бачив Bearer, а не попередження про невідомий клас."""

    target_class = RevisionJWTAuthentication
    name = 'bearerAuth'

    def get_security_definition(self, auto_schema):
        return {'type': 'http', 'scheme': 'bearer', 'bearerFormat': 'JWT'}