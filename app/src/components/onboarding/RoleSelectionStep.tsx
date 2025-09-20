import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import OnboardingProgress from './OnboardingProgress';
import { fetchMatchOverview } from '@/lib/api';
import { useUserProfile } from '@/store/useUserProfile';
import type { UserRole } from '../../../../shared/src/types/user.js';

import OnboardingProgress from './OnboardingProgress';

const SESSION_REWARD_USD = 65;

type RoleCardRole = Extract<UserRole, 'CANDIDATE' | 'INTERVIEWER'>;

type RoleCardConfig = {
  id: RoleCardRole;
  purpose: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string }>;
};

function formatUsd(amount: number) {
  return `$${amount.toLocaleString('en-US')}`;
}

function buildCardClassName(isActive: boolean) {
  const base =
    'flex h-full flex-col gap-4 rounded-2xl border px-6 py-5 text-left transition hover:border-secondary/60 hover:shadow-lg hover:shadow-secondary/20';
  const active = 'border-secondary bg-secondary/10 text-white shadow-lg shadow-secondary/20';
  const inactive = 'border-slate-800 bg-slate-950/70 text-slate-200';
  return `${base} ${isActive ? active : inactive}`;
}

export default function RoleSelectionStep() {
  const profile = useUserProfile((state) => state.profile);
  const setRole = useUserProfile((state) => state.setRole);

  const overviewQuery = useQuery({
    queryKey: ['matching', 'overview'],
    queryFn: fetchMatchOverview,
    staleTime: 1000 * 60
  });

  const queuedRequests = overviewQuery.data?.queuedRequests ?? 0;
  const scheduledMatches = overviewQuery.data?.scheduledMatches ?? 0;

  const demandGap = Math.max(queuedRequests - scheduledMatches, 0);
  const estimatedWaitMinutes = useMemo(() => {
    if (queuedRequests === 0) {
      return 5;
    }
    const ratio = queuedRequests / Math.max(scheduledMatches, 1);
    return Math.min(120, Math.max(10, Math.round(ratio * 20)));
  }, [queuedRequests, scheduledMatches]);

  const projectedIncome = useMemo(() => {
    const capacity = Math.max(scheduledMatches, 1) + demandGap;
    return Math.round(capacity * SESSION_REWARD_USD);
  }, [demandGap, scheduledMatches]);

  const recommendation = useMemo(() => {
    if (!overviewQuery.data) {
      return {
        label: 'Собираем статистику',
        role: null as const,
        explanation: 'Как только данные загрузятся, мы подскажем, кому выгода выше прямо сейчас.'
      };
    }

    if (demandGap > 1) {
      return {
        label: 'Сейчас выгодно стать интервьюером',
        role: 'INTERVIEWER' as const,
        explanation:
          'В очереди больше заявок, чем запланированных сессий. Дополнительные интервьюеры смогут быстро закрыть спрос и заработать больше.'
      };
    }

    return {
      label: 'Кандидаты проходят быстро',
      role: 'CANDIDATE' as const,
      explanation:
        'Свободные интервьюеры доступны прямо сейчас. Очередь небольшая - вы быстрее попадёте на сессию.'
    };
  }, [overviewQuery.data, demandGap]);

  const roleCards = useMemo<RoleCardConfig[]>(
    () => [
      {
        id: 'CANDIDATE',
        purpose: 'Для практики',
        title: 'Стать кандидатом',
        description:
          'Получайте собеседования по выбранной профессии и языку. После каждой сессии - структурированный разбор от интервьюера и AI.',
        stats: [
          {
            label: 'Активных заявок в очереди',
            value: String(queuedRequests)
          },
          {
            label: 'Прогноз ожидания',
            value: `~${estimatedWaitMinutes} мин`
          },
          {
            label: 'Доступные направления',
            value: '18+ IT профилей'
          }
        ]
      },
      {
        id: 'INTERVIEWER',
        purpose: 'Для экспертов',
        title: 'Стать интервьюером',
        description:
          'Делитесь опытом, ведите до 5 сессий в день и получайте вознаграждение. Система подбирает кандидатов по стеку, знаниям и часовому поясу.',
        stats: [
          {
            label: 'Запланировано сессий',
            value: String(scheduledMatches)
          },
          {
            label: 'Ожидающих кандидатов',
            value: String(queuedRequests)
          },
          {
            label: 'Потенциал дохода (≈)',
            value: formatUsd(projectedIncome)
          }
        ]
      }
    ],
    [estimatedWaitMinutes, projectedIncome, queuedRequests, scheduledMatches]
  );

  return (
    <section className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary/80">
            Step 4 · Onboarding
          </span>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">Выберите вашу роль на платформе</h1>
          <p className="max-w-xl text-sm text-slate-300">
            От роли зависит доступный функционал, тип уведомлений и интерфейсы. Статистика ниже поможет выбрать более
            выгодный сценарий прямо сейчас.
          </p>
        </div>
        <OnboardingProgress currentStep={4} totalSteps={4} />
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {roleCards.map((card) => {
          const isActive = profile.role === card.id;
          const isRecommended = recommendation.role === card.id;

          return (
            <button
              key={card.id}
              type="button"
              className={buildCardClassName(isActive)}
              onClick={() => setRole(card.id)}
              aria-pressed={isActive}
              data-role={card.id.toLowerCase()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary/80">{card.purpose}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{card.title}</h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isRecommended && (
                    <span className="rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                      Выгодно сейчас
                    </span>
                  )}
                  {isActive && (
                    <span className="rounded-full border border-secondary/80 bg-secondary/20 px-3 py-1 text-xs font-semibold text-secondary">
                      Вы выбрали
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-slate-300">{card.description}</p>
              <dl className="grid gap-3 text-sm">
                {card.stats.map((stat) => (
                  <div key={`${card.id}-${stat.label}`} className="flex items-center justify-between">
                    <dt className="text-slate-400">{stat.label}</dt>
                    <dd className="font-semibold text-white">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </button>
          );
        })}
      </div>
      <aside className="mt-6 space-y-3 rounded-2xl border border-secondary/40 bg-secondary/10 px-5 py-4">
        <p className="text-sm font-semibold text-secondary">{recommendation.label}</p>
        <p className="text-sm text-slate-200">{recommendation.explanation}</p>
        {overviewQuery.isLoading && (
          <p className="text-xs text-slate-400">Загружаем данные...</p>
        )}
      </aside>
    </section>
  );
}
