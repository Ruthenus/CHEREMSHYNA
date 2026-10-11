import { useEffect, useState } from 'react';
import { errorMessage, getCategories, getProducts } from '../api.js';

// Локальний список лишився запасним, якщо Django не запущений.
// Живий каталог береться з GET /categories/ та GET /products/.
const fallbackCategories = [
    { id: 'sausages', category: 'sausages', label: 'Ковбаси', icon: '🌭' },
    { id: 'smoked', category: 'smoked', label: 'Копченості', icon: '🥓' },
    { id: 'poultry', category: 'poultry', label: 'Птиця', icon: '🍗' },
    { id: 'pork', category: 'pork', label: 'Свинина', icon: '🥩' },
    { id: 'cheeses', category: 'cheeses', label: 'Сири', icon: '🧀' },
    { id: 'butter', category: 'butter', label: 'Масло та жири', icon: '🧈' },
    { id: 'bakery', category: 'bakery', label: 'Хліб і випічка', icon: '🥖' },
    { id: 'drinks', category: 'drinks', label: 'Соки та напої', icon: '🧃' },
    { id: 'sauces', category: 'sauces', label: 'Соуси та приправи', icon: '🧂' },
    { id: 'canned', category: 'canned', label: 'Консерви та мариновані', icon: '🥫' },
    { id: 'coffee', category: 'coffee', label: 'Кава та чай', icon: '☕' },
    { id: 'veggies', category: 'veggies', label: 'Свіжі овочі', icon: '🥦' },
];


const fallbackProducts = [
    {
        id: 1,
        category: 'sausages',
        name: 'Ковбаса Черемшина',
        description: 'Домашня варено-копчена, з натуральної свинячої оболонки',
        price: 189,
        unit: '₴/кг',
    },
    {
        id: 2,
        category: 'sausages',
        name: 'Сардельки Класичні',
        description: 'Ніжна текстура, соковита начинка, натуральна оболонка',
        price: 145,
        unit: '₴/кг',
    },
    {
        id: 3,
        category: 'sausages',
        name: 'Сосиски Молочні',
        description: "М'які та соковиті, з добірної телятини",
        price: 162,
        unit: '₴/кг',
    },
    {
        id: 4,
        category: 'sausages',
        name: 'Домашня ковбаса',
        description:
            'Соковита свиняча ковбаса з часником та ароматними спеціями',
        price: 98,
        unit: '₴/кг',
    },
];

// API віддає stock. Товар з адмінки має stock=0 за замовчуванням,
// і будь-яке замовлення на нього сервер відхиляє. Не даємо додати його в кошик.
// Локальний приклад (без поля stock) цю перевірку не проходить і лишається як є.
const isSoldOut = (product) =>
    typeof product.stock === 'number' && product.stock <= 0;

export default function Products({ addToCart }) {
    const [categories, setCategories] = useState(fallbackCategories);
    const [products, setProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState('sausages');
    const [status, setStatus] = useState('Завантаження асортименту…');
    const [catalogOffline, setCatalogOffline] = useState(false);

    useEffect(() => {
        let cancelled = false;

        // Категорії й товари вантажимо разом. Якщо хоч один запит упав, показуємо 
        // локальний приклад і вимикаємо «Купити»: id 1–4 не ті, що в базі.
        async function loadCatalog() {
            try {
                const [remoteCategories, remoteProducts] = await Promise.all([
                    getCategories(),
                    getProducts(),
                ]);
                if (cancelled) return;
                if (remoteCategories.length) {
                    const nextCategories = remoteCategories.map((cat) => ({
                        id: cat.slug,
                        category: cat.slug,
                        label: cat.name,
                        icon: cat.icon || cat.emoji || '',
                    }));
                    setCategories(nextCategories);
                    // Якщо поточної вкладки немає в відповіді сервера, беремо першу.
                    // Інакше фільтр лишився б на sausages, а кнопок таких уже немає.
                    setActiveCategory((current) =>
                        nextCategories.some((cat) => cat.id === current)
                            ? current
                            : nextCategories[0].id,
                    );
                }
                setProducts(
                    remoteProducts.map((product) => ({
                        ...product,
                        // DRF віддає Decimal рядком. 
                        // Без Number сума в кошику стала б конкатенацією.
                        price: Number(product.price),
                    })),
                );
                setCatalogOffline(false);
                setStatus('');
            } catch (error) {
                if (cancelled) return;
                setCategories(fallbackCategories);
                setProducts(fallbackProducts);
                // id 1–4 локального прикладу збігаються не з тими товарами, 
                // що в базі.Купівля в цьому режимі замовила б інший товар.
                setCatalogOffline(true);
                setStatus(
                    'Каталог із сервера недоступний, показано локальний приклад. ' +
                    errorMessage(error),
                );
            }
        }

        loadCatalog();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredProducts = products.filter(
        (product) => product.category === activeCategory,
    );

    return (
        <div id="products" className="products">
            <div className="products-container">
                <div className="products-content">
                    <div className="products-badge">АСОРТИМЕНТ</div>

                    <h1 className="products-title">Наша продукція</h1>

                    <p className="products-description">
                        Понад 50 позицій власного виробництва та відібраних
                        делікатесів.
                    </p>

                    {status && (
                        <p className="products-description" role="status">
                            {status}
                        </p>
                    )}

                    <div className="products-list-section">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                className={`cat-btn ${activeCategory === cat.id ? 'active' : ''
                                    }`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                <span className="cat-icon">{cat.icon}</span>

                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="products-list">
                        {filteredProducts.map((product) => (
                            <div key={product.id} className="product-card">
                                <div className="card-image-wrapper">
                                    {product.image ? (
                                        <img
                                            className="card-image"
                                            src={product.image}
                                            alt={product.name}
                                        />
                                    ) : (
                                        <div className="card-image-placeholder" aria-hidden="true">
                                            <span className="card-image-emoji">
                                                    {categories.find((cat) =>
                                                        cat.id === product.category)?.icon || '🛒'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <span className="card-category">
                                    {
                                        categories.find(
                                            (cat) =>
                                                cat.id === product.category,
                                        )?.label
                                    }
                                </span>

                                <h3 className="card-title">{product.name}</h3>

                                <p className="card-description">
                                    {product.description}
                                </p>

                                <div className="card-footer">
                                    <div className="card-price">
                                        <span className="price-num">
                                            {product.price}
                                        </span>

                                        <span className="price-unit">
                                            {product.unit}
                                        </span>
                                    </div>

                                    <button
                                        className="btn-buy"
                                        disabled={
                                            catalogOffline || isSoldOut(product)
                                        }
                                        onClick={() =>
                                            addToCart({
                                                ...product,
                                                // У кошику була латиниця slug, не назва категорії.
                                                categoryLabel:
                                                    categories.find(
                                                        (cat) =>
                                                            cat.id ===
                                                            product.category,
                                                    )?.label || product.category,
                                            })
                                        }
                                    >
                                        {catalogOffline
                                            ? 'НЕМАЄ ЗВʼЯЗКУ'
                                            : isSoldOut(product)
                                                ? 'НЕМАЄ В НАЯВНОСТІ'
                                                : 'КУПИТИ'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
