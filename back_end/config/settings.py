"""
Django settings for back_end project.

Based on by 'django-admin startproject' using Django 2.1.2.

For more information on this file, see
https://docs.djangoproject.com/en/2.1/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/2.1/ref/settings/
"""

import os
import posixpath
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# .env лежить поруч із manage.py. load_dotenv() без шляху
# брав файл лише з поточної теки запуску і мовчки лишав SECRET_KEY порожнім.
load_dotenv(BASE_DIR / '.env')

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/2.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError(
        "Не знайдено DJANGO_SECRET_KEY. "
        "Створіть файл .env і додайте туди DJANGO_SECRET_KEY=ваш_ключ"
    )

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', 'False') == 'True'

def _csv(name, default=''):
    """Список із змінної середовища: коми, без порожніх країв."""
    raw = os.environ.get(name, default)
    return [item.strip() for item in raw.split(',') if item.strip()]


ALLOWED_HOSTS = _csv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1')

# nginx знімає HTTPS і передає X-Forwarded-Proto.
# Без цього Django бачить запит як HTTP і ламає адмінку.
CSRF_TRUSTED_ORIGINS = _csv('DJANGO_CSRF_TRUSTED_ORIGINS')
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# Application references
# https://docs.djangoproject.com/en/2.1/ref/settings/#std:setting-INSTALLED_APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # logout гасить refresh
    'django_filters',
    'corsheaders',
    'drf_spectacular',  # OpenAPI-схема, Swagger UI, ReDoc
    'users',
    'catalog',
    'orders',
    'promotions',
]

# Middleware framework
# https://docs.djangoproject.com/en/2.1/topics/http/middleware/
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

# Template configuration
# https://docs.djangoproject.com/en/2.1/topics/templates/
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# https://docs.djangoproject.com/en/2.1/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'users.User'

AUTHENTICATION_BACKENDS = [
    'users.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

BIRTHDAY_DISCOUNT_WINDOW_DAYS = 7

# Password validation
# https://docs.djangoproject.com/en/2.1/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        # Форма реєстрації каже «мінімум 6». Дефолт Django — 8,
        # і тоді валідний для верстки пароль API відхиляв би.
        'OPTIONS': {'min_length': 6},
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/2.1/topics/i18n/
LANGUAGE_CODE = 'uk'
TIME_ZONE = 'Europe/Kyiv'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/2.1/howto/static-files/
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# CORS
# Широко відкрито лише поки DEBUG (локальна здача).
# HSTS і редірект на HTTPS лишаються на nginx.
# Secure-cookie вмикається лише коли DEBUG=False.
CORS_ALLOW_ALL_ORIGINS = DEBUG
if not DEBUG:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:62550',
        'http://127.0.0.1:62550',
    ]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # Перевіряє rev у токені, тож logout одразу відкликає access.
        'users.authentication.RevisionJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 48,
    # drf-spectacular будує /api/schema/ з цих вʼю.
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Swagger: /api/docs/  ·  ReDoc: /api/redoc/  ·  схема: /api/schema/
SPECTACULAR_SETTINGS = {
    'TITLE': 'Черемшина API',
    'DESCRIPTION': (
        'Контракт гастроному «Черемшина»: здоровʼя сервісу, автентифікація, '
        'каталог, замовлення та акції. Захищені маршрути — заголовок '
        'Authorization: Bearer <access>. Поле token у відповіді login/register '
        'є аліасом access.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': r'/api',
}

# Короткий access (5 хв за замовчуванням simplejwt) ламав би кабінет.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'AUTH_HEADER_TYPES': ('Bearer',),
}