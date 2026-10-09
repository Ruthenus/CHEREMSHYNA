/* =====================================================================
   Шар API за контрактом front_end/API_CONTRACT.md.
   Що тут відбувається:
   - створюємо єдиний axios-клієнт для всього фронтенду;
   - автоматично додаємо JWT-токен до кожного запиту, якщо він є і виклик не 
   позначений skipAuth;
   - на 401 з токеном один раз оновлюємо access і повторюємо запит;
   - 401 без токена (невірний пароль) не оновлюємо;
   - надаємо прості функції-обгортки для кожного ендпоінта бекенду.
   База: VITE_API_BASE_URL або відносний /api (Vite проксує його на Django).
   Списки DRF бувають масивом або { results, next } — unwrapList це згладжує.
   ===================================================================== */

import axios from 'axios';

// Ключі, під якими токени зберігаються в localStorage браузера.
const TOKEN_KEY = 'cheremshyna_token';     // короткоживучий access-токен
const REFRESH_KEY = 'cheremshyna_refresh'; // довгоживучий refresh-токен

// Єдиний екземпляр axios для всього застосунку.
// Якщо змінна оточення не задана — використовуємо відносний шлях /api.
export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// ---------------------------------------------------------------------
// Інтерцептор запитів: перед кожним запитом підставляє токен.
// ---------------------------------------------------------------------
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    // skipAuth — власний прапорець для самого запиту оновлення токена:
    // йому заголовок Authorization не потрібен.
    if (token && !config.skipAuth) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Назва події, яку ми розсилаємо, коли сесія остаточно протухла.
// AuthContext слухає цю подію, щоб інтерфейс не лишався «залогіненим»,
// коли сервер уже не визнає сесію.
export const SESSION_EXPIRED_EVENT = 'cheremshyna:session-expired';

// Тримає «поточний» запит на оновлення токена (або null, якщо його немає).
let refreshPromise = null;

