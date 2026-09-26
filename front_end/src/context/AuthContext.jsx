import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const USERS_KEY = 'cheremshyna_users';
const SESSION_KEY = 'cheremshyna_session';
const ORDERS_KEY = 'cheremshyna_orders';

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function publicUser(user) {
    return {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        photo: user.photo || '',
    };
}

function demoOrders() {
    return [
        {
            id: 'ЧШ-0041',
            date: '2026-09-18',
            status: 'Доставлено',
            total: 626,
            items: [
                { name: 'Балик Свинячий', qty: '0,8 кг' },
                { name: 'Ковбаса Черемшина', qty: '1 кг' },
                { name: 'Сир Гауда', qty: '0,5 кг' },
            ],
        },
        {
            id: 'ЧШ-0038',
            date: '2026-09-05',
            status: 'Доставлено',
            total: 739,
            items: [
                { name: 'Шинка Варено-копчена', qty: '0,6 кг' },
                { name: 'Сардельки Класичні', qty: '1 кг' },
                { name: 'Кава Арабіка', qty: '250 г' },
            ],
        },
        {
            id: 'ЧШ-0034',
            date: '2026-08-21',
            status: 'Доставлено',
            total: 421,
            items: [
                { name: 'Курятина Копчена', qty: '1 кг' },
                { name: 'Гриби Мариновані', qty: '2 шт' },
                { name: 'Хліб Бородинський', qty: '2 шт' },
            ],
        },
    ];
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() =>
        readJson(SESSION_KEY, null)
    );

    const [orders, setOrders] = useState(() => {
        const session = readJson(SESSION_KEY, null);

        if (!session) return [];

        const all = readJson(ORDERS_KEY, {});

        return all[session.email] || [];
    });

    useEffect(() => {
        if (user) {
            localStorage.setItem(
                SESSION_KEY,
                JSON.stringify(user)
            );
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }, [user]);

    function saveOrders(email, nextOrders) {
        const all = readJson(ORDERS_KEY, {});

        all[email] = nextOrders;

        localStorage.setItem(
            ORDERS_KEY,
            JSON.stringify(all)
        );

        setOrders(nextOrders);
    }

    function register({
                          name,
                          email,
                          password,
                          phone,
                          photo
                      }) {
        const users = readJson(USERS_KEY, []);

        const exists = users.some(
            (item) =>
                item.email.toLowerCase() ===
                email.toLowerCase()
        );

        if (exists) {
            return {
                ok: false,
                error: 'Користувач з таким email вже існує'
            };
        }

        const newUser = {
            name,
            email,
            password,
            phone,
            photo: photo || '',
        };

        users.push(newUser);

        localStorage.setItem(
            USERS_KEY,
            JSON.stringify(users)
        );

        const session = publicUser(newUser);

        setUser(session);

        saveOrders(email, demoOrders());

        return { ok: true };
    }

    function login({ email, password }) {
        const users = readJson(USERS_KEY, []);

        const found = users.find(
            (item) =>
                item.email.toLowerCase() ===
                email.toLowerCase() &&
                item.password === password
        );

        if (!found) {
            return {
                ok: false,
                error: 'Невірний email або пароль'
            };
        }

        setUser(publicUser(found));

        const all = readJson(ORDERS_KEY, {});

        setOrders(all[found.email] || []);

        return { ok: true };
    }

    function logout() {
        setUser(null);
        setOrders([]);
    }

    function updateProfile(patch) {
        if (!user) return;

        const next = {
            ...user,
            ...patch
        };

        setUser(next);

        const users = readJson(USERS_KEY, []);

        const index = users.findIndex(
            (item) => item.email === user.email
        );

        if (index >= 0) {
            users[index] = {
                ...users[index],
                ...patch
            };

            localStorage.setItem(
                USERS_KEY,
                JSON.stringify(users)
            );
        }
    }

    function addOrder(cartItems, customer) {
        if (!user || !cartItems?.length) return;

        const nextNumber = String(
            orders.length + 42
        ).padStart(4, '0');

        const order = {
            id: `ЧШ-${nextNumber}`,

            date: new Date()
                .toISOString()
                .slice(0, 10),

            status: 'Прийнято',

            total: cartItems.reduce(
                (sum, item) =>
                    sum +
                    item.price *
                    (item.quantity || 1),
                0
            ),

            items: cartItems.map((item) => ({
                name: item.name,
                qty: `${item.quantity || 1} шт`,
                price: item.price,
            })),

            customer: {
                name: customer.name,
                phone: customer.phone,
                deliveryType: customer.deliveryType,
                comment: customer.comment,
            },
        };

        saveOrders(
            user.email,
            [order, ...orders]
        );
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                orders,
                register,
                login,
                logout,
                updateProfile,
                addOrder
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error(
            'useAuth має використовуватись всередині AuthProvider'
        );
    }

    return context;
}