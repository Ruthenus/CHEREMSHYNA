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
            /* Shopping remains available when browser storage is full. */
        }
    }, [cart]);

    function addToCart(product) {
        setCart((previous) =>
            previous.some((item) => item.id === product.id)
                ? previous.map((item) =>
                      item.id === product.id
                          ? { ...item, quantity: item.quantity + 1 }
                          : item,
                  )
                : [...previous, { ...product, quantity: 1 }],
        );
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
