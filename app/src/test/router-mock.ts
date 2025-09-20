import { vi } from 'vitest';
import type { NextRouter } from 'next/router';
import type { ParsedUrlQuery } from 'querystring';

export const mockRouter: NextRouter = {
  basePath: '',
  pathname: '/',
  route: '/',
  asPath: '/',
  query: {},
  push: vi.fn(() => Promise.resolve(true)),
  replace: vi.fn(() => Promise.resolve(true)),
  reload: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(() => Promise.resolve()),
  beforePopState: vi.fn(),
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  },
  isFallback: false,
  isLocaleDomain: false,
  isPreview: false,
  isReady: true,
  locale: undefined,
  locales: undefined,
  defaultLocale: undefined
};

export function setMockRouterQuery(query: ParsedUrlQuery) {
  mockRouter.query = query;
  mockRouter.asPath = '/slots';
}

export function resetMockRouter() {
  mockRouter.query = {};
  mockRouter.asPath = '/';
  mockRouter.pathname = '/';
  mockRouter.route = '/';
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.prefetch.mockClear();
  mockRouter.beforePopState.mockClear();
  mockRouter.back.mockClear();
  mockRouter.reload.mockClear();
  mockRouter.events.on.mockClear();
  mockRouter.events.off.mockClear();
  mockRouter.events.emit.mockClear();
}
