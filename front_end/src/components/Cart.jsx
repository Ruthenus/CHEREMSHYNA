import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// unit з каталогу — це підпис ціни «₴/кг», «₴/л», «₴/банка».
// Раніше все, де немає «кг», показувалось як «шт» (сік, банка, пучок).
function saleUnit(unit) {
    if (!unit) return 'шт';
    const cleaned = String(unit).replace(/^₴\s*\/?\s*/, '').trim();
    return cleaned || 'шт';
}

// Старий кошик у localStorage має лише slug.
const CATEGORY_LABELS = {
    sausages: 'Ковбаси',
    smoked: 'Копченості',
    poultry: 'Птиця',
    pork: 'Свинина',
    cheeses: 'Сири',
    butter: 'Масло та жири',
    bakery: 'Хліб і випічка',
    drinks: 'Соки та напої',
    sauces: 'Соуси та приправи',
    canned: 'Консерви та мариновані',
    coffee: 'Кава та чай',
    veggies: 'Свіжі овочі',
};

// Спочатку підпис із товару, далі словник за slug.
// Старий кошик міг зберегти лише slug, без categoryLabel.
function categoryTitle(product) {
    return (
        product.categoryLabel ||
        CATEGORY_LABELS[product.category] ||
        product.category ||
        ''
    );
}

export default function Cart({ cart, setCart }) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const total = cart.reduce((sum, product) => {
        return sum + product.price * (product.quantity || 1);
    }, 0);

    // Без сесії ведемо на вхід і пам’ятаємо, що повертатись треба на /order,
    // а не на кошик.
    function handleCheckout() {
        if (!user) {
            navigate('/login', { state: { from: '/order' } });
            return;
        }

        navigate('/order');
    }
    function increaseQuantityIndex(index) {
        setCart((prevCart) =>
            prevCart.map((product, i) => {
                if (i !== index) return product;
                // Та сама стеля, що в OrderItemWriteSerializer: 
                // 99 і не більше залишку.
                const current = product.quantity || 1;
                const stockCap =
                    typeof product.stock === 'number' ? product.stock : 99;
                const cap = Math.min(99, stockCap);
                if (current >= cap) return product;
                return { ...product, quantity: current + 1 };
            }),
        );
    }

    // Нуль і менше не лишаємо в кошику: рядок зникає, 
    // окрема кнопка видалення не потрібна.
    function decreaseQuantityIndex(index) {
        setCart((prevCart) =>
            prevCart
                .map((product, i) => {
                    if (i !== index) return product;

                    const quantity = product.quantity || 1;

                    return {
                        ...product,
                        quantity: quantity - 1,
                    };
                })
                .filter((product) => product.quantity > 0),
        );
    }

    function removeQuantityIndex(index) {
        setCart((prevCart) => prevCart.filter((product, i) => i !== index));
    }

    if (cart.length === 0) {
        return (
            <main className="cart-page cart-page-empty">
                <div className="cart-empty-state">
                    <div className="cart-empty-icon" aria-hidden="true">
                        🛒
                    </div>
                    <h1>Кошик порожній</h1>
                    <p>Додайте товари зі сторінки продукції</p>
                    <Link to="/#products" className="cart-empty-link">
                        До продукції
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <div className="cart-page">
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1>Кошик</h1>

                    {cart.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => setCart([])}
                        >
                            Очистити кошик
                        </button>
                    )}
                </div>

                {cart.length === 0 ? (
                    <p>Ваш кошик порожній</p>
                ) : (
                    <div className="row g-4">
                        <div className="col-lg-8">
                            {cart.map((product, index) => (
                                <div className="card mb-3" key={index}>
                                    <div className="card-body d-flex justify-content-between align-items-center">
                                        <div>
                                            <small className="text-uppercase">
                                                {categoryTitle(product)}
                                            </small>

                                            <h5 className="card-title">
                                                {product.name}
                                            </h5>

                                            <p className="card-text">
                                                {/* було «189 ₴ 2 = 378 ₴» без знака множення */}
                                                {product.price} ₴{' × '}
                                                {product.quantity || 1}
                                                {' = '}
                                                {product.price *
                                                    (product.quantity ||
                                                        1)}{' '}
                                                ₴
                                            </p>
                                        </div>

                                        <div className="d-flex align-items-center gap-2">
                                            <button
                                                className="btn quantity-btn"
                                                onClick={() =>
                                                    decreaseQuantityIndex(index)
                                                }
                                            >
                                                -
                                            </button>

                                            <span>
                                                {product.quantity || 1}{' '}
                                                {saleUnit(product.unit)}
                                            </span>

                                            <button
                                                className="btn quantity-btn"
                                                onClick={() =>
                                                    increaseQuantityIndex(index)
                                                }
                                            >
                                                +
                                            </button>

                                            <button
                                                className="btn btn-link"
                                                onClick={() =>
                                                    removeQuantityIndex(index)
                                                }
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="col-lg-4">
                            <div className="card">
                                <div className="card-body">
                                    <h4 className="card-title mb-4">
                                        Підсумок
                                    </h4>

                                    {cart.map((product, index) => (
                                        <div
                                            className="d-flex justify-content-between mb-3"
                                            key={index}
                                        >
                                            <span>
                                                {product.name} ×{' '}
                                                {product.quantity}
                                            </span>

                                            <strong>
                                                {product.price *
                                                    product.quantity}{' '}
                                                ₴
                                            </strong>
                                        </div>
                                    ))}

                                    <hr />

                                    <div className="d-flex justify-content-between align-items-center">
                                        <span>Разом:</span>

                                        <strong className="fs-4">
                                            {total} ₴
                                        </strong>
                                    </div>

                                    <button
                                        className="btn btn-primary w-100 mt-4"
                                        type="button"
                                        onClick={handleCheckout}
                                    >
                                        ОФОРМИТИ ЗАМОВЛЕННЯ
                                    </button>

                                    <p className="text-center mt-3 mb-0">
                                        <Link to="/" className="no-underline">
                                            ← Продовжити покупки
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
