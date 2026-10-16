"""Реєстрація, вхід, профіль, вихід і оновлення токена."""
from datetime import date

from rest_framework.test import APITestCase

from users.models import UserPreference
from .helpers import PASSWORD, User, login_client, make_user, today_is


class RegisterTests(APITestCase):
    """POST /api/auth/register/."""

    def test_register_returns_user_and_tokens(self):
        """201: user, access, refresh і аліас token."""
        r = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Олена',
                'email': 'olena@example.com',
                'phone': '+380501234567',
                'password': PASSWORD,
            },
            format='json',
        )
        self.assertEqual(r.status_code, 201)
        for key in ('user', 'access', 'refresh', 'token'):
            self.assertIn(key, r.data)
        # Фронтенд читає і access, і старий ключ token.
        self.assertEqual(r.data['token'], r.data['access'])
        self.assertEqual(r.data['user']['email'], 'olena@example.com')

    def test_register_response_does_not_leak_secrets(self):
        """У user немає пароля і лічильника auth_revision."""
        r = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Олена',
                'email': 'o@example.com',
                'password': PASSWORD,
            },
            format='json',
        )
        self.assertNotIn('password', r.data['user'])
        self.assertNotIn('auth_revision', r.data['user'])

    def test_phone_is_optional_for_api(self):
        """Телефон у моделі порожній рядок, для API не обов'язковий."""
        r = self.client.post(
            '/api/auth/register/',
            {
                'name': 'Олена',
                'email': 'o@example.com',
                'password': PASSWORD,
            },
            format='json',
        )
        self.assertEqual(r.status_code, 201)

    def test_duplicate_email_is_case_insensitive(self):
        """Той самий email іншим регістром — 400 на полі email."""
        make_user('ivan@example.com')
        r = self.client.post(
            '/api/auth/register/',
            {
                'name': 'X',
                'email': 'IVAN@example.com',
                'password': PASSWORD,
            },
            format='json',
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn('email', r.data)

    def test_weak_passwords_rejected(self):
        """Короткий, числовий і занадто поширений пароль."""
        for bad in ('password', '123456', '12345678', 'abc'):
            with self.subTest(password=bad):
                r = self.client.post(
                    '/api/auth/register/',
                    {
                        'name': 'X',
                        'email': f'{bad}@example.com',
                        'password': bad,
                    },
                    format='json',
                )
                self.assertEqual(r.status_code, 400)
                self.assertIn('password', r.data)

    def test_missing_required_fields(self):
        """Без name, email і password реєстрація не проходить."""
        r = self.client.post('/api/auth/register/', {}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertTrue({'name', 'email', 'password'} <= set(r.data))


class LoginTests(APITestCase):
    """POST /api/auth/login/. Відповіді не розрізняють email."""

    def setUp(self):
        make_user('Ivan@example.com')

    def test_login_ok(self):
        """200 і ім'я з профілю, не з тіла запиту."""
        r = self.client.post(
            '/api/auth/login/',
            {'email': 'Ivan@example.com', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['user']['name'], 'Іван Коваленко')

    def test_login_email_case_insensitive(self):
        """Регістр email не важливий: порівняння через iexact."""
        r = self.client.post(
            '/api/auth/login/',
            {'email': 'ivan@EXAMPLE.com', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(r.status_code, 200)

    def test_login_wrong_password(self):
        """401 і поле detail, без підказки «пароль не той»."""
        r = self.client.post(
            '/api/auth/login/',
            {'email': 'ivan@example.com', 'password': 'wrong'},
            format='json',
        )
        self.assertEqual(r.status_code, 401)
        self.assertIn('detail', r.data)

    def test_login_unknown_user(self):
        """Невідомий email теж 401, не 404."""
        r = self.client.post(
            '/api/auth/login/',
            {'email': 'nobody@example.com', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(r.status_code, 401)

    def test_inactive_user_cannot_login(self):
        """is_active=False: бекенд не видає токен."""
        User.objects.filter(email__iexact='ivan@example.com').update(
            is_active=False,
        )
        r = self.client.post(
            '/api/auth/login/',
            {'email': 'ivan@example.com', 'password': PASSWORD},
            format='json',
        )
        self.assertEqual(r.status_code, 401)


class ProfileTests(APITestCase):
    """GET і PATCH /api/auth/me/. Email лише для читання."""

    def setUp(self):
        self.user = make_user()
        login_client(self.client)

    def test_me_requires_auth(self):
        """Без заголовка Authorization — 401."""
        self.client.credentials()
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_garbage_token_rejected(self):
        """Зіпсований JWT не відкриває профіль."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer not.a.token')
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_get_me_returns_user_object(self):
        """Порожні вподобання і знижка вимкнена, поки немає дати."""
        r = self.client.get('/api/auth/me/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['email'], 'ivan@example.com')
        self.assertEqual(r.data['preferences'], [])
        self.assertIs(r.data['has_birthday_discount'], False)

    def test_patch_profile_and_preferences(self):
        """Підписи кабінету зберігаються як ключі meat/cheese."""
        r = self.client.patch(
            '/api/auth/me/',
            {
                'name': 'Іван',
                'phone': '+380501112233',
                'city': 'Коломия',
                'birthday': '1990-05-17',
                'preference_tags': ['Сири', 'М’ясо та ковбаси'],
            },
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['city'], 'Коломия')
        # Порядок як у формі кабінету, не як у тілі PATCH.
        self.assertEqual(
            r.data['preferences'],
            ['М’ясо та ковбаси', 'Сири'],
        )
        tags = UserPreference.objects.filter(user=self.user)
        self.assertEqual(
            set(tags.values_list('tag', flat=True)),
            {'meat', 'cheese'},
        )

    def test_preferences_accept_service_keys_and_replace_old_ones(self):
        """Новий список замінює старий, а не дописується."""
        self.client.patch(
            '/api/auth/me/',
            {'preference_tags': ['meat', 'cheese']},
            format='json',
        )
        r = self.client.patch(
            '/api/auth/me/',
            {'preference_tags': ['coffee']},
            format='json',
        )
        self.assertEqual(r.data['preferences'], ['Кава та чай'])

    def test_unknown_preference_rejected(self):
        """Невідомий підпис не пишеться в базу."""
        r = self.client.patch(
            '/api/auth/me/',
            {'preference_tags': ['піца']},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_empty_phone_erases_number(self):
        """Порожній рядок стирає телефон, не лишає старий."""
        self.client.patch(
            '/api/auth/me/',
            {'phone': '+380501112233'},
            format='json',
        )
        r = self.client.patch(
            '/api/auth/me/',
            {'phone': ''},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['phone'], '')

    def test_email_is_read_only(self):
        """PATCH email ігнорується: логін лишається тим самим."""
        self.client.patch(
            '/api/auth/me/',
            {'email': 'hacker@example.com'},
            format='json',
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'ivan@example.com')

    def test_blank_name_rejected(self):
        """Порожнє ім'я не проходить валідатор моделі."""
        r = self.client.patch(
            '/api/auth/me/',
            {'name': ''},
            format='json',
        )
        self.assertEqual(r.status_code, 400)

    def test_invalid_birthday_rejected(self):
        """Дата не у форматі ISO — 400, не 500."""
        r = self.client.patch(
            '/api/auth/me/',
            {'birthday': '32-13-2000'},
            format='json',
        )
        self.assertEqual(r.status_code, 400)


class LogoutTests(APITestCase):
    """POST /api/auth/logout/ одразу гасить поточний access."""

    def test_logout_revokes_access_token_immediately(self):
        """Після виходу той самий Bearer більше не відкриває /me/."""
        make_user()
        tokens = login_client(self.client)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)
        r = self.client.post(
            '/api/auth/logout/',
            {'refresh': tokens['refresh']},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data, {'detail': 'ok'})
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 401)

    def test_logout_without_refresh_still_works(self):
        """Без refresh у тілі вихід усе одно 200: росте rev."""
        make_user()
        login_client(self.client)
        r = self.client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(r.status_code, 200)

    def test_logout_requires_auth(self):
        """Анонім не може викликати вихід."""
        r = self.client.post('/api/auth/logout/', {}, format='json')
        self.assertEqual(r.status_code, 401)

    def test_new_login_after_logout_works(self):
        """Новий логін отримує новий rev і знову бачить /me/."""
        make_user()
        login_client(self.client)
        self.client.post('/api/auth/logout/', {}, format='json')
        self.client.credentials()
        login_client(self.client)
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)


class BirthdayDiscountTests(APITestCase):
    """Вікно ±7 днів. Перевірка на моделі, без HTTP."""

    def _user(self, birthday):
        """Користувач лише з датою народження."""
        return make_user(birthday=birthday)

    def test_inside_window(self):
        """За три дні до іменин знижка вже є."""
        user = self._user(date(1990, 10, 10))
        with today_is(date(2026, 10, 7)):
            self.assertTrue(user.has_birthday_discount)

    def test_outside_window(self):
        """Далі ніж за тиждень знижки немає."""
        user = self._user(date(1990, 10, 30))
        with today_is(date(2026, 10, 7)):
            self.assertFalse(user.has_birthday_discount)

    def test_no_birthday(self):
        """Порожня дата — знижка вимкнена."""
        self.assertFalse(make_user().has_birthday_discount)

    def test_new_year_wraparound(self):
        """31 грудня і 1 січня входять в одне вікно."""
        user = self._user(date(1990, 12, 31))
        with today_is(date(2027, 1, 1)):
            self.assertTrue(user.has_birthday_discount)

    def test_leap_day_birthday_in_common_year(self):
        """29 лютого у звичайному році лишається у вікні."""
        user = self._user(date(2000, 2, 29))
        with today_is(date(2027, 3, 1)):
            self.assertTrue(user.has_birthday_discount)


class RefreshTokenTests(APITestCase):
    """POST /api/auth/refresh/. Фронтенд так продовжує сесію."""

    def setUp(self):
        make_user()
        self.tokens = login_client(self.client)
        # Далі кожен тест сам ставить заголовок, якщо він потрібен.
        self.client.credentials()

    def test_refresh_returns_working_access(self):
        """Новий access відкриває /me/."""
        r = self.client.post(
            '/api/auth/refresh/',
            {'refresh': self.tokens['refresh']},
            format='json',
        )
        self.assertEqual(r.status_code, 200)
        self.client.credentials(
            HTTP_AUTHORIZATION='Bearer ' + r.data['access'],
        )
        self.assertEqual(self.client.get('/api/auth/me/').status_code, 200)

    def test_refresh_rejects_garbage_and_access_token(self):
        """Ані сміття, ані access замість refresh не оновлюють сесію."""
        junk = self.client.post(
            '/api/auth/refresh/',
            {'refresh': 'zzz'},
            format='json',
        )
        access = self.client.post(
            '/api/auth/refresh/',
            {'refresh': self.tokens['access']},
            format='json',
        )
        self.assertEqual(junk.status_code, 401)
        self.assertEqual(access.status_code, 401)

    def test_refresh_works_even_with_stale_bearer_header(self):
        """Тіло refresh важливіше за зіпсований Bearer у заголовку."""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer expired.garbage')
        r = self.client.post(
            '/api/auth/refresh/',
            {'refresh': self.tokens['refresh']},
            format='json',
        )
        self.assertEqual(r.status_code, 200)

    def test_after_logout_refresh_cannot_revive_session(self):
        """Переданий refresh потрапляє в blacklist."""
        self.client.credentials(
            HTTP_AUTHORIZATION='Bearer ' + self.tokens['access'],
        )
        self.client.post(
            '/api/auth/logout/',
            {'refresh': self.tokens['refresh']},
            format='json',
        )
        self.client.credentials()
        r = self.client.post(
            '/api/auth/refresh/',
            {'refresh': self.tokens['refresh']},
            format='json',
        )
        self.assertEqual(r.status_code, 401)

    def test_after_logout_without_blacklist_new_access_is_still_revoked(self):
        """Без refresh у logout токен живий, але rev уже старий."""
        self.client.credentials(
            HTTP_AUTHORIZATION='Bearer ' + self.tokens['access'],
        )
        self.client.post('/api/auth/logout/', {}, format='json')
        self.client.credentials()
        r = self.client.post(
            '/api/auth/refresh/',
            {'refresh': self.tokens['refresh']},
            format='json',
        )
        # Формально 200, та новий access не проходить /me/.
        if r.status_code == 200:
            self.client.credentials(
                HTTP_AUTHORIZATION='Bearer ' + r.data['access'],
            )
            self.assertEqual(
                self.client.get('/api/auth/me/').status_code,
                401,
            )
