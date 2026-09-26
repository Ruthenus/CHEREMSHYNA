import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../App.css';

const money = (value) => `${value.toLocaleString('uk-UA')} ₴`;

export default function Order({ cart, setCart }) {
    const { user, addOrder } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [deliveryType, setDeliveryType] = useState('pickup');
    const [comment, setComment] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const total = cart.reduce(
        (sum, product) => sum + product.price * (product.quantity || 1),
        0
    );

    function handleSubmit(event) {
        event.preventDefault();
        setError('');
        if (!user || !cart.length) return;
        if (!name.trim() || phone.replace(/\D/g, '').length < 10) {
            setError(
                'Вкажіть ім’я та коректний номер телефону ' +
                '(щонайменше 10 цифр).'
            );
            return;
        }
        try {
            addOrder(cart, {
                name: name.trim(),
                phone: phone.trim(),
                deliveryType,
                comment: comment.trim(),
            });
            setCart([]);
            setSuccess(true);
        } catch {
            setError('Не вдалося зберегти замовлення. Спробуйте ще раз.');
        }
    }

    return (
        <main className="order-page">
            <div className="order-container">
                <p className="order-eyebrow">Оформлення</p>
                <h1 className="order-title">
                    {success
                        ? 'Дякуємо за замовлення!'
                        : 'Оформити замовлення'}
                </h1>
                {success ? (
                    <section className="order-state" aria-live="polite">
                        <div
                            className="order-success-icon"
                            aria-hidden="true"
                        >
                            ✓
                        </div>
                        <h2>Замовлення прийнято</h2>
                        <p>
                            Ми зв’яжемося з вами найближчим часом
                            для підтвердження.
                        </p>
                        <Link className="order-submit" to="/#products">
                            Нове замовлення
                        </Link>
                    </section>
                ) : !cart.length ? (
                    <section className="order-state">
                        <h2>Ваш кошик порожній</h2>
                        <p>Оберіть товари, щоб оформити замовлення.</p>
                        <Link className="order-submit" to="/#products">
                            До продукції
                        </Link>
                    </section>
                ) : !user ? (
                    <section className="order-state">
                        <h2>Увійдіть, щоб оформити замовлення</h2>
                        <p>
                            Ваші товари залишаться в кошику під час переходу.
                        </p>
                        <Link className="order-submit" to="/login">
                            Увійти
                        </Link>
                        <Link className="order-back" to="/cart">
                            ← Змінити кошик
                        </Link>
                    </section>
                ) : (
                    <div className="order-layout">
                        <form
                            className="order-form"
                            onSubmit={handleSubmit}
                        >
                            <div>
                                <label
                                    className="order-label"
                                    htmlFor="order-name"
                                >
                                    Ваше ім’я *
                                </label>
                                <input
                                    id="order-name"
                                    name="name"
                                    autoComplete="name"
                                    required
                                    placeholder="Ім’я та прізвище"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                />
                            </div>
                            <div>
                                <label
                                    className="order-label"
                                    htmlFor="order-phone"
                                >
                                    Телефон *
                                </label>
                                <input
                                    id="order-phone"
                                    name="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    placeholder="+38 (___) ___-__-__"
                                    value={phone}
                                    onChange={(event) =>
                                        setPhone(event.target.value)
                                    }
                                />
                            </div>
                            <fieldset className="order-delivery">
                                <legend className="order-label">
                                    Спосіб отримання
                                </legend>
                                <div className="order-delivery-options">
                                    {[
                                        ['pickup', 'Самовивіз'],
                                        ['delivery', 'Доставка'],
                                    ].map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={
                                                deliveryType === value
                                            }
                                            className={
                                                deliveryType === value
                                                    ? 'is-selected'
                                                    : ''
                                            }
                                            onClick={() =>
                                                setDeliveryType(value)
                                            }
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                            <div>
                                <label
                                    className="order-label"
                                    htmlFor="order-comment"
                                >
                                    Коментар
                                </label>
                                <textarea
                                    id="order-comment"
                                    name="comment"
                                    rows="3"
                                    placeholder={
                                        'Особливі побажання, час доставки...'
                                    }
                                    value={comment}
                                    onChange={(event) =>
                                        setComment(event.target.value)
                                    }
                                />
                            </div>
                            {error && (
                                <p className="order-error" role="alert">
                                    {error}
                                </p>
                            )}
                            <button className="order-submit" type="submit">
                                Підтвердити замовлення
                            </button>
                        </form>
                        <aside
                            className="order-summary"
                            aria-labelledby="order-summary-title"
                        >
                            <h2 id="order-summary-title">
                                Ваше замовлення
                            </h2>
                            <ul className="order-items">
                                {cart.map((product) => (
                                    <li key={product.id}>
                                        <span>
                                            {product.name} ×
                                            {product.quantity || 1}
                                        </span>
                                        <strong>
                                            {money(
                                                product.price *
                                                (product.quantity || 1)
                                            )}
                                        </strong>
                                    </li>
                                ))}
                            </ul>
                            <div className="order-total">
                                <span>Разом:</span>
                                <strong>{money(total)}</strong>
                            </div>
                            <Link className="order-back" to="/cart">
                                ← Змінити кошик
                            </Link>
                        </aside>
                    </div>
                )}
            </div>
        </main>
    );
}
