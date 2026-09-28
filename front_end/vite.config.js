import { defineConfig, loadEnv } from 'vite';
import plugin from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Завантажуємо змінні середовища з .env файлів для поточного
    // режиму(development / production)
    const env = loadEnv(mode, '.', '');
    // const env = loadEnv(mode, process.cwd(), '');
    // '' = поточна робоча директорія при запуску vite (корінь проєкту)

    // Визначаємо адресу бекенду: беремо з VITE_API_PROXY_TARGET або 
    // дефолт localhost: 8000
    const proxyTarget =
        env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000';

    return {
        // Підключаємо React-плагін
        plugins: [plugin()],
        server: {
            // Dev-сервер фронтенду буде слухати на порту 62550
            port: 62550,
            proxy: {
                // Якщо фронтенд викликає /api/... → 
                // пересилаємо на бекенд (proxyTarget/ api /...)
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,  // міняє origin, щоб бекенд 
                    // думав, що запит йде напряму
                    secure: false,       // дозволяє працювати без HTTPS
                },
                // Якщо фронтенд викликає /media/... → 
                // пересилаємо на бекенд (proxyTarget/ media /...)
                '/media': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});