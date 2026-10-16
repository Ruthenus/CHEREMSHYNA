// jsdom і прибирання DOM після кожного тесту з tests/setup.js.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: './tests/setup.js',
    },
});
