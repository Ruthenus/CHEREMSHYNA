import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
    const { user, loading, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const destination = ['/order', '/cabinet', '/profile'].includes(
        location.state?.from,
    )
        ? location.state.from
        : '/cabinet';
    const [pending, setPending] = useState(false);
    const [form, setForm] = useState({
        email: '',
        password: '',
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

    async function handleSubmit(event) {
        event.preventDefault();
        if (pending) return;
        setError('');

        if (!form.email) {
            setError('Введіть email');
            return;
        }

        if (!form.password) {
            setError('Введіть пароль');
            return;
        }

        setPending(true);
        const result = await login(form);
        setPending(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }

        navigate(destination, { replace: true });
    }

    function handleChange(event) {
        const { name, value } = event.target;

        setForm({
            ...form,
            [name]: value,
        });
    }

    return (
        <div className="auth-page">
            <div className="auth-visual">
                <p className="auth-visual-badge">Особистий кабінет</p>
                <h2 className="auth-visual-title">
                    ГАСТРОНОМ
                    <span>«Черемшина»</span>
                </h2>
                <p className="auth-visual-text">
                    Увійдіть, щоб бачити історію замовлень, зберігати улюблені
                    смаки та отримувати знижку на день народження.
                </p>
            </div>

            <div className="auth-panel">
                <div className="auth-window">
                    <p className="auth-eyebrow">Вхід до кабінету</p>
                    <h1 className="auth-heading">Вхід</h1>
                    <p className="auth-switch">
                        Немає акаунта?{' '}
                        <Link to="/register" state={{ from: destination }}>
                            Зареєструватись
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

                        <label className="auth-label" htmlFor="login-email">
                            Email
                        </label>
                        <input
                            id="login-email"
                            className="auth-input"
                            type="email"
                            name="email"
                            placeholder="Електронна пошта"
                            value={form.email}
                            onChange={handleChange}
                        />

                        <label className="auth-label" htmlFor="login-password">
                            Пароль
                        </label>
                        <input
                            id="login-password"
                            className="auth-input"
                            type="password"
                            name="password"
                            placeholder="Пароль"
                            value={form.password}
                            onChange={handleChange}
                        />

                        <button
                            className="auth-submit"
                            disabled={pending}
                            type="submit"
                        >
                            Увійти
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
