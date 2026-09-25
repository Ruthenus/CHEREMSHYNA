import { useState } from "react";
import {BrowserRouter, Routes, Route} from "react-router-dom" ;

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
import Cart from './components/Cart.jsx';

function App() {
    const [cart, setCart] = useState([]);

    function addToCart(product) {
        const existingProduct = cart.find(item => item.id === product.id);

        if (existingProduct) {
            setCart(
                cart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            );
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    }
    return (


      <BrowserRouter>
          <Routes>
              <Route path="/"

              element={
                  <div className="app">

                  <Header cart={cart} />
                  <Hero />
                  <Products addToCart={addToCart}/>
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
                          <Cart cart={cart} />
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
          </Routes>

      </BrowserRouter>
  );
}

export default App;