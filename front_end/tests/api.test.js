// api.js: токени, 401, пагінація, тексти помилок. Мережі немає.
import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    api,
    clearTokens,
    errorMessage,
    getProducts,
    login,
    saveTokens,
    SESSION_EXPIRED_EVENT,
    unwrapList,
} from '../src/api.js';

/** Успіх axios або AxiosError із заданим status. */
function respond(config, status, data) {
    if (status >= 400) {
        throw new AxiosError('fail', 'ERR_BAD_REQUEST', config, null, {
            status,
            data,
            headers: {},
            config,
            statusText: '',
        });
    }
    return { data, status, statusText: 'OK', headers: {}, config };
}

let calls;

/** Підміняє адаптер axios і збирає url, Bearer і params. */
function mock(handler) {
    calls = [];
    api.defaults.adapter = async (config) => {
        calls.push({
            url: config.url,
            auth: config.headers.get('Authorization'),
            params: config.params,
        });
        return handler(config, calls.length);
    };
}

beforeEach(() => localStorage.clear());

describe('unwrapList', () => {
    it('приймає масив, сторінку DRF і сміття', () => {
        expect(unwrapList([1, 2])).toEqual([1, 2]);
        expect(unwrapList({ results: [3] })).toEqual([3]);
        expect(unwrapList(null)).toEqual([]);
        expect(unwrapList({ results: 'x' })).toEqual([]);
    });
});

describe('errorMessage', () => {
    it('без відповіді сервера згадує Django', () => {
        expect(errorMessage(new Error('Network'))).toMatch(/Django/);
    });

    it('бере поле detail', () => {
        const error = { response: { data: { detail: 'Погано' } } };
        expect(errorMessage(error)).toBe('Погано');
    });

    it('склеює помилки полів через пробіл', () => {
        const error = {
            response: {
                data: {
                    email: ['Є такий'],
                    password: ['Простий', 'Короткий'],
                },
            },
        };
        expect(errorMessage(error)).toBe('Є такий Простий Короткий');
    });
});

describe('токени', () => {
    it('saveTokens бере access або старий ключ token', () => {
        saveTokens({ token: 'T', refresh: 'R' });
        expect(localStorage.getItem('cheremshyna_token')).toBe('T');
        expect(localStorage.getItem('cheremshyna_refresh')).toBe('R');
        clearTokens();
        expect(localStorage.getItem('cheremshyna_token')).toBeNull();
    });

    it('до запиту додається Bearer', async () => {
        saveTokens({ access: 'ABC' });
        mock((config) => respond(config, 200, []));
        await api.get('/categories/');
        expect(calls[0].auth).toBe('Bearer ABC');
    });

    it('login записує токени в localStorage', async () => {
        mock((config) => respond(config, 200, {
            user: {},
            access: 'A1',
            refresh: 'R1',
            token: 'A1',
        }));
        await login({ email: 'a@b.c', password: 'x' });
        expect(localStorage.getItem('cheremshyna_token')).toBe('A1');
    });
});

describe('401: оновлення токена', () => {
    it('refresh оновлює access і повторює запит', async () => {
        saveTokens({ access: 'OLD', refresh: 'R' });
        mock((config) => {
            if (config.url === '/auth/refresh/') {
                return respond(config, 200, { access: 'NEW' });
            }
            const auth = config.headers.get('Authorization');
            return auth === 'Bearer NEW'
                ? respond(config, 200, { ok: true })
                : respond(config, 401, { detail: 'expired' });
        });
        const response = await api.get('/auth/me/');
        expect(response.data).toEqual({ ok: true });
        expect(calls.map((row) => row.url)).toEqual([
            '/auth/me/',
            '/auth/refresh/',
            '/auth/me/',
        ]);
        expect(localStorage.getItem('cheremshyna_token')).toBe('NEW');
    });

    it('оновлення йде без старого Bearer', async () => {
        saveTokens({ access: 'OLD', refresh: 'R' });
        mock((config) => {
            if (config.url === '/auth/refresh/') {
                return respond(config, 200, { access: 'NEW' });
            }
            const auth = config.headers.get('Authorization');
            return auth === 'Bearer NEW'
                ? respond(config, 200, {})
                : respond(config, 401, {});
        });
        await api.get('/auth/me/');
        expect(calls[1].auth == null).toBe(true);
    });

    it('кілька 401 дають один запит refresh', async () => {
        saveTokens({ access: 'OLD', refresh: 'R' });
        mock((config) => {
            if (config.url === '/auth/refresh/') {
                return respond(config, 200, { access: 'NEW' });
            }
            const auth = config.headers.get('Authorization');
            return auth === 'Bearer NEW'
                ? respond(config, 200, {})
                : respond(config, 401, {});
        });
        await Promise.all([api.get('/orders/'), api.get('/auth/me/')]);
        const refreshes = calls.filter((row) => row.url === '/auth/refresh/');
        expect(refreshes).toHaveLength(1);
    });
});

