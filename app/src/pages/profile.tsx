import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';

import { useAuth } from '@/store/useAuth';
import { fetchUserById, updateUserProfile } from '@/lib/api';
import {
  DEFAULT_USER_SUBSCRIPTION,
  resolveUserBilling
} from '@/lib/payments';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES
} from '../../../shared/src/types/user.js';
import type {
  SubscriptionPlan,
  SubscriptionStatus,
  UserSubscriptionPreferences
} from '../../../shared/src/types/user.js';
import { listSupportedPaymentCountries } from '../../../shared/src/utils/payments.js';

const COUNTRY_LABELS: Record<string, string> = {
  RU: 'Россия',
  BY: 'Беларусь',
  KZ: 'Казахстан',
  AM: 'Армения',
  KG: 'Кыргызстан',
  US: 'США',
  CA: 'Канада',
  GB: 'Великобритания',
  IE: 'Ирландия',
  FR: 'Франция',
  DE: 'Германия',
  ES: 'Испания',
  IT: 'Италия',
  NL: 'Нидерланды',
  BE: 'Бельгия',
  PT: 'Португалия',
  FI: 'Финляндия',
  SE: 'Швеция',
  DK: 'Дания',
  NO: 'Норвегия',
  IN: 'Индия',
  BR: 'Бразилия',
  MX: 'Мексика',
  CO: 'Колумбия',
  CL: 'Чили',
  PE: 'Перу',
  NG: 'Нигерия',
  KE: 'Кения',
  GH: 'Гана',
  ZA: 'ЮАР',
  AE: 'ОАЭ',
  SA: 'Саудовская Аравия',
  ZZ: 'Глобальный fallback'
};

const SUPPORTED_COUNTRY_CODES = Array.from(
  new Set([...listSupportedPaymentCountries(), DEFAULT_USER_SUBSCRIPTION.country])
).sort();

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: 'Free',
  TEAM: 'Team',
  PRO: 'Pro'
};

const PLAN_DESCRIPTIONS: Record<SubscriptionPlan, string> = {
  FREE: 'Открытая демо-версия для знакомства с платформой и тестовых сессий.',
  TEAM: 'Командный план с управлением слотами, совместными заметками и локальными платежами.',
  PRO: 'Полный доступ к AI-аналитике, webhook-уведомлениям и автоматическим счетам.'
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  inactive: 'Не активна',
  trialing: 'Пробный период',
  active: 'Активна',
  past_due: 'Есть задолженность',
  canceled: 'Отменена'
};

const YOOMONEY_STEPS = [
  {
    title: 'Регистрация и настройка в YooMoney',
    tasks: [
      'Создать кошелёк YooMoney (41001337976323) и включить расширенную идентификацию.',
      'Зарегистрировать приложение на https://yoomoney.ru/myservices/new с success URL https://app.supermock.ru/successful-payment.',
      'Получить client_id и client_secret, выдать доступ account-info, operation-history, operation-details, incoming-transfers.'
    ]
  },
  {
    title: 'Настройка HTTP-уведомлений',
    tasks: [
      'Активировать HTTP-уведомления в кабинете и указать https://app.supermock.ru/api/payments/yoomoney/webhook.',
      'Сгенерировать секретное слово для подписи и протестировать уведомление через консоль YooMoney.'
    ]
  },
  {
    title: 'Разработка платежной формы',
    tasks: [
      'Собрать quickpay-форму c полями receiver, quickpay-form=shop, targets, sum, paymentType, label.',
      'Настроить successURL и failURL, обеспечить генерацию уникальной метки платежа.'
    ]
  },
  {
    title: 'Серверная обработка',
    tasks: [
      'Создать endpoint POST /api/payments/yoomoney/webhook и проверять sha1_hash по формуле из документации.',
      'Сохранять operation_id, amount, currency и обновлять статус платежа (COMPLETED/FAILED).' 
    ]
  }
] as const;

