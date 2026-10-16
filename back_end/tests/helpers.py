"""Спільні фікстури тестів API.

seed наповнює демо-каталог. today_is підміняє дату знижок.
make_user і login_client дають сесію зі справжнім claim rev.
"""
from contextlib import contextmanager
from datetime import date
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import call_command

User = get_user_model()

PASSWORD = 'Kx9#mQz7'
# Середа: немає ні сирної п'ятниці, ні іменин.
WEDNESDAY = date(2026, 10, 7)
# П'ятниця: −10% лише на категорію cheeses.
FRIDAY = date(2026, 10, 9)
# Той самий залишок, який seed_data пише товару.
DEMO_STOCK = 50


def seed():
    """Команда seed_data. Вивід у буфер, щоб не смітити в тест."""
    call_command('seed_data', stdout=StringIO())


@contextmanager
def today_is(day):
    """Підміняє timezone.localdate на один день."""
    with mock.patch('django.utils.timezone.localdate', return_value=day):
        yield


def make_user(email='ivan@example.com', name='Іван Коваленко', **extra):
    """Користувач із паролем PASSWORD. extra — поля моделі User."""
    return User.objects.create_user(
        email=email, password=PASSWORD, name=name, **extra,
    )


def login_client(client, email='ivan@example.com'):
    """Логін через API, щоб у access був актуальний rev."""
    response = client.post(
        '/api/auth/login/',
        {'email': email, 'password': PASSWORD},
        format='json',
    )
    assert response.status_code == 200, response.content
    client.credentials(
        HTTP_AUTHORIZATION='Bearer ' + response.data['access'],
    )
    return response.data
