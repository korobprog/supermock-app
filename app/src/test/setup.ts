import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { mockRouter, resetMockRouter } from './router-mock';

vi.mock('next/router', () => ({
  useRouter: () => mockRouter
}));

afterEach(() => {
  cleanup();
  resetMockRouter();
});