type InvoiceStatus = 'idle' | 'loading' | 'success' | 'error';

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Неизвестная ошибка';
}

function arraysEqual(a?: string[], b?: string[]) {
  if (!a && !b) {
    return true;
  }

  if (!a || !b || a.length !== b.length) {
    return false;
  }

  return a.every((value, index) => value === b[index]);
}

function subscriptionsEqual(
  a: UserSubscriptionPreferences,
  b: UserSubscriptionPreferences
) {
  return (
    a.plan === b.plan &&
    a.status === b.status &&
    a.country === b.country &&
    (a.currency ?? '') === (b.currency ?? '') &&
    a.provider === b.provider &&
    (a.requestedInvoiceAt ?? null) === (b.requestedInvoiceAt ?? null) &&
    arraysEqual(a.complianceAcknowledged, b.complianceAcknowledged)
  );
}

function formatCountry(code: string) {
  const label = COUNTRY_LABELS[code] ?? 'Неизвестная страна';
  return `${code} — ${label}`;
}

export default function ProfileBillingPage() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [subscriptionDraft, setSubscriptionDraft] = useState<UserSubscriptionPreferences>(
    DEFAULT_USER_SUBSCRIPTION
  );
  const [isPlanEditing, setIsPlanEditing] = useState(false);
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>('idle');
  const [invoiceMessage, setInvoiceMessage] = useState<string | null>(null);
  const planSelectRef = useRef<HTMLSelectElement | null>(null);

  const userQuery = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserById(userId!),
    enabled: Boolean(userId)
  });

  const savedSubscription = useMemo(
    () =>
      userQuery.data
        ? resolveUserBilling(userQuery.data.profile ?? undefined).subscription
        : DEFAULT_USER_SUBSCRIPTION,
    [userQuery.data]
  );

  useEffect(() => {
    if (userQuery.data) {
      setSubscriptionDraft((prev) =>
        subscriptionsEqual(prev, savedSubscription) ? prev : savedSubscription
      );
    } else {
      setSubscriptionDraft(DEFAULT_USER_SUBSCRIPTION);
    }
  }, [userQuery.data, savedSubscription]);

  const resolvedBilling = useMemo(
    () => resolveUserBilling({ subscription: subscriptionDraft }),
    [subscriptionDraft]
  );

  const updateSubscription = (
    patch:
      | Partial<UserSubscriptionPreferences>
      | ((prev: UserSubscriptionPreferences) => Partial<UserSubscriptionPreferences>)
  ) => {
    setSubscriptionDraft((prev) => {
      const updates = typeof patch === 'function' ? patch(prev) : patch;
      const next = { ...prev, ...updates };
      return resolveUserBilling({ subscription: next }).subscription;
    });
  };

  const updateMutation = useMutation({
    mutationKey: ['update-user-subscription', userId],
    mutationFn: async (nextSubscription: UserSubscriptionPreferences) => {
      if (!userId) {
        throw new Error('Требуется авторизация, чтобы сохранить настройки биллинга.');
      }

      const profilePayload =
        userQuery.data?.profile && typeof userQuery.data.profile === 'object'
          ? { ...userQuery.data.profile }
          : {};

      const subscriptionPayload: UserSubscriptionPreferences = {
        ...nextSubscription,
        complianceAcknowledged: nextSubscription.complianceAcknowledged
          ? [...nextSubscription.complianceAcknowledged]
          : undefined,
        requestedInvoiceAt: nextSubscription.requestedInvoiceAt
      };

      return updateUserProfile(userId, {
        profile: {
          ...profilePayload,
          subscription: subscriptionPayload
        }
      });
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user-profile', userId], updatedUser);
      const resolved = resolveUserBilling(updatedUser.profile ?? undefined);
      setSubscriptionDraft(resolved.subscription);
    }
  });

  const isDirty = !subscriptionsEqual(subscriptionDraft, savedSubscription);
  const currencyOptions = useMemo(() => {
    const ordered = [...resolvedBilling.providerCard.availableCurrencies].sort((a, b) =>
      a.localeCompare(b)
    );
    const current = resolvedBilling.subscription.currency;
    ordered.sort((a, b) => {
      if (a === current) {
        return -1;
      }
      if (b === current) {
        return 1;
      }
      return a.localeCompare(b);
    });
    return ordered;
  }, [resolvedBilling.providerCard.availableCurrencies, resolvedBilling.subscription.currency]);

  const countryOptions = useMemo(() => {
    const ordered = [...SUPPORTED_COUNTRY_CODES];
    const current = resolvedBilling.subscription.country;
    ordered.sort((a, b) => {
      if (a === current) {
        return -1;
      }
      if (b === current) {
        return 1;
      }
      return a.localeCompare(b);
    });
    return ordered;
  }, [resolvedBilling.subscription.country]);

  const handleTogglePlan = () => {
    setIsPlanEditing((prev) => {
      const next = !prev;
      if (!prev) {
        requestAnimationFrame(() => {
          planSelectRef.current?.focus();
        });
      }
      return next;
    });
  };

  const handlePlanChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextPlan = event.target.value as SubscriptionPlan;
    updateSubscription((prev) => {
      const nextStatus: SubscriptionStatus =
        nextPlan === 'FREE'
          ? 'inactive'
          : prev.plan === nextPlan
          ? prev.status
          : prev.status === 'active' || prev.status === 'past_due'
          ? prev.status
          : 'trialing';

      return {
        plan: nextPlan,
        status: nextStatus
      };
    });
  };

  const handleCountryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateSubscription({ country: event.target.value });
  };

  const handleCurrencyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateSubscription({ currency: event.target.value });
  };

  const handleComplianceToggle = (label: string) => {
    const checklistOrder = resolvedBilling.providerCard.complianceChecklist.map(
      (item) => item.label
    );
    updateSubscription((prev) => {
      const acknowledged = new Set(prev.complianceAcknowledged ?? []);
      if (acknowledged.has(label)) {
        acknowledged.delete(label);
      } else {
        acknowledged.add(label);
      }

      const ordered = checklistOrder.filter((item) => acknowledged.has(item));
      return {
        complianceAcknowledged: ordered.length > 0 ? ordered : undefined
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setInvoiceStatus('error');
      setInvoiceMessage('Авторизуйтесь, чтобы сохранить предпочтения.');
      return;
    }

    try {
      await updateMutation.mutateAsync(resolvedBilling.subscription);
      setInvoiceStatus('idle');
      setInvoiceMessage(null);
    } catch (error) {
      setInvoiceStatus('error');
      setInvoiceMessage(toMessage(error));
    }
  };

  const handleRequestInvoice = async () => {
    setInvoiceStatus('loading');
    setInvoiceMessage(null);

    try {
      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId ?? 'anonymous',
          subscription: resolvedBilling.subscription
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message ?? 'Не удалось отправить запрос на счёт.');
      }

      const timestamp = new Date().toISOString();
      const nextSubscription: UserSubscriptionPreferences = {
        ...resolvedBilling.subscription,
        complianceAcknowledged: resolvedBilling.subscription.complianceAcknowledged
          ? [...resolvedBilling.subscription.complianceAcknowledged]
          : undefined,
        requestedInvoiceAt: timestamp
      };
      updateSubscription(() => nextSubscription);

      if (userId) {
        await updateMutation.mutateAsync(nextSubscription);
      }

      setInvoiceStatus('success');
      setInvoiceMessage(
        payload?.message ?? 'Запрос на счёт добавлен в очередь (stub, вебхуки ещё не подключены).'
      );
    } catch (error) {
      setInvoiceStatus('error');
      setInvoiceMessage(toMessage(error));
    }
  };

  return (
    <>
      <Head>
        <title>Профиль · Биллинг</title>
      </Head>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 text-slate-100">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-white">Биллинг и подписка</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Управляйте тарифом SuperMock, выбирайте рекомендованного платёжного провайдера и следите за
            чек-листом комплаенса из <code className="rounded bg-slate-800 px-1">docs/tudo_yoom.md</code>.
          </p>
          {!userId && (
            <p className="text-xs text-amber-400">
              Вы просматриваете демо. Авторизуйтесь, чтобы сохранить изменения в профиле.
            </p>
          )}
          {userQuery.isError && (
            <p className="text-xs text-rose-300">
              Не удалось загрузить профиль: {toMessage(userQuery.error)}
            </p>
          )}
          {userQuery.isFetching && userId && (
            <p className="text-xs text-slate-500">Обновляем данные профиля…</p>
          )}
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Текущий тариф</h2>
                <p className="text-sm text-slate-400">
                  {PLAN_LABELS[resolvedBilling.subscription.plan]} ·{' '}
                  {STATUS_LABELS[resolvedBilling.subscription.status]}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTogglePlan}
                className="rounded-lg border border-secondary/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary transition hover:border-secondary hover:bg-secondary/10"
              >
                {isPlanEditing ? 'Закрыть выбор' : 'Сменить план'}
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-300">
              {PLAN_DESCRIPTIONS[resolvedBilling.subscription.plan]}
            </p>

            {isPlanEditing && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="plan-select">
                  Выбор плана
                </label>
                <select
                  id="plan-select"
                  ref={planSelectRef}
                  value={resolvedBilling.subscription.plan}
                  onChange={handlePlanChange}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {PLAN_LABELS[plan]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Изменение плана автоматически обновит рекомендованного провайдера и валюту счёта.
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Рекомендации</span>
                <p className="mt-2 text-sm font-semibold text-white">
                  {resolvedBilling.providerCard.recommendedProvider.displayName}
                </p>
                {!resolvedBilling.providerCard.isRecommended && (
                  <p className="mt-1 text-xs text-amber-400">
                    Выбрано: {resolvedBilling.providerCard.provider.displayName}. Рекомендуемый провайдер будет использоваться по умолчанию.
                  </p>
                )}
                <p className="mt-3 text-xs text-slate-400">
                  Регион: {resolvedBilling.providerCard.region} · ISO: {resolvedBilling.providerCard.matchedCountry}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Валюта биллинга: {resolvedBilling.providerCard.currency}
                </p>
                {resolvedBilling.providerCard.highRisk && (
                  <p className="mt-2 rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    Регион помечен как high-risk. Запросы будут проверяться вручную.
                  </p>
                )}
                {resolvedBilling.providerCard.fallbacks.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Резерв</span>
                    <ul className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                      {resolvedBilling.providerCard.fallbacks.map((fallback) => (
                        <li key={fallback.provider} className="rounded-full border border-slate-700 px-3 py-1">
                          {fallback.displayName}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Локальные методы</span>
                <ul className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                  {resolvedBilling.providerCard.localMethods.map((method) => (
                    <li key={method} className="rounded-full bg-slate-800 px-3 py-1">
                      {method}
                    </li>
                  ))}
                </ul>
                {resolvedBilling.providerCard.notes.length > 0 && (
                  <div className="mt-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Заметки</span>
                    <ul className="mt-1 list-disc pl-5 text-xs text-slate-400">
                      {resolvedBilling.providerCard.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  <Link
                    href={`/api/billing/providers/${resolvedBilling.providerCard.provider.provider.toLowerCase()}`}
                    className="font-mono text-secondary hover:text-secondary/80"
                  >
                    GET /api/billing/providers/{resolvedBilling.providerCard.provider.provider.toLowerCase()}
                  </Link>
                  <Link href="/api/billing/invoices" className="font-mono text-secondary hover:text-secondary/80">
                    GET /api/billing/invoices
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="text-sm font-semibold text-white">Compliance чек-лист</h3>
              <p className="mt-1 text-xs text-slate-500">
                Отметьте шаги, выполненные для запуска биллинга. Список синхронизируется вместе с профилем пользователя.
              </p>
              <ul className="mt-3 space-y-2">
                {resolvedBilling.providerCard.complianceChecklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-secondary focus:ring-secondary/60"
                      checked={item.acknowledged}
                      onChange={() => handleComplianceToggle(item.label)}
                    />
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </li>
                ))}
              </ul>
              {resolvedBilling.providerCard.allComplianceAcknowledged ? (
                <p className="mt-3 rounded bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  Все контрольные шаги выполнены. Можно подключать вебхуки YooMoney.
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  Не забудьте пройтись по каждому пункту перед включением автоматической выдачи счётов.
                </p>
              )}
            </div>
          </article>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="country-select">
                  Страна клиентов
                </label>
                <select
                  id="country-select"
                  value={resolvedBilling.subscription.country}
                  onChange={handleCountryChange}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  {countryOptions.map((code) => (
                    <option key={code} value={code}>
                      {formatCountry(code)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400" htmlFor="currency-select">
                  Валюта выписки
                </label>
                <select
                  id="currency-select"
                  value={resolvedBilling.subscription.currency}
                  onChange={handleCurrencyChange}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40"
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Доступные валюты подбираются из поддерживаемых методов {resolvedBilling.providerCard.provider.displayName}.
                </p>
              </div>

              <button
                type="submit"
                disabled={!userId || !isDirty || updateMutation.isPending}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:bg-secondary/30"
              >
                Сохранить предпочтения
              </button>
              {updateMutation.isPending && (
                <p className="text-xs text-slate-400">Сохраняем изменения…</p>
              )}
              {updateMutation.isError && (
                <p className="text-xs text-rose-300">{toMessage(updateMutation.error)}</p>
              )}
              {!isDirty && userId && !updateMutation.isPending && (
                <p className="text-xs text-emerald-300">Настройки синхронизированы с профилем.</p>
              )}

              <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Запросить счёт</h3>
                  <span className="text-xs text-slate-500">YooMoney stub</span>
                </div>
                <p className="text-xs text-slate-400">
                  После подключения вебхуков кнопка вызовет реальный инвойс. Сейчас эндпоинт вернёт stub-ответ и сохранит отметку в профиле.
                </p>
                <button
                  type="button"
                  onClick={handleRequestInvoice}
                  disabled={invoiceStatus === 'loading'}
                  className="rounded-lg border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:border-emerald-500/40 disabled:text-emerald-500/40"
                >
                  Запросить счёт
                </button>
                {resolvedBilling.subscription.requestedInvoiceAt && (
                  <p className="text-xs text-slate-500">
                    Последний запрос: {new Date(resolvedBilling.subscription.requestedInvoiceAt).toLocaleString('ru-RU')}
                  </p>
                )}
                {invoiceMessage && (
                  <p
                    className={`text-xs ${
                      invoiceStatus === 'success'
                        ? 'text-emerald-300'
                        : invoiceStatus === 'error'
                        ? 'text-rose-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {invoiceMessage}
                  </p>
                )}
              </div>
            </form>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <h2 className="text-lg font-semibold text-white">Пошаговый план YooMoney</h2>
          <p className="mt-2 text-sm text-slate-400">
            Чек-лист повторяет требования из <code className="rounded bg-slate-800 px-1">docs/tudo_yoom.md</code> и помогает подготовить инфраструктуру до подключения реальных платежей.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {YOOMONEY_STEPS.map((section) => (
              <article key={section.title} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                <ul className="mt-2 list-disc pl-5 text-xs text-slate-300">
                  {section.tasks.map((task) => (
                    <li key={task}>{task}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
