import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { previewOrder } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../App.css';

const money = (value) => `${value.toLocaleString('uk-UA')} ₴`;

export default function Order({ cart, setCart }) {
    const { user, loading } = useAuth();
    if (loading)
        return (
            <main className="order-page" role="status">
                Завантаження…
            </main>
        );
    return (
        <OrderForm
            // Після входу форма має підставити ім’я з профілю, 
            // а не лишити порожні поля гостя.
            key={user?.id || user?.email || 'guest'}
            cart={cart}
            setCart={setCart}
        />
    );
}
function OrderForm({ cart, setCart }) {
    const { user, addOrder } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [deliveryType, setDeliveryType] = useState('pickup');
    const [address, setAddress] = useState('');
    const [comment, setComment] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const [quote, setQuote] = useState(null);
    const total = cart.reduce(
        (sum, product) => sum + product.price * (product.quantity || 1),
        0,
    );
    // Сума на екрані — з /orders/preview/, якщо сервер відповів.
    // Інакше локальна ціна × кількість, без знижки.
    const payable = user && cart.length && quote ? quote.total : total;
    const discount = user && cart.length && quote ? quote.discount || 0 : 0;

    useEffect(() => {
        if (!user || !cart.length) return undefined;
        let cancelled = false;
        previewOrder(
            cart.map((item) => ({
                product_id: item.id,
                quantity: item.quantity || 1,
            })),
        )
            .then((data) => {
                if (!cancelled) setQuote(data);
            })
            .catch(() => {
                if (!cancelled) setQuote(null);
            });
        return () => {
            cancelled = true;
        };
    }, [user, cart]);

    async function handleSubmit(event) {
        event.preventDefault();
        if (pending) return;
        setError('');
        if (!user || !cart.length) return;
        if (
            !name.trim() ||
            !/^[+\d\s().-]+$/.test(phone) ||
            phone.replace(/\D/g, '').length < 10 ||
            phone.replace(/\D/g, '').length > 15
            // Ті самі 10–15 цифр, що в OrderCreateSerializer.
            // Пробіли й дужки не рахуються.
        ) {
            setError(
                'Вкажіть ім’я та коректний номер телефону ' +
                '(щонайменше 10 цифр).',
            );
            return;
        }
        if (deliveryType === 'delivery' && !address.trim()) {
            setError('Вкажіть адресу доставки.');
            return;
        }
        try {
            setPending(true);
            await addOrder(cart, {
                name: name.trim(),
                phone: phone.trim(),
                deliveryType,
                // Окремого поля адреси в контракті немає.
                // Адреса доставки їде в коментарі, з префіксом.
                comment: [
                    deliveryType === 'delivery'
                        ? 'Адреса доставки: ' + address.trim()
                        : '',
                    comment.trim(),
                ]
                    .filter(Boolean)
                    .join('\n'),
            });
            setCart([]);
            setSuccess(true);
        } catch (error) {
            setError(error.message);
        } finally {
            setPending(false);
        }
    }

    return (
        <main className="order-page">
            <div className="order-container">
                <p className="order-eyebrow">Оформлення</p>
                <h1 className="order-title">
                    {success ? 'Дякуємо за замовлення!' : 'Оформити замовлення'}
                </h1>
                {success ? (
                    <section className="order-state" aria-live="polite">
                        <div className="order-success-icon" aria-hidden="true">
                            ✓
                        </div>
                        <h2>Замовлення прийнято</h2>
                        <p>
                            Ми зв’яжемося з вами найближчим часом для
                            підтвердження.
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
                        <p>Ваші товари залишаться в кошику під час переходу.</p>
                        <Link
                            className="order-submit"
                            to="/login"
                            state={{ from: '/order' }}
                        >
                            Увійти
                        </Link>
                        <Link className="order-back" to="/cart">
                            ← Змінити кошик
                        </Link>
                    </section>
                ) : (
                    <div className="order-layout">
                        <form className="order-form" onSubmit={handleSubmit}>
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
                            {deliveryType === 'delivery' && (
                                <div>
                                    <label
                                        className="order-label"
                                        htmlFor="order-address"
                                    >
                                        Адреса доставки *
                                    </label>
                                    <input
                                        id="order-address"
                                        required
                                        autoComplete="street-address"
                                        value={address}
                                        onChange={(event) =>
                                            setAddress(event.target.value)
                                        }
                                    />
                                </div>
                            )}
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
                            <button
                                className="order-submit"
                                type="submit"
                                disabled={pending}
                            >
                                Підтвердити замовлення
                            </button>
                        </form>
                        <aside
                            className="order-summary"
                            aria-labelledby="order-summary-title"
                        >
                            <h2 id="order-summary-title">Ваше замовлення</h2>
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
                                                (product.quantity || 1),
                                            )}
                                        </strong>
                                    </li>
                                ))}
                            </ul>
                            <div className="order-total">
                                <span>{discount > 0 ? 'До сплати:' : 'Разом:'}</span>
                                <strong>{money(payable)}</strong>
                            </div>
                            {discount > 0 && (
                                <p className="order-back">
                                    Знижка −{money(discount)} вже врахована
                                    сервером
                                    {quote?.subtotal != null
                                        ? ` (було ${money(quote.subtotal)})`
                                        : ''}
                                    .
                                </p>
                            )}
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
