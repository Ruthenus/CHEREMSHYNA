import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Footer from '../Footer.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

function formatDate(value) {
    return new Date(value).toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function Cabinet() {
    const { user, loading } = useAuth();
    if (loading)
        return (
            <main className="cabinet-page" role="status">
                Завантаження…
            </main>
        );
    if (!user)
        return <Navigate to="/login" state={{ from: '/cabinet' }} replace />;
    return <CabinetContent key={user.id || user.email} />;
}

function CabinetContent() {
    const { user, orders, ordersError, updateProfile, logout } = useAuth();
    const [tab, setTab] = useState('orders');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState(user?.city || '');
    const [birthday, setBirthday] = useState(user?.birthday || '');
    const [preferences, setPreferences] = useState(user?.preferences || []);
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');
    const [saveError, setSaveError] = useState('');

    if (!user) {
        return <Navigate to="/" replace />;
    }

    const firstName = user.name.trim().split(' ')[0];

    async function handleSaveProfile(event) {
        event.preventDefault();
        if (pending) return;
        setMessage('');
        setSaveError('');
        if (phone && !/^[+\d\s().-]{10,25}$/.test(phone)) {
            setSaveError('Перевірте номер телефону.');
            return;
        }
        setPending(true);
        try {
            await updateProfile({
                name: name.trim() || user.name,
                phone: phone.trim() || user.phone,
                city: city.trim(),
                birthday: birthday || null,
                preference_tags: preferences,
            });
            setMessage('Профіль збережено');
        } catch (error) {
            setSaveError(error.message);
        } finally {
            setPending(false);
        }
    }

    return (
        <>
            <main className="cabinet-page cabinet-reference">
                <div className="cabinet-container">
                    <p className="cabinet-eyebrow">Особистий кабінет</p>

                    <div className="cabinet-heading-row">
                        <h1 className="cabinet-title">Вітаємо, {firstName}!</h1>
                        <button
                            type="button"
                            className="cabinet-logout"
                            onClick={logout}
                        >
                            Вийти
                        </button>
                    </div>

                    <ul
                        className="nav nav-tabs cabinet-tabs"
                        aria-label="Розділи кабінету"
                    >
                        <li className="nav-item">
                            <button
                                className={`nav-link ${tab === 'orders' ? 'active' : ''}`}
                                type="button"
                                aria-pressed={tab === 'orders'}
                                onClick={() => setTab('orders')}
                            >
                                <span aria-hidden="true">📦</span> Замовлення
                            </button>
                        </li>

                        <li className="nav-item">
                            <button
                                className={`nav-link ${tab === 'profile' ? 'active' : ''}`}
                                type="button"
                                aria-pressed={tab === 'profile'}
                                onClick={() => setTab('profile')}
                            >
                                <span aria-hidden="true">👤</span> Мій профіль
                            </button>
                        </li>

                        <li className="nav-item">
                            <button
                                className={`nav-link ${tab === 'promo' ? 'active' : ''}`}
                                type="button"
                                aria-pressed={tab === 'promo'}
                                onClick={() => setTab('promo')}
                            >
                                <span aria-hidden="true">🏷️</span> Акції
                            </button>
                        </li>
                    </ul>

                    {tab === 'orders' && (
                        <div className="cabinet-card">
                            {ordersError ? (
                                <p role="alert">{ordersError}</p>
                            ) : orders.length === 0 ? (
                                <p className="cabinet-empty mb-0">
                                    Поки що немає замовлень. Оформіть перше в
                                    каталозі.
                                </p>
                            ) : (
                                orders.map((order, index) => (
                                    <div
                                        key={order.id}
                                        className={`cabinet-order ${
                                            index < orders.length - 1
                                                ? 'border-bottom'
                                                : ''
                                        }`}
                                    >
                                        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                            <div>
                                                <div className="d-flex align-items-baseline gap-2 flex-wrap">
                                                    <strong className="cabinet-order-id">
                                                        #{order.id}
                                                    </strong>

                                                    <span className="cabinet-order-date">
                                                        {formatDate(order.date)}
                                                    </span>
                                                </div>

                                                <div className="d-flex flex-wrap gap-2 mt-3">
                                                    {order.items.map((item) => (
                                                        <span
                                                            key={`${order.id}-${item.name}`}
                                                            className="cabinet-chip"
                                                        >
                                                            {item.name} ×{' '}
                                                            {item.qty}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <span className="cabinet-status">
                                                ● {order.status}
                                            </span>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center mt-4">
                                            <span className="cabinet-muted">
                                                Сума замовлення:
                                            </span>

                                            <strong className="cabinet-total">
                                                {order.total} ₴
                                            </strong>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === 'profile' && (
                        <form
                            className="cabinet-profile-grid"
                            onSubmit={handleSaveProfile}
                        >
                            <section className="cabinet-panel">
                                <h2>Особисті дані</h2>
                                <label htmlFor="cabinet-name">
                                    Ім’я та прізвище
                                </label>
                                <input
                                    id="cabinet-name"
                                    autoComplete="off"
                                    placeholder="Ім’я та прізвище"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                />
                                <label htmlFor="cabinet-phone">Телефон</label>
                                <input
                                    id="cabinet-phone"
                                    type="tel"
                                    autoComplete="off"
                                    placeholder="+38 (050) 123-45-67"
                                    value={phone}
                                    onChange={(event) =>
                                        setPhone(event.target.value)
                                    }
                                />
                                <label htmlFor="cabinet-city">Місто</label>
                                <input
                                    id="cabinet-city"
                                    autoComplete="address-level2"
                                    placeholder="Коломия"
                                    value={city}
                                    onChange={(event) =>
                                        setCity(event.target.value)
                                    }
                                />
                                <label htmlFor="cabinet-birthday">
                                    День народження
                                </label>
                                <input
                                    id="cabinet-birthday"
                                    type="date"
                                    max={new Date().toLocaleDateString('en-CA')}
                                    value={birthday}
                                    onChange={(event) =>
                                        setBirthday(event.target.value)
                                    }
                                />
                                {message && <p role="status">{message}</p>}
                                {saveError && <p role="alert">{saveError}</p>}
                                <button
                                    className="cabinet-save"
                                    type="submit"
                                    disabled={pending}
                                >
                                    {pending ? 'Збереження…' : 'Зберегти зміни'}
                                </button>
                            </section>
                            <section className="cabinet-panel">
                                <h2>Гастрономічні уподобання</h2>
                                <p>
                                    Оберіть категорії, що вас цікавлять — ми
                                    підберемо персональні пропозиції та акції.
                                </p>
                                <div className="cabinet-preferences">
                                    {[
                                        'М’ясо та ковбаси',
                                        'Копченості',
                                        'Сири',
                                        'Птиця',
                                        'Кава та чай',
                                        'Хліб та випічка',
                                        'Соуси та приправи',
                                        'Овочі',
                                    ].map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            aria-pressed={preferences.includes(
                                                tag,
                                            )}
                                            onClick={() => {
                                                setMessage('');
                                                setPreferences((previous) =>
                                                    previous.includes(tag)
                                                        ? previous.filter(
                                                              (value) =>
                                                                  value !== tag,
                                                          )
                                                        : [...previous, tag],
                                                );
                                            }}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                <div className="cabinet-recommendations">
                                    <h3>Рекомендуємо для вас</h3>
                                    <p>
                                        На основі ваших уподобань ми
                                        надсилатимемо персональні пропозиції та
                                        сповіщатимемо про нові надходження у
                                        обраних категоріях.
                                    </p>
                                </div>
                            </section>
                        </form>
                    )}

                    {tab === 'promo' && (
                        <section>
                            <p className="cabinet-promo-intro">
                                Акції доступні для зареєстрованих покупців.
                                Умови застосування знижок уточнюйте при
                                оформленні замовлення.
                            </p>
                            <div className="cabinet-promos-grid">
                                {[
                                    [
                                        '🎂',
                                        'Персональна',
                                        'birthday',
                                        'Знижка на день народження',
                                        '−15% на всі товари протягом тижня від вашого дня народження. Вкажіть дату у профілі.',
                                    ],
                                    [
                                        '🥩',
                                        'Постійним клієнтам',
                                        'regular',
                                        'М’ясний абонемент',
                                        'Щотижневе замовлення від 500 ₴ — знижка 7% на кожне замовлення місяця.',
                                    ],
                                    [
                                        '🧀',
                                        'Щотижнево',
                                        'weekly',
                                        'Сирна п’ятниця',
                                        'Кожну п’ятницю знижка 10% на всі сири. Замовляйте до 18:00.',
                                    ],
                                    [
                                        '☕',
                                        'Від 800 ₴',
                                        'gift',
                                        'Каву — у подарунок',
                                        'При замовленні від 800 ₴ — 100 г кави Арабіка у подарунок.',
                                    ],
                                ].map(
                                    ([
                                        icon,
                                        badge,
                                        kind,
                                        title,
                                        description,
                                    ]) => (
                                        <article
                                            className="cabinet-promo-card"
                                            key={kind}
                                        >
                                            <div className="cabinet-promo-top">
                                                <span aria-hidden="true">
                                                    {icon}
                                                </span>
                                                <span
                                                    className={
                                                        'cabinet-promo-badge ' +
                                                        kind
                                                    }
                                                >
                                                    {badge}
                                                </span>
                                            </div>
                                            <h2>{title}</h2>
                                            <p>{description}</p>
                                        </article>
                                    ),
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </main>
            <Footer compact />
        </>
    );
}
