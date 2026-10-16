// Вітрина: API, вкладки, числова ціна, нульовий stock, офлайн.
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Products from '../src/components/Products.jsx';

vi.mock('../src/api.js', () => ({
    getCategories: vi.fn(),
    getProducts: vi.fn(),
    errorMessage: () => 'Немає звʼязку з сервером.',
}));
import { getCategories, getProducts } from '../src/api.js';

const categories = [
    { slug: 'sausages', name: 'Ковбаси', icon: '🥖' },
    { slug: 'cheeses', name: 'Сири', icon: '🧀' },
];
const products = [
    {
        id: 1,
        name: 'Ковбаса Черемшина',
        price: '189.00',
        unit: '₴/кг',
        category: 'sausages',
        description: 'd',
        stock: 40,
    },
    {
        id: 2,
        name: 'Сир Гауда',
        price: 280,
        unit: '₴/кг',
        category: 'cheeses',
        description: 'd',
        stock: 40,
    },
    {
        id: 3,
        name: 'Бринза',
        price: 195,
        unit: '₴/кг',
        category: 'cheeses',
        description: 'd',
        stock: 0,
    },
];

describe('Products', () => {
    it('показує активну категорію і перемикає вкладки', async () => {
        getCategories.mockResolvedValue(categories);
        getProducts.mockResolvedValue(products);
        render(<Products addToCart={vi.fn()} />);
        await screen.findByText('Ковбаса Черемшина');
        expect(screen.queryByText('Сир Гауда')).toBeNull();
        fireEvent.click(screen.getByText('Сири'));
        expect(screen.getByText('Сир Гауда')).toBeTruthy();
    });

    it('у кошик іде числова ціна і назва категорії', async () => {
        getCategories.mockResolvedValue(categories);
        getProducts.mockResolvedValue(products);
        const addToCart = vi.fn();
        render(<Products addToCart={addToCart} />);
        await screen.findByText('Ковбаса Черемшина');
        fireEvent.click(screen.getByText('КУПИТИ'));
        const item = addToCart.mock.calls[0][0];
        // Рядок «189.00» з DRF стає числом 189.
        expect(item.price).toBe(189);
        expect(item.categoryLabel).toBe('Ковбаси');
    });

    it('товар із нульовим залишком не можна купити', async () => {
        getCategories.mockResolvedValue(categories);
        getProducts.mockResolvedValue(products);
        render(<Products addToCart={vi.fn()} />);
        await screen.findByText('Ковбаса Черемшина');
        fireEvent.click(screen.getByText('Сири'));
        const soldOut = screen.getByText('НЕМАЄ В НАЯВНОСТІ');
        expect(soldOut.disabled).toBe(true);
        expect(screen.getByText('КУПИТИ').disabled).toBe(false);
    });

    it('без сервера показує приклад і блокує купівлю', async () => {
        getCategories.mockRejectedValue(new Error('down'));
        getProducts.mockRejectedValue(new Error('down'));
        render(<Products addToCart={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByRole('status')).toBeTruthy();
        });
        const buttons = await screen.findAllByText('НЕМАЄ ЗВʼЯЗКУ');
        expect(buttons.every((button) => button.disabled)).toBe(true);
    });
});
