import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

import { mockRouter, resetMockRouter } from './router-mock';

vi.mock('next/router', () => ({
  useRouter: () => mockRouter
}));

// Ensure JSX runtime finds React during tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).React = React;

afterEach(() => {
  cleanup();
  resetMockRouter();
});
