const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
let token = sessionStorage.getItem('cheremshyna_access');
export function setToken(value) {
    token = value || null;
    if (token) sessionStorage.setItem('cheremshyna_access', token);
    else sessionStorage.removeItem('cheremshyna_access');
}
export function hasToken() {
    return Boolean(token);
}
export async function request(path, { method = 'GET', body, signal } = {}) {
    let response;
    try {
        response = await fetch(`${base}${path}`, {
            method,
            signal: signal
                ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
                : AbortSignal.timeout(15000),
            headers: {
                Accept: 'application/json',
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (error) {
        if (error.name === 'AbortError') throw error;
        throw new Error('Немає зв’язку із сервером. Спробуйте ще раз.', {
            cause: error,
        });
    }
    const data =
        response.status === 204
            ? null
            : await response.json().catch(() => null);
    if (!response.ok) {
        const message =
            data?.detail ||
            data?.message ||
            (data && Object.values(data).flat().join(' '));
        const error = new Error(
            message || 'Сервіс тимчасово недоступний. Спробуйте пізніше.',
        );
        error.status = response.status;
        throw error;
    }
    if (response.status !== 204 && data === null)
        throw new Error('Сервер повернув некоректну відповідь.');
    return data;
}
export function unwrapList(data) {
    const list = Array.isArray(data) ? data : data?.results;
    if (!Array.isArray(list))
        throw new Error('Сервер повернув некоректний список.');
    return list;
}