describe('401: сесія мертва', () => {
    it('публічний запит повторюється без токена', async () => {
        saveTokens({ access: 'EXPIRED', refresh: 'DEAD' });
        const expired = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, expired);
        mock((config) => {
            if (config.url === '/auth/refresh/') {
                return respond(config, 401, { detail: 'dead' });
            }
            return config.headers.get('Authorization')
                ? respond(config, 401, { detail: 'expired' })
                : respond(config, 200, { results: [{ id: 1 }] });
        });
        const items = await getProducts();
        window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
        expect(items).toEqual([{ id: 1 }]);
        expect(localStorage.getItem('cheremshyna_token')).toBeNull();
        expect(localStorage.getItem('cheremshyna_refresh')).toBeNull();
        expect(expired).toHaveBeenCalledTimes(1);
    });

    it('захищений запит віддає 401 і подію інтерфейсу', async () => {
        // Refresh у сховищі немає: оновлювати нічим.
        saveTokens({ access: 'EXPIRED' });
        const expired = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, expired);
        mock((config) => respond(config, 401, { detail: 'no' }));
        await expect(api.get('/auth/me/')).rejects.toBeTruthy();
        window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
        expect(expired).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem('cheremshyna_token')).toBeNull();
    });

    it('невірний пароль не гасить сесію і не повторює запит', async () => {
        const expired = vi.fn();
        window.addEventListener(SESSION_EXPIRED_EVENT, expired);
        mock((config) => respond(
            config,
            401,
            { detail: 'Невірний email або пароль.' },
        ));
        await expect(
            login({ email: 'a@b.c', password: 'x' }),
        ).rejects.toBeTruthy();
        window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
        expect(calls).toHaveLength(1);
        expect(expired).not.toHaveBeenCalled();
    });

    it('500 на оновленні не стирає refresh', async () => {
        saveTokens({ access: 'OLD', refresh: 'R' });
        mock((config) => (
            config.url === '/auth/refresh/'
                ? respond(config, 500, {})
                : respond(config, 401, {})
        ));
        await expect(api.get('/auth/me/')).rejects.toBeTruthy();
        expect(localStorage.getItem('cheremshyna_refresh')).toBe('R');
    });

    it('обрив мережі на оновленні не стирає сесію', async () => {
        saveTokens({ access: 'OLD', refresh: 'R' });
        mock((config) => {
            if (config.url === '/auth/refresh/') {
                throw new Error('Network');
            }
            return respond(config, 401, {});
        });
        await expect(api.get('/auth/me/')).rejects.toBeTruthy();
        expect(localStorage.getItem('cheremshyna_token')).toBe('OLD');
        expect(localStorage.getItem('cheremshyna_refresh')).toBe('R');
    });
});

describe('getProducts / пагінація', () => {
    it('іде за next і збирає всі сторінки', async () => {
        mock((config, n) => (
            n === 1
                ? respond(config, 200, {
                    next: 'http://127.0.0.1:8000/api/products/?page=2',
                    results: [{ id: 1 }],
                })
                : respond(config, 200, {
                    next: null,
                    results: [{ id: 2 }],
                })
        ));
        const items = await getProducts({ category: 'cheeses' });
        expect(items.map((row) => row.id)).toEqual([1, 2]);
        expect(calls[0].params).toEqual({ category: 'cheeses' });
        expect(calls[1].url).toBe('/products/?page=2');
    });
});
