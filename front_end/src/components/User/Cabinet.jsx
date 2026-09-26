import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function formatDate(value) {
    return new Date(value).toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function Cabinet() {
    const { user, orders, updateProfile } = useAuth();
    const [tab, setTab] = useState('orders');
    const [name, setName] = useState(user?.name || '');

    if (!user) {
        return <Navigate to="/" replace />;
    }

    const firstName = user.name.trim().split(' ')[0];

    function handleSaveProfile(event) {
        event.preventDefault();

        if (!name.trim()) return;

        updateProfile({
            name: name.trim(),
        });
    }

    return (
        <div className="cabinet-page">
            <div className="container py-5">

                <p className="cabinet-eyebrow">
                    Особистий кабінет
                </p>

                <h1 className="cabinet-title">
                    Вітаємо, {firstName}!
                </h1>

                <ul className="nav nav-tabs cabinet-tabs mb-4">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === 'orders' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setTab('orders')}
                        >
                            Замовлення
                        </button>
                    </li>

                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === 'profile' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setTab('profile')}
                        >
                            Мій профіль
                        </button>
                    </li>

                    <li className="nav-item">
                        <button
                            className={`nav-link ${tab === 'promo' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setTab('promo')}
                        >
                            Акції
                        </button>
                    </li>
                </ul>

                {tab === 'orders' && (
                    <div className="cabinet-card">
                        {orders.length === 0 ? (
                            <p className="cabinet-empty mb-0">
                                Поки що немає замовлень. Оформіть перше в каталозі.
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
                                                        {item.name} × {item.qty}
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
                    <div className="cabinet-card p-4">
                        <form
                            className="row g-4"
                            onSubmit={handleSaveProfile}
                        >
                            <div className="col-md-6">
                                <label
                                    className="form-label"
                                    htmlFor="cabinet-name"
                                >
                                    Ім&apos;я
                                </label>

                                <input
                                    id="cabinet-name"
                                    className="form-control"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                />
                            </div>

                            <div className="col-md-6">
                                <label
                                    className="form-label"
                                    htmlFor="cabinet-email"
                                >
                                    Email
                                </label>

                                <input
                                    id="cabinet-email"
                                    className="form-control"
                                    value={user.email}
                                    disabled
                                />
                            </div>

                            <div className="col-md-6">
                                <label
                                    className="form-label"
                                    htmlFor="cabinet-phone"
                                >
                                    Телефон
                                </label>

                                <input
                                    id="cabinet-phone"
                                    className="form-control"
                                    value={user.phone}
                                    disabled
                                />
                            </div>

                            <div className="col-12">
                                <button
                                    className="btn btn-order"
                                    type="submit"
                                >
                                    Зберегти профіль
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {tab === 'promo' && (
                    <div className="cabinet-card p-4">
                        <h2 className="h5 mb-3">
                            Акції для вас
                        </h2>

                        <p className="cabinet-muted mb-0">
                            Знижка на день народження та сирна п’ятниця
                            з’являться тут після підтвердження профілю.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}