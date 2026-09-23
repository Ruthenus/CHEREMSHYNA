import React, { useState } from 'react';

const categories = [
    { id: 'sausages', label: 'Ковбаси', icon: '🥖' },
    { id: 'smoked', label: 'Копченості', icon: '🥓' },
    { id: 'poultry', label: 'Птиця', icon: '🍗' },
    { id: 'pork', label: 'Свинина', icon: '🥩' },
    { id: 'cheeses', label: 'Сири', icon: '🧀' },
    { id: 'butter', label: 'Масло та жири', icon: '🧈' },
    { id: 'bakery', label: 'Хліб і випічка', icon: '🍞' },
    { id: 'drinks', label: 'Соки та напої', icon: '🧃' },
    { id: 'sauces', label: 'Соуси та приправи', icon: '🧂' },
    { id: 'veggies', label: 'Свіжі овочі', icon: '🥦' },
    { id: 'canned', label: 'Консервація', icon: '🥫' },
];

const mockProducts = [
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
        description: 'Соковита свиняча ковбаса з часником та ароматними спеціями',
        price: 98,
        unit: '₴/кг',
    },
];

export default function Products() {
    const [activeCategory, setActiveCategory] = useState('sausages');

    const filteredProducts = mockProducts.filter(
        (product) => product.category === activeCategory
    );

    return (
        <div className="products">
            <div className="products-container">
                <div className="products-content">

                    <div className="products-badge">
                        АСОРТИМЕНТ
                    </div>

                    <h1 className="products-title">
                        Наша продукція
                    </h1>

                    <p className="products-description">
                        Понад 50 позицій власного виробництва та відібраних делікатесів.
                    </p>

                    <div className="products-list-section">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                className={`cat-btn ${
                                    activeCategory === cat.id ? 'active' : ''
                                }`}
                                onClick={() => setActiveCategory(cat.id)}

                            >
                                <span className="cat-icon">
                                    {cat.icon}
                                </span>

                                <span>
                                    {cat.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="products-list">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="product-card"
                            >
                                <div className="card-image-wrapper">
                                    <div className="card-image-placeholder">
                                        Фото товару
                                    </div>
                                </div>

                                <span className="card-category">
                                    {
                                        categories.find(
                                            (cat) => cat.id === product.category
                                        )?.label
                                    }
                                </span>

                                <h3 className="card-title">
                                    {product.name}
                                </h3>

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

                                    <button className="btn-buy">
                                        КУПИТИ
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