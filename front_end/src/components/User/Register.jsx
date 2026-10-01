import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Register() {
    const { user, loading, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const destination = ['/order', '/cabinet', '/profile'].includes(
        location.state?.from,
    )
        ? location.state.from
        : '/cabinet';
    const [pending, setPending] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        repeatPassword: '',
    });

    const [error, setError] = useState('');

    if (loading)
        return (
            <main className="auth-page" role="status">
                Завантаження…
            </main>
        );
    if (user) {
        return <Navigate to={destination} replace />;
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm({
            ...form,
            [name]: value,
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (pending) return;
        setError('');

        if (!form.name) {
            setError("Введіть ім'я та прізвище");
            return;
        }

        if (!form.email.includes('@')) {
            setError('Введіть правильний email');
            return;
        }

        if (!form.phone) {
            setError('Введіть телефон');
            return;
        }

        if (form.password.length < 6) {
            setError('Пароль має містити мінімум 6 символів');
            return;
        }

        if (form.password !== form.repeatPassword) {
            setError('Паролі не збігаються');
            return;
        }

        setPending(true);
        const result = await register({
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone,
        });

        setPending(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }

        navigate(destination, { replace: true });
    }

    return (
        <div className="auth-page">
            <div className="auth-visual">
                <p className="auth-visual-badge">Новий клієнт</p>

                <h2 className="auth-visual-title">
                    ГАСТРОНОМ
                    <span>«Черемшина»</span>
                </h2>

                <p className="auth-visual-text">
                    Створіть акаунт, щоб оформлювати замовлення швидше та
                    отримувати акції гастроному — від сирної п’ятниці до
                    подарунка на день народження.
                </p>
            </div>

            <div className="auth-panel">
                <div className="auth-window">
                    <p className="auth-eyebrow">Реєстрація</p>

                    <h1 className="auth-heading">Новий клієнт</h1>

                    <p className="auth-switch">
                        Вже є акаунт?{' '}
                        <Link to="/login" state={{ from: destination }}>
                            Увійти
                        </Link>
                    </p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {error && (
                            <div
                                className="alert alert-danger py-2"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <label className="auth-label" htmlFor="register-name">
                            Ім&apos;я та прізвище
                        </label>

                        <input
                            id="register-name"
                            className="auth-input"
                            type="text"
                            name="name"
                            placeholder="Іван Коваленко"
                            value={form.name}
                            onChange={handleChange}
                        />

                        <div className="auth-row">
                            <div className="auth-field">
                                <label
                                    className="auth-label"
                                    htmlFor="register-email"
                                >
                                    Email
                                </label>

                                <input
                                    id="register-email"
                                    className="auth-input"
                                    type="email"
                                    name="email"
                                    placeholder="Електронна пошта"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="auth-field">
                                <label
                                    className="auth-label"
                                    htmlFor="register-phone"
                                >
                                    Телефон
                                </label>

                                <input
                                    id="register-phone"
                                    className="auth-input"
                                    type="tel"
                                    name="phone"
                                    placeholder="+38 (050) 123-45-67"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <label
                            className="auth-label"
                            htmlFor="register-password"
                        >
                            Пароль
                        </label>

                        <input
                            id="register-password"
                            className="auth-input"
                            type="password"
                            name="password"
                            placeholder="Мінімум 6 символів"
                            value={form.password}
                            onChange={handleChange}
                        />

                        <label
                            className="auth-label"
                            htmlFor="register-repeat-password"
                        >
                            Повторіть пароль
                        </label>

                        <input
                            id="register-repeat-password"
                            className="auth-input"
                            type="password"
                            name="repeatPassword"
                            placeholder="Ще раз пароль"
                            value={form.repeatPassword}
                            onChange={handleChange}
                        />

                        <button
                            className="auth-submit"
                            disabled={pending}
                            type="submit"
                        >
                            Зареєструватись
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
