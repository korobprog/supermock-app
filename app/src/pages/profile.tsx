import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';

import { changePassword, listSessions, requestEmailVerification, revokeSession } from '@/lib/api';
import { useAuth } from '@/store/useAuth';
import type { AuditLogEntryDto, AuthSessionDto } from '../../../shared/src/types/auth.js';

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function describeAction(action: string) {
  const mapping: Record<string, string> = {
    'auth.signup': 'Регистрация',
    'auth.login': 'Вход в систему',
    'auth.refresh': 'Обновление сессии',
    'auth.reset.request': 'Запрос сброса пароля',
    'auth.reset.complete': 'Смена пароля',
    'auth.verify-email': 'Подтверждение email',
    'auth.session.revoke': 'Завершение сессии'
  };

  return mapping[action] ?? action;
}

function normalizeUserAgent(value?: string | null) {
  if (!value) {
    return 'Неизвестно';
  }

  if (value.length > 80) {
    return `${value.slice(0, 77)}...`;
  }

  return value;
}

export default function ProfilePage() {
  const { user, setAuthData, updateUser } = useAuth((state) => ({
    user: state.user,
    setAuthData: state.setAuthData,
    updateUser: state.updateUser
  }));
  const [sessions, setSessions] = useState<AuthSessionDto[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revokeInProgress, setRevokeInProgress] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const loadSecurity = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listSessions();
      setSessions(data.sessions);
      setAuditLogs(data.auditLogs);
    } catch (err) {
      console.error('Failed to load sessions', err);
      setError('Не удалось загрузить информацию о безопасности. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  if (!user) {
    return (
      <>
        <Head>
          <title>Профиль — SuperMock</title>
        </Head>
        <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
          <h1 className="text-3xl font-semibold text-white">Профиль</h1>
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Для доступа к настройкам безопасности необходимо войти в систему.
          </p>
        </main>
      </>
    );
  }

  const handleRevoke = async (sessionId: string) => {
    setActionError(null);
    setRevokeInProgress(sessionId);
    try {
      await revokeSession(sessionId);
      await loadSecurity();
    } catch (err) {
      console.error('Failed to revoke session', err);
      setActionError('Не удалось завершить сессию. Попробуйте ещё раз.');
    } finally {
      setRevokeInProgress(null);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordStatus(null);
    setActionError(null);

    if (password.length < 8) {
      setActionError('Пароль должен содержать не менее 8 символов.');
      return;
    }

    if (password !== confirmPassword) {
      setActionError('Пароли не совпадают.');
      return;
    }

    try {
      const updated = await changePassword(user.id, password);
      updateUser({
        id: updated.id,
        email: updated.email,
        role: updated.role,
        emailVerified: Boolean(updated.emailVerifiedAt)
      });
      setPassword('');
      setConfirmPassword('');
      setPasswordStatus('Пароль успешно обновлён.');
    } catch (err) {
      console.error('Failed to change password', err);
      setActionError('Не удалось обновить пароль. Попробуйте ещё раз.');
    }
  };

  const handleRequestVerification = async () => {
    setVerificationStatus(null);
    setVerificationError(null);

    const token = typeof window !== 'undefined' ? window.prompt('Введите токен из письма для подтверждения email:') : '';

    if (!token) {
      return;
    }

    try {
      const response = await requestEmailVerification(token.trim());
      setAuthData(response.tokens.accessToken, response.user);
      setVerificationStatus('Email успешно подтверждён.');
      await loadSecurity();
    } catch (err) {
      console.error('Failed to verify email', err);
      setVerificationError('Не удалось подтвердить email. Проверьте токен и попробуйте снова.');
    }
  };

  return (
    <>
      <Head>
        <title>Профиль — SuperMock</title>
      </Head>
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-4 py-10">
        <header>
          <h1 className="text-3xl font-semibold text-white">Профиль</h1>
          <p className="mt-2 text-sm text-slate-400">
            Управляйте устройствами, сессиями и настройками безопасности аккаунта.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Безопасность</h2>
              <p className="text-sm text-slate-400">Активные устройства и последние действия.</p>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm md:items-end">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  user.emailVerified ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-100'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${user.emailVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {user.emailVerified ? 'Email подтверждён' : 'Email не подтверждён'}
              </span>
              {!user.emailVerified && (
                <button
                  type="button"
                  onClick={handleRequestVerification}
                  className="rounded-lg border border-secondary/40 px-3 py-1 text-xs font-semibold text-secondary transition hover:bg-secondary/10"
                >
                  Повторить верификацию
                </button>
              )}
              {verificationStatus && <span className="text-xs text-emerald-300">{verificationStatus}</span>}
              {verificationError && <span className="text-xs text-amber-200">{verificationError}</span>}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Активные устройства</h3>
              {loading ? (
                <p className="mt-2 text-sm text-slate-400">Загрузка...</p>
              ) : sessions.length === 0 ? (
                <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                  Сессий не найдено. При входе с нового устройства оно появится здесь.
                </p>
              ) : (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-800">
                  <table className="min-w-full divide-y divide-slate-800 text-sm">
                    <thead className="bg-slate-900/70 text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Создана</th>
                        <th className="px-4 py-3 text-left font-semibold">IP</th>
                        <th className="px-4 py-3 text-left font-semibold">Устройство</th>
                        <th className="px-4 py-3 text-left font-semibold">Статус</th>
                        <th className="px-4 py-3 text-right font-semibold">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {sessions.map((session) => (
                        <tr key={session.id} className="text-slate-300">
                          <td className="px-4 py-3">{formatDate(session.createdAt)}</td>
                          <td className="px-4 py-3 text-xs md:text-sm">{session.ipAddress ?? '—'}</td>
                          <td className="px-4 py-3 text-xs md:text-sm">{normalizeUserAgent(session.userAgent)}</td>
                          <td className="px-4 py-3">
                            {session.revokedAt ? (
                              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                                Завершена {formatDate(session.revokedAt)}
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">Активна</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={Boolean(session.revokedAt) || revokeInProgress === session.id}
                              onClick={() => handleRevoke(session.id)}
                              className="inline-flex items-center rounded-lg border border-red-500/50 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                            >
                              {revokeInProgress === session.id ? 'Завершение...' : session.revokedAt ? 'Завершена' : 'Завершить'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {actionError && <p className="mt-3 text-sm text-amber-200">{actionError}</p>}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">Последние действия</h3>
              {loading ? (
                <p className="mt-2 text-sm text-slate-400">Загрузка...</p>
              ) : auditLogs.length === 0 ? (
                <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
                  История действий пока пуста.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {auditLogs.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-white">{describeAction(entry.action)}</p>
                        <p className="text-xs text-slate-400">
                          IP: {entry.ipAddress ?? '—'} · Устройство: {normalizeUserAgent(entry.userAgent)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-xl font-semibold text-white">Смена пароля</h2>
          <p className="mt-1 text-sm text-slate-400">Используйте сильный пароль, чтобы защитить аккаунт.</p>

          <form className="mt-4 space-y-4" onSubmit={handlePasswordChange}>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-300" htmlFor="new-password">
                Новый пароль
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-secondary focus:outline-none"
                placeholder="Минимум 8 символов"
                minLength={8}
                required
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-300" htmlFor="confirm-password">
                Подтверждение пароля
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-secondary focus:outline-none"
                placeholder="Повторите пароль"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-secondary/90"
            >
              Обновить пароль
            </button>

            {passwordStatus && <p className="text-sm text-emerald-300">{passwordStatus}</p>}
            {actionError && <p className="text-sm text-amber-200">{actionError}</p>}
          </form>
        </section>
      </main>
    </>
  );
}
