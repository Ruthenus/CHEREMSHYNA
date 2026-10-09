from django.contrib.auth import authenticate, get_user_model
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()


def _tokens_for_user(user):
    """Генерує пару JWT-токенів для користувача."""
    refresh = RefreshToken.for_user(user)
    # rev копіюється і в access. logout збільшує лічильник у базі.
    refresh['rev'] = user.auth_revision
    access = str(refresh.access_token)
    return {
        'refresh': str(refresh),
        'access': access,
        'token': access,
    }


# Явна схема для Swagger: інакше @api_view показує порожнє тіло.
_AuthResponse = {
    200: {
        'type': 'object',
        'properties': {
            'user': {'type': 'object'},
            'access': {'type': 'string'},
            'refresh': {'type': 'string'},
            'token': {'type': 'string'},
        },
    }
}


@extend_schema(request=RegisterSerializer, responses={201: _AuthResponse[200]})
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """POST /api/auth/register/ — реєстрація нового користувача."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    tokens = _tokens_for_user(user)
    return Response(
        {'user': UserSerializer(user).data, **tokens},
        status=status.HTTP_201_CREATED,
    )


@extend_schema(request=LoginSerializer, responses=_AuthResponse)
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """POST /api/auth/login/ — вхід за email + password."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        email=serializer.validated_data['email'],
        password=serializer.validated_data['password'],
    )
    if user is None:
        return Response(
            {'detail': 'Невірний email або пароль.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    tokens = _tokens_for_user(user)
    return Response({'user': UserSerializer(user).data, **tokens})


@extend_schema(request=ProfileUpdateSerializer, responses=UserSerializer)
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    """GET /api/auth/me/ — профіль; PATCH — оновлення профілю. 
    Тіло відповіді — сам user."""
    if request.method == 'GET':
        return Response(UserSerializer(request.user).data)

    serializer = ProfileUpdateSerializer(
        request.user, data=request.data, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserSerializer(request.user).data)


class _LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True)


@extend_schema(request=_LogoutSerializer, responses={200: {'type': 'object'}})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """POST /api/auth/logout/ — відповідь {detail: ok}.

    Піднімаємо auth_revision, тож цей access одразу недійсний
    на всіх пристроях. Refresh, якщо його передали, ще й потрапляє в blacklist.
    """
    request.user.auth_revision += 1
    request.user.save(update_fields=['auth_revision'])
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass
    return Response({'detail': 'ok'})
