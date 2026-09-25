import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    function handleSubmit(event) {
        event.preventDefault();

        if (!form.email) {
            alert('Введіть email');
            return;
        }

        if (!form.password) {
            alert('Введіть пароль');
            return;
        }

        alert('Вхід успішний !');
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
                    Увійдіть, щоб бачити історію замовлень, зберігати улюблені смаки
                    та отримувати знижку на день народження.
                </p>
            </div>

            <div className="auth-panel">
                <div className="auth-window">
                    <p className="auth-eyebrow">Вхід до кабінету</p>
                    <h1 className="auth-heading">Вхід</h1>
                    <p className="auth-switch">
                        Немає акаунта? <Link to="/register">Зареєструватись</Link>
                    </p>

                    <form className="auth-form" onSubmit={handleSubmit}>
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

                        <button className="auth-submit" type="submit">
                            Увійти
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
