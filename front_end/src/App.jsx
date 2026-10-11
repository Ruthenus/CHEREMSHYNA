import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Hero from './components/Hero';
import Products from './components/Products';
import Ticker from './components/Ticker';
import About from './components/About';
import Principles from './components/Principles.jsx';
import Contacts from './components/Contacts.jsx';
import Footer from './components/Footer.jsx';
import './App.css';

import Login from './components/User/Login.jsx';
import Register from './components/User/Register.jsx';
import Cabinet from './components/User/Cabinet.jsx';
import Cart from './components/Cart.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Order from './components/Order.jsx';

function App() {
    // Старий кошик міг зберегти битий рядок або товар без ціни.
    // Таке відкидаємо, інакше сума на екрані стане NaN.
    const [cart, setCart] = useState(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem('cheremshyna_cart') || '[]',
            );
            return Array.isArray(saved)
                ? saved.filter(
                    (item) =>
                        item &&
                        item.id != null &&
                        typeof item.name === 'string' &&
                        Number.isFinite(Number(item.price)) &&
                        Number(item.price) >= 0 &&
                        Number.isInteger(item.quantity) &&
                        item.quantity > 0,
                )
                : [];
        } catch {
            return [];
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('cheremshyna_cart', JSON.stringify(cart));
        } catch {
            /* Переповнений localStorage не повинен ламати покупку. */
        }
    }, [cart]);

    function addToCart(product) {
        // Сервер відхиляє кількість > 99 і понад stock.
        // Кнопка «КУПИТИ» раніше додавала без межі, і помилка вилазила лише на оформленні.
        setCart((previous) => {
            const existing = previous.find((item) => item.id === product.id);
            const merged = existing
                ? { ...existing, stock: existing.stock ?? product.stock }
                : product;
            const stockCap =
                typeof merged.stock === 'number' ? merged.stock : 99;
            const cap = Math.min(99, stockCap);
            const quantity = Math.min(cap, (existing?.quantity || 0) + 1);
            if (quantity < 1) return previous;
            if (existing) {
                return previous.map((item) =>
                    item.id === product.id ? { ...item, quantity } : item,
                );
            }
            return [...previous, { ...product, quantity }];
        });
    }
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/"

                        element={
                            <div className="app">
                                <Header cart={cart} />
                                <Hero />
                                <Products addToCart={addToCart} />
                                <Ticker />
                                <About />
                                <Principles />
                                <Contacts />
                                <Footer />
                            </div>
                        }
                    />
                    <Route
                        path="/cart"
                        element={
                            <>
                                <Header cart={cart} />
                                <Cart cart={cart} setCart={setCart} />
                                <Footer compact />
                            </>
                        }
                    />
                    <Route
                        path="/login"
                        element={
                            <>
                                <Header cart={cart} />
                                <Login />
                            </>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <>
                                <Header cart={cart} />
                                <Register />
                            </>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <>
                                <Header cart={cart} />
                                <Cabinet />
                            </>
                        }
                    />
                    <Route
                        path="/cabinet"
                        element={
                            <>
                                <Header cart={cart} />
                                <Cabinet />
                            </>
                        }
                    />
                    <Route
                        path="/order"
                        element={
                            <>
                                <Header cart={cart} />

                                <Order cart={cart} setCart={setCart} />
                            </>
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
