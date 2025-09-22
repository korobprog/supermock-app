import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';

import { deleteAccount, exportUserData } from '@/lib/api';
import { useAuth } from '@/store/useAuth';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuth((state) => state.user);
  const isAuthenticated = useAuth((state) => state.isAuthenticated);

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleExport = async () => {
    if (!user) {
      setExportError('Авторизуйтесь, чтобы выгрузить данные.');
      return;
    }

    setIsExporting(true);
    setExportError(null);

    try {
      const blob = await exportUserData(user.id);
      const mimeType = blob.type?.toLowerCase?.() ?? 'application/json';
      const extension = mimeType.includes('gzip') ? 'json.gz' : 'json';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `supermock-user-export-${timestamp}.${extension}`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Не удалось выгрузить данные');
    } finally {
      setIsExporting(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteError(null);
    setPassword('');
    setToken('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!user) {
      setDeleteError('Не удалось определить пользователя.');
      return;
    }

    const passwordValue = password.trim();
    const tokenValue = token.trim();

    if (!passwordValue && !tokenValue) {
      setDeleteError('Введите пароль или одноразовый токен.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount(user.id, {
        password: passwordValue || undefined,
        token: tokenValue || undefined
      });

      setShowDeleteModal(false);
      setPassword('');
      setToken('');
      useAuth.getState().logout();
      await router.replace('/');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Не удалось удалить аккаунт');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Профиль — SuperMock</title>
      </Head>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h1 className="text-2xl font-semibold text-white">Профиль</h1>
          {isAuthenticated && user ? (
            <p className="mt-2 text-sm text-slate-400">Вход выполнен для {user.email}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Авторизуйтесь, чтобы управлять личными данными.</p>
          )}
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Управление данными</h2>
          <p className="mt-2 text-sm text-slate-400">
            Вы можете выгрузить копию профиля, включая анкеты кандидата и интервьюера, а также сохранённые уведомления.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={!user || isExporting}
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isExporting ? 'Формируем архив…' : 'Выгрузить данные'}
            </button>
            <span className="text-xs text-slate-500">
              Файл будет сохранён в формате JSON. Для архива укажите параметр «format=zip».
            </span>
          </div>

          {exportError && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {exportError}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="font-semibold">Удаление аккаунта</p>
            <p className="mt-2 text-amber-100/80">
              Все данные, включая анкеты и уведомления, будут безвозвратно удалены. Для подтверждения требуется пароль или
              одноразовый токен подтверждения.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={!user}
                className="inline-flex items-center gap-2 rounded-md border border-red-500/70 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Удалить аккаунт
              </button>
              <span className="text-xs text-amber-200/80">
                После подтверждения токены будут отозваны, активные сессии завершатся.
              </span>
            </div>
          </div>
        </section>

        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
            onClick={closeDeleteModal}
          >
            <div
              className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/70"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 id="delete-account-title" className="text-lg font-semibold text-white">
                Подтверждение удаления
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Подтвердите, что хотите удалить учётную запись. Укажите текущий пароль или одноразовый токен подтверждения.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="delete-password">
                    Пароль
                  </label>
                  <input
                    id="delete-password"
                    type="password"
                    autoComplete="current-password"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (deleteError) {
                        setDeleteError(null);
                      }
                    }}
                    placeholder="Введите пароль"
                    disabled={isDeleting}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="delete-token">
                    Одноразовый токен
                  </label>
                  <input
                    id="delete-token"
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white shadow-inner shadow-slate-950/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/60"
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value);
                      if (deleteError) {
                        setDeleteError(null);
                      }
                    }}
                    placeholder="Вставьте полученный токен"
                    disabled={isDeleting}
                  />
                  <p className="mt-1 text-xs text-slate-500">Можно заполнить только одно поле: пароль или токен.</p>
                </div>
              </div>

              {deleteError && (
                <p className="mt-3 text-sm text-red-400" role="alert">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow shadow-red-900/50 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Удаляем…' : 'Удалить аккаунт'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