// Оновлює access-токен за допомогою refresh-токена.
// Один спільний запит на оновлення, 
// навіть якщо 401 прийшов одразу на кілька запитів:
// усі вони чекатимуть на той самий promise, а не дублюватимуть виклик.
// Новий refresh, навіть якщо сервер його прислав, цей клієнт не записує.
function refreshAccess() {
    if (!refreshPromise) {
        const refresh = localStorage.getItem(REFRESH_KEY);
        // Без refresh-токена оновлювати нічим — одразу відхиляємо.
        if (!refresh) return Promise.reject(new Error('no refresh token'));
        refreshPromise = api
            // skipAuth — не надсилати старий access; _retried — не заходити в цикл повторів.
            .post('/auth/refresh/', { refresh }, { skipAuth: true, _retried: true })
            .then((response) => {
                // Зберігаємо лише новий access. Попередній refresh лишається,
                // бо saveTokens тут викликається без поля refresh.
                saveTokens({ access: response.data.access });
                return response.data.access;
            })
            .finally(() => {
                // Незалежно від результату — звільняємо слот для наступного оновлення.
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

// ---------------------------------------------------------------------
// Інтерцептор відповідей: обробка помилки 401 (не авторизовано).
//
// 401 обробляється у три кроки:
//  1) запит ішов без токена (наприклад, невірний пароль) — просто віддаємо помилку;
//  2) є refresh — оновлюємо access і повторюємо запит один раз;
//  3) сесія мертва — чистимо токени, повідомляємо AuthContext і повторюємо запит
//     без токена (публічні каталог і швидка заявка далі працюють, захищені дадуть 401).
// ---------------------------------------------------------------------
api.interceptors.response.use(
    // Успішні відповіді пропускаємо без змін.
    (response) => response,
    async (error) => {
        const original = error?.config; // конфіг запиту, який завершився помилкою
        // Чи ішов цей запит з токеном?
        const hadToken = Boolean(
            original?.headers?.Authorization || original?.headers?.authorization,
        );
        // Крок 1: у цих випадках нічого не оновлюємо, просто повертаємо помилку.
        if (
            error?.response?.status !== 401 || // це не 401
            !original ||                       // немає конфігу запиту
            original._retried ||               // вже повторювали — уникаємо нескінченного циклу
            original.skipAuth ||               // запит навмисно без авторизації
            !hadToken                          // токена не було (напр., невірний пароль)
        ) {
            return Promise.reject(error);
        }
        // Позначаємо, що цей запит уже повторювався.
        original._retried = true;

        // Крок 2: пробуємо оновити access і повторити запит.
        try {
            await refreshAccess();
            return await api(original); // request-інтерцептор підставить новий access
        } catch (retryError) {
            const status = retryError?.response?.status;
            // 500 і обрив мережі на /auth/refresh/ не означають, що refresh мертвий.
            // Раніше помилка без status (немає відповіді сервера) все одно стирала сесію.
            // Якщо refresh-токена немає взагалі — сесію скидаємо, як і раніше.
            const refreshStillStored = Boolean(localStorage.getItem(REFRESH_KEY));
            // Не скидаємо сесію, якщо: сервер відповів не-401 (тимчасова помилка)
            // або відповіді не було, а refresh-токен ще збережений (проблема з мережею).
            if ((status && status !== 401) || (!status && refreshStillStored)) {
                return Promise.reject(retryError);
            }
        }

        // Крок 3: сесія справді мертва — прибираємо токени і сповіщаємо застосунок.
        clearTokens();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        // Видаляємо старий заголовок, щоб повторити запит як гість.
        if (original.headers) {
            delete original.headers.Authorization;
            delete original.headers.authorization;
        }
        return api(original);
    },
);

// ---------------------------------------------------------------------
// Робота з токенами
// ---------------------------------------------------------------------

// Зберігає токени в localStorage. Сервер може віддати access під ключем
// `access` або `token`, тому підтримуємо обидва варіанти.
export function saveTokens({ access, refresh, token }) {
    const accessToken = access || token || '';
    if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

// Видаляє обидва токени (вихід або завершення сесії).
export function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

// ---------------------------------------------------------------------
// Розбір повідомлень про помилки
// ---------------------------------------------------------------------

// Рекурсивно перетворює будь-яку структуру помилки DRF (рядок, масив,
// вкладений об'єкт) на один зручний для показу рядок.
function flattenError(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        // Масив: розгортаємо кожен елемент і з'єднуємо пробілами.
        return value.map(flattenError).filter(Boolean).join(' ');
    }
    if (typeof value === 'object') {
        // Об'єкт (напр. помилки по полях форми): беремо всі значення.
        return Object.values(value).map(flattenError).filter(Boolean).join(' ');
    }
    return String(value);
}

// Повертає людське повідомлення про помилку для показу користувачу.
// Немає response — немає зв'язку (сервер, мережа або проксі), це не помилка форми.
export function errorMessage(error, fallback = 'Не вдалося виконати запит') {
    const data = error?.response?.data;
    // Немає відповіді сервера — зв'язку немає, це не помилка валідації.
    if (!data) {
        return 'Немає звʼязку з сервером. Перевірте, чи запущений Django.';
    }
    // DRF зазвичай кладе текст у `detail`; якщо його немає — розбираємо весь об'єкт.
    const text = flattenError(data.detail ?? data);
    return text || fallback;
}

// ---------------------------------------------------------------------
// Робота зі списками та пагінацією
// ---------------------------------------------------------------------

// Приводить відповідь DRF до масиву: або це вже масив,
// або об'єкт зі сторінкою { results: [...], next }.
export function unwrapList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.results)) return payload.results;
    return [];
}

// Перетворює абсолютне посилання `next` з відповіді DRF на шлях,
// який можна передати в наш axios-клієнт (він уже має baseURL).
function apiPathFromNext(next) {
    if (!next) return null; // наступної сторінки немає
    try {
        // Другий аргумент потрібен, щоб URL розібрався і для відносних посилань.
        const url = new URL(next, 'http://localhost');
        // Відрізаємо все до /api/, бо baseURL і так додасть цей префікс.
        const marker = url.pathname.indexOf('/api/');
        const path = marker >= 0 ? url.pathname.slice(marker + 4) : url.pathname;
        return `${path}${url.search}`; // зберігаємо параметри запиту (?page=2)
    } catch {
        // Якщо розібрати не вдалося — повертаємо як є.
        return next;
    }
}

// Завантажує ВСІ сторінки списку, поки сервер повертає `next`.
async function fetchAll(path, params) {
    const items = [];
    let nextPath = path;
    let query = params;
    while (nextPath) {
        const response = await api.get(nextPath, { params: query });
        // Параметри потрібні лише для першої сторінки: у `next` вони вже вбудовані.
        query = undefined;
        items.push(...unwrapList(response.data));
        nextPath = apiPathFromNext(response.data?.next);
    }
    return items;
}

// ---------------------------------------------------------------------
// Каталог (публічні ендпоінти)
// ---------------------------------------------------------------------

// Усі категорії товарів.
export function getCategories() {
    return fetchAll('/categories/');
}

// Усі товари; params — необов'язкові фільтри (категорія, пошук тощо).
export function getProducts(params) {
    return fetchAll('/products/', params);
}

// Один товар за його id.
export function getProduct(id) {
    return api.get(`/products/${id}/`).then((response) => response.data);
}

// ---------------------------------------------------------------------
// Авторизація
// ---------------------------------------------------------------------

// Реєстрація: створюємо акаунт і одразу зберігаємо видані токени.
export async function register(body) {
    const response = await api.post('/auth/register/', body);
    saveTokens(response.data);
    return response.data;
}

// Вхід: зберігаємо токени, які повернув сервер.
export async function login(body) {
    const response = await api.post('/auth/login/', body);
    saveTokens(response.data);
    return response.data;
}

// Дані поточного користувача.
export function me() {
    return api.get('/auth/me/').then((response) => response.data);
}

// Часткове оновлення профілю (PATCH — лише передані поля).
export function updateMe(patch) {
    return api.patch('/auth/me/', patch).then((response) => response.data);
}

// Вихід: повідомляємо сервер (щоб анулювати refresh), а токени
// локально чистимо в будь-якому разі — навіть якщо запит не вдався.
export async function logout() {
    const refresh = localStorage.getItem(REFRESH_KEY);
    try {
        await api.post('/auth/logout/', refresh ? { refresh } : {});
    } finally {
        clearTokens();
    }
}

// ---------------------------------------------------------------------
// Замовлення
// ---------------------------------------------------------------------

// Список замовлень поточного користувача.
export function getOrders() {
    return fetchAll('/orders/');
}

// Своє замовлення за id. Чуже id сервер не віддасть.
export function getOrder(id) {
    return api.get(`/orders/${id}/`).then((response) => response.data);
}

// Створення замовлення (для авторизованого користувача).
export function createOrder(body) {
    return api.post('/orders/', body).then((response) => response.data);
}

// Попередній розрахунок суми. Тіло лише { items }, замовлення не створюється.
export function previewOrder(items) {
    // Сума та сама, що порахує сервер під час createOrder.
    return api.post('/orders/preview/', { items }).then((response) => response.data);
}

// Швидка заявка — працює без авторизації (публічний ендпоінт).
export function createQuickOrder(body) {
    return api.post('/orders/quick/', body).then((response) => response.data);
}

// ---------------------------------------------------------------------
// Акції
// ---------------------------------------------------------------------

// Діючі акції. Шлях promos/, не корінь /promotions/. Промокодів у API немає.
export function getPromotions() {
    return fetchAll('/promotions/promos/');
}