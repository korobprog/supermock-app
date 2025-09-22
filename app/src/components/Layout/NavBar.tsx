import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback } from 'react';

import { useAuth } from '@/store/useAuth';

const navigationLinks = [
  { href: '/', label: 'Главная' },
  { href: '/slots', label: 'Слоты' },
  { href: '/interviewer', label: 'Интервьюеру' },
  { href: '/profile', label: 'Профиль' }
];

export default function NavBar() {
  const router = useRouter();
  const isAuthenticated = useAuth((state) => state.isAuthenticated);
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);

  const handleLogout = useCallback(() => {
    logout();
    if (router.pathname !== '/') {
      void router.push('/');
    }
  }, [logout, router]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-base font-semibold text-white transition hover:text-secondary">
          SuperMock
        </Link>

        <nav className="flex items-center gap-2 md:gap-4">
          {navigationLinks.map((link) => {
            const isActive = router.pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-secondary/15 text-secondary'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <>
              <span className="hidden text-xs text-slate-400 sm:inline" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              href="/onboarding"
              className="rounded-md border border-secondary/40 px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary/10"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
