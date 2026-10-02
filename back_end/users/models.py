from django.contrib.auth.models import AbstractUser, BaseUserManager, UserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('email необхідний')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    username = None
    email = models.EmailField(_('email'), unique=True)
    name = models.CharField(_('імʼя'), max_length=150)
    phone = models.CharField(_('телефон'), max_length=30, blank=True)
    city = models.CharField(_('місто'), max_length=100, blank=True)
    birthday = models.DateField(_('день народження'), null=True, blank=True)
    photo = models.URLField(blank=True, default='')

    PREFERENCE_CHOICES = [
        ('meat', "М'ясо та ковбаси"),
        ('smoked', 'Копченості'),
        ('cheese', 'Сири'),
        ('poultry', 'Птиця'),
        ('coffee', 'Кава та чай'),
        ('bread', 'Хліб та випічка'),
        ('sauces', 'Соуси та приправи'),
        ('vegetables', 'Овочі'),
    ]

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    objects = UserManager()

    class Meta:
        verbose_name = _('користувач')
        verbose_name_plural = _('користувачі')

    def __str__(self):
        return self.name or self.email

    @property
    def has_birthday_discount(self):
        if not self.birthday:
            return False
        from datetime import date
        from django.conf import settings
        window = getattr(settings, 'BIRTHDAY_DISCOUNT_WINDOW_DAYS', 7)
        today = date.today()
        try:
            bday = self.birthday.replace(year=today.year)
        except ValueError:
            bday = self.birthday.replace(year=today.year, day=28)
        return abs((bday - today).days) <= window

class UserPreference(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='preferences')
    tag = models.CharField(max_length=30, choices=User.PREFERENCE_CHOICES)

    class Meta:
        unique_together = ('user', 'tag')
        verbose_name = _('вподобання')
        verbose_name_plural = _('вподобання')

    def __str__(self):
        return f'{self.user} — {self.get_tag_display()}'