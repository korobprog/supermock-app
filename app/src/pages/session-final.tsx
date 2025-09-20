import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Head from 'next/head';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  SparklesIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

type DiscussionLogEntry = {
  id: string;
  topic: string;
  summary: string;
  owner: 'interviewer' | 'candidate' | 'system';
  status: 'done' | 'pending';
  timeRange: string;
};

const DISCUSSION_LOG: DiscussionLogEntry[] = [
  {
    id: 'introduction',
    topic: 'Знакомство и ожидания',
    summary: 'Синхронизировались по формату интервью и целям найма на роль Senior Frontend.',
    owner: 'interviewer',
    status: 'done',
    timeRange: '00:00 – 00:05'
  },
  {
    id: 'behavioral',
    topic: 'Поведенческие вопросы',
    summary: 'Разобрали последние проекты кандидата и подход к работе с распределённой командой.',
    owner: 'candidate',
    status: 'done',
    timeRange: '00:05 – 00:20'
  },
  {
    id: 'system-design',
    topic: 'System design',
    summary: 'Спроектировали модуль уведомлений: обсудили ограничения, API и стратегию деградации.',
    owner: 'interviewer',
    status: 'done',
    timeRange: '00:20 – 00:45'
  },
  {
    id: 'coding',
    topic: 'Лайвкодинг',
    summary: 'Осталось реализовать оптимизацию по времени для задачи про расписание поставок.',
    owner: 'candidate',
    status: 'pending',
    timeRange: 'Запланировано на 00:45 – 01:05'
  },
  {
    id: 'wrap-up',
    topic: 'Финальные вопросы',
    summary: 'Сохранить 5 минут, чтобы собрать вопросы кандидата и договориться по фоллоу-апу.',
    owner: 'interviewer',
    status: 'pending',
    timeRange: 'Запланировано на 01:05 – 01:10'
  }
];

const FEEDBACK_STEPS = [
  {
    id: 1,
    title: 'Интервьюер',
    description: 'Решение по кандидату, впечатления и рекомендации'
  },
  {
    id: 2,
    title: 'Кандидат',
    description: 'Фидбек для кандидата и договорённости по follow-up'
  }
];

