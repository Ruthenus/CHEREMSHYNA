// Кошик: сума, одиниці з «₴/…», стеля stock, куди веде оформлення.
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Cart from '../src/components/Cart.jsx';

/** Сесія підміняється: Cart читає лише useAuth().user. */
let mockUser = null;
vi.mock('../src/context/AuthContext.jsx', () => ({
    useAuth: () => ({ user: mockUser }),
}));

const cart = [
    {
        id: 1,
        name: 'Ковбаса Черемшина',
        price: 189,
        unit: '₴/кг',
        quantity: 2,
        category: 'sausages',
    },
    {
        id: 2,
        name: 'Сік Яблучний',
        price: 65,
        unit: '₴/л',
        quantity: 1,
        category: 'drinks',
    },
];

/** Рендер /cart і пасток /login та /order. */
function renderCart(items, setCart = vi.fn()) {
    render(
        <MemoryRouter initialEntries={['/cart']}>
            <Routes>
                <Route
                    path="/cart"
                    element={<Cart cart={items} setCart={setCart} />}
                />
                <Route path="/login" element={<div>LOGIN PAGE</div>} />
                <Route path="/order" element={<div>ORDER PAGE</div>} />
            </Routes>
        </MemoryRouter>,
    );
    return setCart;
}

describe('Cart', () => {
    // mockUser живе між тестами. Скидаємо, щоб не лишалась сесія.
    afterEach(() => {
        mockUser = null;
    });

    it('порожній кошик показує підказку', () => {
        renderCart([]);
        expect(screen.getByText('Кошик порожній')).toBeTruthy();
    });

    it('рахує суму і одиниці з підпису ціни', () => {
        mockUser = null;
        renderCart(cart);
        // 189 * 2 + 65.
        expect(screen.getByText('443 ₴')).toBeTruthy();
        expect(screen.getByText('2 кг')).toBeTruthy();
        expect(screen.getByText('1 л')).toBeTruthy();
    });

    it('«+» збільшує кількість через setCart', () => {
        const setCart = renderCart(cart);
        fireEvent.click(screen.getAllByText('+')[0]);
        expect(setCart).toHaveBeenCalledTimes(1);
        const updater = setCart.mock.calls[0][0];
        expect(updater(cart)[0].quantity).toBe(3);
    });

    it('«+» не піднімає кількість вище залишку', () => {
        const limited = [{
            id: 1,
            name: 'Ковбаса Черемшина',
            price: 189,
            unit: '₴/кг',
            quantity: 2,
            stock: 2,
            category: 'sausages',
        }];
        const setCart = renderCart(limited);
        fireEvent.click(screen.getByText('+'));
        const updater = setCart.mock.calls[0][0];
        expect(updater(limited)[0].quantity).toBe(2);
    });

    it('«−» на одиниці прибирає позицію', () => {
        const setCart = renderCart(cart);
        fireEvent.click(screen.getAllByText('-')[1]);
        const updater = setCart.mock.calls[0][0];
        expect(updater(cart).map((row) => row.id)).toEqual([1]);
    });

    it('гість при оформленні потрапляє на вхід', () => {
        mockUser = null;
        renderCart(cart);
        fireEvent.click(screen.getByText('ОФОРМИТИ ЗАМОВЛЕННЯ'));
        expect(screen.getByText('LOGIN PAGE')).toBeTruthy();
    });

    it('авторизований потрапляє на оформлення', () => {
        mockUser = { id: 1, name: 'Іван' };
        renderCart(cart);
        fireEvent.click(screen.getByText('ОФОРМИТИ ЗАМОВЛЕННЯ'));
        expect(screen.getByText('ORDER PAGE')).toBeTruthy();
    });
});
