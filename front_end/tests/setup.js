// Vitest не чистить DOM сам. Інакше наступний тест
// бачить попередній рендер і клікає не ту кнопку.
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
    cleanup();
});