function formatDurationLabel(diffMs: number) {
  if (diffMs <= 0) {
    return '0 мин';
  }

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours} ч ${minutes.toString().padStart(2, '0')} мин`;
  }

  if (hours) {
    return `${hours} ч`;
  }

  return `${minutes} мин`;
}

function formatTimeLeft(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function SessionFinalStagePage() {
  const [scheduledEnd, setScheduledEnd] = useState(() => new Date(Date.now() + 5 * 60 * 1000));
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(() =>
    Math.max(0, Math.round((scheduledEnd.getTime() - Date.now()) / 1000))
  );
  const [allocatedDuration, setAllocatedDuration] = useState(() =>
    Math.max(0, Math.round((scheduledEnd.getTime() - Date.now()) / 1000))
  );
  const [extendCount, setExtendCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 0) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleExtend = () => {
    const extensionSeconds = 15 * 60;
    setScheduledEnd((prev) => new Date(prev.getTime() + extensionSeconds * 1000));
    setTimeLeftSeconds((prev) => prev + extensionSeconds);
    setAllocatedDuration((prev) => prev + extensionSeconds);
    setExtendCount((prev) => prev + 1);
  };

  const elapsedSeconds = useMemo(() => {
    if (allocatedDuration === 0) {
      return 0;
    }
    return Math.min(allocatedDuration, Math.max(0, allocatedDuration - timeLeftSeconds));
  }, [allocatedDuration, timeLeftSeconds]);

  const timeProgress = useMemo(() => {
    if (allocatedDuration === 0) {
      return 100;
    }
    return Math.min(100, Math.max(0, (elapsedSeconds / allocatedDuration) * 100));
  }, [allocatedDuration, elapsedSeconds]);

  const endTimeLabel = useMemo(
    () => scheduledEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    [scheduledEnd]
  );

  const discussionSummary = useMemo(() => {
    return {
      completed: DISCUSSION_LOG.filter((item) => item.status === 'done'),
      pending: DISCUSSION_LOG.filter((item) => item.status === 'pending')
    };
  }, []);

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [completedSteps, setCompletedSteps] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const [interviewerHighlights, setInterviewerHighlights] = useState(
    'Уверенно ведёт собеседование, глубоко погружается в детали и остаётся в рамках тайминга.'
  );
  const [interviewerRisks, setInterviewerRisks] = useState(
    'Попросить раскрыть подход к разбору legacy-кода: пока нет чёткого плана.'
  );
  const [interviewerDecision, setInterviewerDecision] = useState('RECOMMEND');

  const [candidateStrengths, setCandidateStrengths] = useState(
    'Структурное мышление, умеет торговать scope и предлагает метрики успеха.'
  );
  const [candidateFocusAreas, setCandidateFocusAreas] = useState(
    'Прокачать работу с производительностью React-приложений, добавить больше примеров.'
  );
  const [candidateNextSteps, setCandidateNextSteps] = useState('Поделиться дизайном задания и ресурсами по веб-производительности.');

  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const draftExpiresAt = useMemo(() => {
    if (!draftSavedAt) {
      return null;
    }

    return new Date(draftSavedAt.getTime() + 2 * 60 * 60 * 1000);
  }, [draftSavedAt]);
  const [draftRemainingLabel, setDraftRemainingLabel] = useState('');

  useEffect(() => {
    if (!draftExpiresAt) {
      setDraftRemainingLabel('');
      return;
    }

    const updateRemaining = () => {
      const diff = draftExpiresAt.getTime() - Date.now();
      setDraftRemainingLabel(formatDurationLabel(diff));
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [draftExpiresAt]);

  const draftExpiresLabel = useMemo(() => {
    if (!draftExpiresAt) {
      return '';
    }

    return draftExpiresAt.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [draftExpiresAt]);

  const progressPercent = completedSteps === 0 ? 0 : completedSteps === 1 ? 50 : 100;

  const handleSaveDraft = () => {
    setDraftSavedAt(new Date());
    setFeedbackSubmitted(false);
  };

  const handleInterviewerSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompletedSteps((prev) => Math.max(prev, 1));
    setCurrentStep(2);
    setFeedbackSubmitted(false);
  };

  const handleCandidateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCompletedSteps(2);
    setFeedbackSubmitted(true);
  };

  return (
    <>
      <Head>
        <title>Финал сессии · SuperMock</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-12 text-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/40">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
                  <ExclamationTriangleIcon className="h-7 w-7 text-amber-400" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Финальный этап</p>
                  <h1 className="mt-1 text-3xl font-semibold text-white md:text-4xl">
                    До конца интервью {formatTimeLeft(timeLeftSeconds)}
                  </h1>
                  <p className="mt-2 text-sm text-slate-400">
                    SuperMock предупредил участников заранее. Можно продлить слот без выхода из комнаты.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-amber-200">
                      <ClockIcon className="h-4 w-4" /> Запланированное завершение в {endTimeLabel}
                    </span>
                    {extendCount > 0 ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/5 px-3 py-1 text-amber-200/80">
                        <ArrowPathIcon className="h-4 w-4" /> Продлено {extendCount} {extendCount === 1 ? 'раз' : 'раза'}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <div className="rounded-2xl border border-amber-400/50 bg-slate-950/60 px-5 py-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-200/70">Осталось</p>
                  <p className="font-mono text-3xl font-semibold text-white">{formatTimeLeft(timeLeftSeconds)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleExtend}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-400"
                >
                  <ArrowPathIcon className="h-5 w-5" /> Продлить на 15 минут
                </button>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.3em] text-amber-200/80">
                <span className={progressPercent >= 0 ? 'text-amber-200' : 'text-amber-200/50'}>0%</span>
                <span className={progressPercent >= 50 ? 'text-amber-200' : 'text-amber-200/50'}>50%</span>
                <span className={progressPercent >= 100 ? 'text-amber-200' : 'text-amber-200/50'}>100%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-500/10">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${timeProgress}%` }}
                />
              </div>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/30">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Лог обсуждения</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Что обсудили · что осталось</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Заполняется автоматически: фиксируем темы, ведущего и статус прямо по ходу сессии.
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                  <SparklesIcon className="h-4 w-4" /> Автолог
                </span>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="font-semibold text-white">Обсудили</span>
                    <span className="rounded-full bg-slate-950/50 px-3 py-1 text-xs text-slate-400">
                      {discussionSummary.completed.length}
                    </span>
                  </div>
                  <ul className="space-y-4">
                    {discussionSummary.completed.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-inner shadow-slate-950/30"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="inline-flex items-center gap-2 text-secondary">
                            <CheckCircleIcon className="h-4 w-4" /> {item.owner === 'interviewer' ? 'Интервьюер' : item.owner === 'candidate' ? 'Кандидат' : 'Система'}
                          </span>
                          <span>{item.timeRange}</span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-white">{item.topic}</h3>
                        <p className="mt-2 text-sm text-slate-300">{item.summary}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="font-semibold text-white">В работе</span>
                    <span className="rounded-full bg-slate-950/50 px-3 py-1 text-xs text-slate-400">
                      {discussionSummary.pending.length}
                    </span>
                  </div>
                  <ul className="space-y-4">
                    {discussionSummary.pending.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-5"
                      >
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <ClockIcon className="h-4 w-4 text-slate-400" />
                            {item.owner === 'interviewer' ? 'Интервьюер' : item.owner === 'candidate' ? 'Кандидат' : 'Система'}
                          </span>
                          <span>{item.timeRange}</span>
                        </div>
                        <h3 className="mt-3 text-sm font-semibold text-white">{item.topic}</h3>
                        <p className="mt-2 text-sm text-slate-300">{item.summary}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/30">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Фидбек-мастер</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">Двухшаговый черновик</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Сначала фиксируем решение интервьюера, затем формируем сообщение для кандидата.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-xs uppercase tracking-wide text-slate-300">
                    <UserCircleIcon className="h-5 w-5" /> {currentStep === 1 ? 'Шаг 1 · Интервьюер' : 'Шаг 2 · Кандидат'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.3em] text-slate-400">
                    <span className={progressPercent >= 0 ? 'text-secondary' : 'text-slate-500'}>0%</span>
                    <span className={progressPercent >= 50 ? 'text-secondary' : 'text-slate-500'}>50%</span>
                    <span className={progressPercent >= 100 ? 'text-secondary' : 'text-slate-500'}>100%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-secondary transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {FEEDBACK_STEPS.map((step) => {
                    const isCompleted = completedSteps >= step.id;
                    const isActive = currentStep === step.id;

                    return (
                      <div
                        key={step.id}
                        className={`rounded-2xl border p-4 ${
                          isActive
                            ? 'border-secondary/60 bg-secondary/10 shadow-lg shadow-secondary/20'
                            : isCompleted
                            ? 'border-secondary/30 bg-secondary/5 text-secondary'
                            : 'border-slate-800 bg-slate-950/50'
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                          Шаг {step.id} / {FEEDBACK_STEPS.length}
                        </p>
                        <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
                        <p className="mt-1 text-xs text-slate-300">{step.description}</p>
                      </div>
                    );
                  })}
                </div>

                {draftSavedAt ? (
                  <div className="rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                    Черновик сохранён. Автоудаление через {draftRemainingLabel} (до {draftExpiresLabel}).
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                    Черновик пока не сохранён. Нажми «Сохранить», чтобы забронировать на 2 часа.
                  </div>
                )}

                {feedbackSubmitted ? (
                  <div className="rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                    Фидбек отправлен и доступен координатору SuperMock.
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                  {currentStep === 1 ? (
                    <form onSubmit={handleInterviewerSubmit} className="space-y-5">
                      <div>
                        <label htmlFor="interviewer-highlights" className="block text-sm font-medium text-white">
                          Что сработало лучше всего
                        </label>
                        <p className="mt-1 text-xs text-slate-400">Записываем сильные стороны и примеры поведения.</p>
                        <textarea
                          id="interviewer-highlights"
                          value={interviewerHighlights}
                          onChange={(event) => setInterviewerHighlights(event.target.value)}
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="interviewer-risks" className="block text-sm font-medium text-white">
                          Что насторожило
                        </label>
                        <p className="mt-1 text-xs text-slate-400">Факты и вопросы, которые нужно проверить на следующем этапе.</p>
                        <textarea
                          id="interviewer-risks"
                          value={interviewerRisks}
                          onChange={(event) => setInterviewerRisks(event.target.value)}
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="interviewer-decision" className="block text-sm font-medium text-white">
                          Решение интервьюера
                        </label>
                        <select
                          id="interviewer-decision"
                          value={interviewerDecision}
                          onChange={(event) => setInterviewerDecision(event.target.value)}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-secondary focus:outline-none"
                        >
                          <option value="RECOMMEND">Готов рекомендовать</option>
                          <option value="HOLD">Нужен дополнительный раунд</option>
                          <option value="NO">Не рекомендую</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          className="inline-flex items-center gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20"
                        >
                          <PencilSquareIcon className="h-5 w-5" /> Сохранить черновик
                        </button>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/30 transition hover:bg-secondary/90"
                        >
                          Продолжить к шагу 2
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleCandidateSubmit} className="space-y-5">
                      <div>
                        <label htmlFor="candidate-strengths" className="block text-sm font-medium text-white">
                          Что расскажем кандидату про сильные стороны
                        </label>
                        <textarea
                          id="candidate-strengths"
                          value={candidateStrengths}
                          onChange={(event) => setCandidateStrengths(event.target.value)}
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="candidate-focus" className="block text-sm font-medium text-white">
                          Зоны роста и материалы
                        </label>
                        <textarea
                          id="candidate-focus"
                          value={candidateFocusAreas}
                          onChange={(event) => setCandidateFocusAreas(event.target.value)}
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-secondary focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="candidate-next" className="block text-sm font-medium text-white">
                          Follow-up и договорённости
                        </label>
                        <textarea
                          id="candidate-next"
                          value={candidateNextSteps}
                          onChange={(event) => setCandidateNextSteps(event.target.value)}
                          rows={3}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-secondary focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-secondary/60 hover:text-secondary"
                          >
                            Назад к шагу 1
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveDraft}
                            className="inline-flex items-center gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20"
                          >
                            <PencilSquareIcon className="h-5 w-5" /> Сохранить черновик
                          </button>
                        </div>
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/30 transition hover:bg-secondary/90"
                        >
                          Отправить фидбек
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
