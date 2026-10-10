import { createContext, useContext, useEffect, useState } from 'react';
import * as api from '../api.js';

const AuthContext = createContext(null);

// Той самий ключ сесії, що й раніше. Паролі більше не пишемо
// в localStorage: сесія — це профіль із сервера плюс JWT у cheremshyna_token.
const SESSION_KEY = 'cheremshyna_session';

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function remember(user) {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }) {
    // Немає access — сесію не відновлюємо, навіть 
    // якщо cheremshyna_session ще лежить.
    // JSON профілю без токена — це не вхід.
    const [user, setUser] = useState(() => {
        if (!localStorage.getItem('cheremshyna_token')) return null;
        return readJson(SESSION_KEY, null);
    });
    const [orders, setOrders] = useState([]);
    const [ordersError, setOrdersError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        // Перевіряємо токен сервером, а не віримо збереженому профілю.
        // Помилка /auth/me/ скидає сесію. Помилка історії замовлень — ні:
        // користувач лишається ввійшлим, у кабінеті буде текст помилки.
        async function restore() {
            if (!localStorage.getItem('cheremshyna_token')) {
                remember(null);
                if (!cancelled) setLoading(false);
                return;
            }
            try {
                const profile = await api.me();
                // Компонент могли розмонтувати, поки запит ще йшов.
                if (cancelled) return;
                setUser(profile);
                remember(profile);
                try {
                    const history = await api.getOrders();
                    if (!cancelled) setOrders(history);
                } catch (error) {
                    if (!cancelled) setOrdersError(api.errorMessage(error));
                }
            } catch {
                api.clearTokens();
                remember(null);
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        restore();
        return () => {
            cancelled = true;
        };
    }, []);

    // Сервер перестав визнавати сесію (токен прострочений, вихід на іншому
    // пристрої): прибираємо користувача з інтерфейсу одразу, 
    // а не після перезавантаження.
    useEffect(() => {
        function handleExpired() {
            remember(null);
            setUser(null);
            setOrders([]);
            setOrdersError('');
        }
        window.addEventListener(api.SESSION_EXPIRED_EVENT, handleExpired);
        return () =>
            window.removeEventListener(api.SESSION_EXPIRED_EVENT, handleExpired);
    }, []);

    // У стан кладемо data.user, не всю відповідь: токени вже записав api.js.

    async function register(form) {
        try {
            const data = await api.register({
                name: form.name,
                email: form.email,
                phone: form.phone || '',
                password: form.password,
            });
            setUser(data.user);
            remember(data.user);
            setOrders([]);
            setOrdersError('');
            return { ok: true };
        } catch (error) {
            return { ok: false, error: api.errorMessage(error) };
        }
    }

    async function login(form) {
        try {
            const data = await api.login({
                email: form.email,
                password: form.password,
            });
            setUser(data.user);
            remember(data.user);
            try {
                setOrders(await api.getOrders());
                setOrdersError('');
            } catch (error) {
                setOrders([]);
                setOrdersError(api.errorMessage(error));
            }
            return { ok: true };
        } catch (error) {
            return { ok: false, error: api.errorMessage(error) };
        }
    }

    // Локальний стан чистимо навіть якщо сервер не відповів.
    // api.logout і так прибирає токени у finally.
    async function logout() {
        try {
            await api.logout();
        } catch {
            api.clearTokens();
        }
        setUser(null);
        setOrders([]);
        setOrdersError('');
        remember(null);
    }

    async function updateProfile(patch) {
        try {
            const next = await api.updateMe(patch);
            setUser(next);
            remember(next);
            return next;
        } catch (error) {
            throw new Error(api.errorMessage(error), { cause: error });
        }
    }

    async function addOrder(cartItems, customer) {
        if (!user || !cartItems?.length) return null;
        let created;
        try {
            // У кошику поле id, контракт замовлення чекає product_id.
            // Ціну не передаємо: її рахує сервер.
            created = await api.createOrder({
                items: cartItems.map((item) => ({
                    product_id: item.id,
                    quantity: item.quantity || 1,
                })),
                customer_name: customer.name,
                phone: customer.phone,
                delivery_type: customer.deliveryType || 'pickup',
                comment: customer.comment || '',
            });
        } catch (error) {
            throw new Error(api.errorMessage(error), { cause: error });
        }
        // Якщо після створення історія не дочиталась, 
        // показуємо хоча б це замовлення.
        try {
            setOrders(await api.getOrders());
            setOrdersError('');
        } catch {
            setOrders((previous) => [created, ...previous]);
        }
        return created;
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                ordersError,
                orders,
                register,
                login,
                logout,
                updateProfile,
                addOrder,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth має використовуватись всередині AuthProvider');
    }

    return context;
}