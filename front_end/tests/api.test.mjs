import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const source = (await readFile(new URL('../src/services/api.js', import.meta.url), 'utf8')).replace('import.meta.env.VITE_API_BASE_URL', '""');
const { request, setToken, hasToken, unwrapList } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('API contract and failure handling', async t => {
    await t.test('sends JSON with bearer token and preserves server result', async () => {
        setToken('test-token');
        assert.equal(hasToken(), true);
        globalThis.fetch = async (url, options) => {
            assert.equal(url, '/api/orders/');
            assert.equal(options.headers.Authorization, 'Bearer test-token');
            assert.deepEqual(JSON.parse(options.body), { items: [{ product_id: 1, quantity: 2 }] });
            return new Response(JSON.stringify({ id: 42 }), { status: 201 });
        };
        assert.deepEqual(await request('/orders/', { method: 'POST', body: { items: [{ product_id: 1, quantity: 2 }] } }), { id: 42 });
        setToken(null);
        assert.equal(hasToken(), false);
    });
    await t.test('accepts both DRF and array lists', () => {
        assert.deepEqual(unwrapList({ results: [{ id: 1 }], next: null }), [{ id: 1 }]);
        assert.deepEqual(unwrapList([]), []);
        assert.throws(() => unwrapList({ detail: 'invalid' }));
    });
    await t.test('does not report success for rejected orders', async () => {
        globalThis.fetch = async () => new Response(JSON.stringify({ detail: 'Товар недоступний' }), { status: 400 });
        await assert.rejects(request('/orders/', { method: 'POST', body: {} }), /Товар недоступний/);
    });
    await t.test('rejects HTML fallback and network failure', async () => {
        globalThis.fetch = async () => new Response('<html>Vite fallback</html>');
        await assert.rejects(request('/auth/login/'), /некоректну відповідь/);
        globalThis.fetch = async () => { throw new TypeError('offline'); };
        await assert.rejects(request('/orders/quick/'), /Немає зв’язку/);
    });
    await t.test('supports 204 responses', async () => {
        globalThis.fetch = async () => new Response(null, { status: 204 });
        assert.equal(await request('/auth/logout/', { method: 'POST' }), null);
    });
});
