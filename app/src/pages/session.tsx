import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Head from 'next/head';
import {
  ArrowUpRightIcon,
  BellAlertIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  LifebuoyIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  ShieldExclamationIcon,
  WifiIcon
} from '@heroicons/react/24/outline';

type TimelineCheckpoint = {
  id: string;
  title: string;
  description: string;
  minutesBefore: number;
};

type TimelineItem = TimelineCheckpoint & {
  time: Date;
  status: 'complete' | 'active' | 'upcoming';
};

type ChecklistItem = {
  id: string;
  label: string;
};

type ChatMessage = {
  id: number;
  author: string;
  text: string;
  timestamp: Date;
  isSelf?: boolean;
};

type SafetyActionType = 'report' | 'moderator';

type SafetyActionState = {
  id: number;
  type: SafetyActionType;
  submittedAt: Date;
  status: 'pending' | 'acknowledged';
  acknowledgedAt?: Date;
};

const SAFETY_ACTION_LABELS: Record<SafetyActionType, string> = {
  report: 'Пожаловаться',
  moderator: 'Позвать модератора'
};

const SAFETY_ACTION_DESCRIPTIONS: Record<SafetyActionType, string> = {
  report: 'Сообщить о нарушении поведения, дискриминации или тревожном контенте.',
  moderator: 'Попросить сотрудника SuperMock присоединиться к комнате и помочь участникам.'
};

const SAFETY_STATUS_LABELS: Record<SafetyActionState['status'], string> = {
  pending: 'Ожидает ответа',
  acknowledged: 'Модератор подключается'
};

const TIMELINE_CHECKPOINTS: TimelineCheckpoint[] = [
  {
    id: 't-minus-40',
    title: 'За 40 минут',
    description: 'Просмотри резюме кандидата, выпиши ключевые вопросы и уточни критерии оценки.',
    minutesBefore: 40
  },
  {
    id: 't-minus-15',
    title: 'За 15 минут',
    description: 'Проверь подключение, зайди в предлобби и подготовься к тестовой встрече.',
    minutesBefore: 15
  },
  {
    id: 't-minus-5',
    title: 'За 5 минут',
    description: 'Открой рабочие документы, включи режим «Не беспокоить» и подними сценарий интервью.',
    minutesBefore: 5
  },
  {
    id: 'session-start',
    title: 'Старт сессии',
    description: 'Присоединяйся к комнате SuperMock и поприветствуй кандидата.',
    minutesBefore: 0
  }
];

const CHECKLIST: ChecklistItem[] = [
  { id: 'mic', label: 'Микрофон работает и уровень громкости комфортный' },
  { id: 'camera', label: 'Камера включена, фон и освещение в порядке' },
  { id: 'network', label: 'Интернет стабильный, VPN и обновления выключены' },
  { id: 'workspace', label: 'Рабочее пространство готово (IDE, песочница, документы)' }
];

function formatCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDateWithWeekday(date: Date) {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

function formatMinutesLabel(value: number) {
  const absolute = Math.abs(value);
  const remainderHundred = absolute % 100;

  if (remainderHundred >= 11 && remainderHundred <= 14) {
    return 'минут';
  }

  switch (absolute % 10) {
    case 1:
      return 'минуту';
    case 2:
    case 3:
    case 4:
      return 'минуты';
    default:
      return 'минут';
  }
}

export default function ActiveSessionPage() {
  const [sessionStart] = useState(() => new Date(Date.now() + 12 * 60 * 1000));
  const sessionEnd = useMemo(
    () => new Date(sessionStart.getTime() + 60 * 60 * 1000),
    [sessionStart]
  );

  const [now, setNow] = useState(() => new Date());
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHECKLIST.map((item) => [item.id, false]))
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 1,
      author: 'Интервьюер',
      text: 'Привет! Готовлю комнату, увидимся скоро.',
      timestamp: new Date(Date.now() - 6 * 60 * 1000)
    },
    {
      id: 2,
      author: 'SuperMock',
      text: 'Комната откроется за 5 минут до начала. Здесь можно протестировать WebRTC.',
      timestamp: new Date(Date.now() - 3 * 60 * 1000)
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [safetyActions, setSafetyActions] = useState<SafetyActionState[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const timeUntilStartMs = sessionStart.getTime() - now.getTime();
  const hasStarted = timeUntilStartMs <= 0;
  const isLobbyOpen = timeUntilStartMs <= 15 * 60 * 1000;
  const totalSecondsUntilStart = Math.max(0, Math.floor(timeUntilStartMs / 1000));

  const hours = Math.floor(totalSecondsUntilStart / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((totalSecondsUntilStart % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSecondsUntilStart % 60)
    .toString()
    .padStart(2, '0');

  const timelineItems: TimelineItem[] = useMemo(() => {
    const itemsWithTime = TIMELINE_CHECKPOINTS.map((checkpoint) => ({
      ...checkpoint,
      time: new Date(sessionStart.getTime() - checkpoint.minutesBefore * 60 * 1000)
    }));

    const activeIndex = itemsWithTime.reduce((acc, item, index) => {
      if (now >= item.time) {
        return index;
      }
      return acc;
    }, -1);

    return itemsWithTime.map((item, index) => {
      let status: TimelineItem['status'] = 'upcoming';

      if (activeIndex === index) {
        status = 'active';
      } else if (activeIndex > index) {
        status = 'complete';
      }

      return {
        ...item,
        status
      };
    });
  }, [now, sessionStart]);

  const completedChecklist = Object.values(checklistState).filter(Boolean).length;

  const sessionTitle = 'Mock interview · Frontend Senior';
  const sessionLocation = 'SuperMock Video Room';
  const sessionDescription =
    '60-минутная сессия по фронтенду. Подготовьте поведенческие и технические вопросы.';

  const calendarLinks = useMemo(() => {
    const start = formatCalendarDate(sessionStart);
    const end = formatCalendarDate(sessionEnd);
    const googleHref = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      sessionTitle
    )}&dates=${start}/${end}&details=${encodeURIComponent(
      sessionDescription
    )}&location=${encodeURIComponent(sessionLocation)}`;
    const outlookHref = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(
      sessionTitle
    )}&body=${encodeURIComponent(sessionDescription)}&location=${encodeURIComponent(
      sessionLocation
    )}&startdt=${encodeURIComponent(sessionStart.toISOString())}&enddt=${encodeURIComponent(
      sessionEnd.toISOString()
    )}`;

    const icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SuperMock//Session//EN\r\nBEGIN:VEVENT\r\nDTSTAMP:${start}\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${sessionTitle}\r\nDESCRIPTION:${sessionDescription}\r\nLOCATION:${sessionLocation}\r\nEND:VEVENT\r\nEND:VCALENDAR`;

    const icalHref = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;

    return {
      googleHref,
      outlookHref,
      icalHref
    };
  }, [sessionDescription, sessionEnd, sessionLocation, sessionStart, sessionTitle]);

  const minutesUntilStart = Math.max(0, Math.ceil(timeUntilStartMs / 60000));

  const handleChecklistToggle = (id: string) => {
    setChecklistState((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSendMessage = (text: string) => {
    const trimmed = text.trim();

    if (!trimmed) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        author: 'Вы',
        text: trimmed,
        timestamp: new Date(),
        isSelf: true
      }
    ]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSendMessage(chatInput);
    setChatInput('');
  };

  const handleQuickMessage = () => {
    handleSendMessage('Скоро буду');
  };

  const handleSafetyAction = (type: SafetyActionType) => {
    const actionId = Date.now();
    const newAction: SafetyActionState = {
      id: actionId,
      type,
      submittedAt: new Date(),
      status: 'pending'
    };

    setSafetyActions((prev) => [newAction, ...prev]);

    setTimeout(() => {
      setSafetyActions((prev) =>
        prev.map((action) =>
          action.id === actionId
            ? { ...action, status: 'acknowledged', acknowledgedAt: new Date() }
            : action
        )
      );
    }, 3500);
  };

  const latestSafetyAction = safetyActions[0];
  const safetyLiveMessage = latestSafetyAction
    ? `${SAFETY_ACTION_LABELS[latestSafetyAction.type]} · ${SAFETY_STATUS_LABELS[latestSafetyAction.status]}`
    : 'Активных запросов в модерацию нет.';

  return (
    <>
      <Head>
        <title>Active session · SuperMock</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 py-12 text-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
          <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-slate-950/40">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Active session</p>
                <h1 className="text-3xl font-semibold text-white md:text-4xl">{sessionTitle}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                  <span className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-5 w-5 text-slate-500" />
                    <span>
                      {formatDateWithWeekday(sessionStart)}, {formatTime(sessionStart)} · 60 минут
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5 text-slate-500" />
                    <span>{sessionLocation}</span>
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-secondary/60 bg-secondary/10 px-5 py-4 text-right shadow-inner shadow-secondary/30">
                <div className="flex items-center justify-end gap-2 text-sm text-secondary">
                  <ClockIcon className="h-5 w-5" />
                  <span className="font-medium uppercase tracking-wide">
                    {hasStarted ? 'Сессия уже в эфире' : 'До начала'}
                  </span>
                </div>
                <p className="font-mono text-3xl font-semibold text-white">
                  {hasStarted ? 'В эфире' : `${hours}:${minutes}:${seconds}`}
                </p>
              </div>
            </div>
          </header>

          <section className="rounded-3xl border border-rose-500/60 bg-rose-950/30 p-8 shadow-xl shadow-rose-950/30">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-rose-200/70">Безопасность</p>
                <h2 className="text-2xl font-semibold text-white">Центр модерации</h2>
                <p className="text-sm text-rose-100/80">
                  Если во время интервью происходит что-то тревожное, мгновенно сигнализируй команде SuperMock. Мы
                  фиксируем контекст беседы и берём ситуацию под контроль.
                </p>
                <ul className="space-y-2 text-sm text-rose-100/90">
                  <li className="flex items-start gap-2">
                    <ShieldExclamationIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-300" />
                    <span>Сигналы уходят в приоритетный канал 24/7 и сохраняются в журнале инцидентов.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <LifebuoyIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-300" />
                    <span>Модератор может подключиться в комнату, приостановить сессию и помочь участникам.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChatBubbleLeftRightIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-300" />
                    <span>После обращения мы отправим краткое резюме действий и рекомендации по безопасности.</span>
                  </li>
                </ul>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch lg:w-auto">
                <button
                  type="button"
                  onClick={() => handleSafetyAction('report')}
                  className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-400/50 bg-rose-500/20 px-5 py-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 sm:w-60"
                >
                  <span className="flex items-center gap-2">
                    <ShieldExclamationIcon className="h-5 w-5" />
                    {SAFETY_ACTION_LABELS.report}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-rose-100/80">Alt + !</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSafetyAction('moderator')}
                  className="inline-flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-200/40 bg-rose-900/40 px-5 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 sm:w-60"
                >
                  <span className="flex items-center gap-2">
                    <LifebuoyIcon className="h-5 w-5" />
                    {SAFETY_ACTION_LABELS.moderator}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-rose-100/60">Shift + M</span>
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-rose-200/20 bg-rose-950/40 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Журнал обращений</h3>
                  <span className="rounded-full border border-rose-200/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100">
                    {safetyActions.length ? `${safetyActions.length} актив.` : 'Пока пусто'}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {safetyActions.length ? (
                    <ul className="space-y-3">
                      {safetyActions.map((action) => {
                        const badgeStyles =
                          action.status === 'acknowledged'
                            ? 'border border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                            : 'border border-amber-400/40 bg-amber-500/10 text-amber-200';

                        return (
                          <li
                            key={action.id}
                            className="rounded-2xl border border-rose-200/20 bg-rose-950/30 p-4 shadow-sm shadow-rose-950/30"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
                                {action.type === 'report' ? (
                                  <ShieldExclamationIcon className="h-5 w-5 text-rose-200" />
                                ) : (
                                  <LifebuoyIcon className="h-5 w-5 text-rose-200" />
                                )}
                                <span>{SAFETY_ACTION_LABELS[action.type]}</span>
                              </div>
                              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeStyles}`}>
                                {SAFETY_STATUS_LABELS[action.status]}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-rose-100/80">{SAFETY_ACTION_DESCRIPTIONS[action.type]}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-rose-200/70">
                              <span>Отправлено: {formatTime(action.submittedAt)}</span>
                              {action.acknowledgedAt ? (
                                <span>Подтверждено: {formatTime(action.acknowledgedAt)}</span>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-rose-100/70">
                      Обращения ещё не отправлялись. При необходимости нажми одну из кнопок, и команда подключится в течение
                      нескольких минут.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-200/20 bg-rose-900/40 p-5">
                <h3 className="text-lg font-semibold text-white">Что происходит после сигнала</h3>
                <ol className="mt-4 space-y-3 text-sm text-rose-100/90">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-semibold text-rose-100">
                      1
                    </span>
                    <span>PagerDuty и Slack получают уведомление с выдержкой чата и списком участников.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-semibold text-rose-100">
                      2
                    </span>
                    <span>Модератор пишет в мини-чате, проверяет чеклист безопасности и подключается в видеокомнату.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-xs font-semibold text-rose-100">
                      3
                    </span>
                    <span>По итогам формируется инцидент-отчёт и, при необходимости, временно блокируются участники.</span>
                  </li>
                </ol>
                <p className="mt-4 text-xs text-rose-200/70">
                  Альтернативные контакты: <span className="font-semibold text-rose-100">support@supermock.io</span> или
                  горячая линия +1 (555) 010-42-42.
                </p>
              </div>
            </div>
            <div
              className="mt-6 rounded-2xl border border-rose-200/10 bg-rose-900/40 px-4 py-3 text-sm text-rose-100"
              role="status"
              aria-live="polite"
            >
              {safetyLiveMessage}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Таймлайн</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Подготовка к сессии</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Следи за этапами подготовки, чтобы начать интервью уверенно и без сюрпризов.
                  </p>
                </div>
                <div className="hidden flex-shrink-0 rounded-full bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-300 lg:block">
                  Обновляется в реальном времени
                </div>
              </div>
              <ol className="relative mt-8 space-y-6">
                {timelineItems.map((item, index) => {
                  const isLast = index === timelineItems.length - 1;
                  const statusBadgeStyles: Record<TimelineItem['status'], string> = {
                    complete: 'border-secondary/50 bg-secondary/15 text-secondary',
                    active: 'border-secondary bg-secondary text-slate-950 shadow shadow-secondary/40',
                    upcoming: 'border-slate-700 text-slate-400'
                  };
                  const statusLabel: Record<TimelineItem['status'], string> = {
                    complete: 'Выполнено',
                    active: 'Сейчас',
                    upcoming: 'Впереди'
                  };

                  return (
                    <li key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-11 w-11 items-center justify-center rounded-full border ${statusBadgeStyles[item.status]}`}
                        >
                          {item.status === 'complete' ? (
                            <CheckCircleIcon className="h-6 w-6" />
                          ) : item.status === 'active' ? (
                            <ClockIcon className="h-6 w-6" />
                          ) : (
                            <span className="text-sm font-semibold text-slate-500">{index + 1}</span>
                          )}
                        </span>
                        {!isLast && (
                          <span className="mt-1 h-full w-px flex-1 bg-gradient-to-b from-slate-700 via-slate-800 to-transparent" />
                        )}
                      </div>
                      <div className="flex-1 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                          <span>{formatTime(item.time)}</span>
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                              item.status === 'active'
                                ? 'bg-secondary text-slate-950'
                                : item.status === 'complete'
                                ? 'bg-secondary/20 text-secondary'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.status === 'active' ? <ClockIcon className="h-4 w-4" /> : null}
                            {statusLabel[item.status]}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <div className="flex flex-col gap-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Чеклист</p>
                    <h2 className="mt-1 text-xl font-semibold text-white">Готовность оборудования</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Отметь, что всё работает. Это увидят координаторы SuperMock.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950/60 px-3 py-1 text-xs font-medium text-slate-300">
                    {completedChecklist}/{CHECKLIST.length}
                  </span>
                </div>
                <ul className="mt-5 space-y-3">
                  {CHECKLIST.map((item) => {
                    const inputId = `check-${item.id}`;
                    return (
                      <li key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={checklistState[item.id]}
                          onChange={() => handleChecklistToggle(item.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-secondary focus:ring-secondary"
                        />
                        <label htmlFor={inputId} className="flex-1 text-sm text-slate-200">
                          {item.label}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Планирование</p>
                    <h2 className="mt-1 text-xl font-semibold text-white">Add to calendar</h2>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  Синхронизируй интервью с любимым календарём, чтобы напоминания пришли вовремя.
                </p>
                <div className="mt-5 space-y-3">
                  <a
                    href={calendarLinks.googleHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-secondary/20"
                  >
                    <span>Google Calendar</span>
                    <ArrowUpRightIcon className="h-5 w-5" />
                  </a>
                  <a
                    href={calendarLinks.outlookHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-secondary/40 hover:text-secondary"
                  >
                    <span>Outlook</span>
                    <ArrowUpRightIcon className="h-5 w-5" />
                  </a>
                  <a
                    href={calendarLinks.icalHref}
                    download="supermock-session.ics"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-secondary/40 hover:text-secondary"
                  >
                    <span>iCal (.ics)</span>
                    <ArrowUpRightIcon className="h-5 w-5" />
                  </a>
                </div>
              </section>
            </div>
          </div>

          {isLobbyOpen && (
            <section className="rounded-3xl border border-secondary/40 bg-slate-900/80 p-8 shadow-xl shadow-secondary/20">
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-secondary/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                      <BellAlertIcon className="h-4 w-4" /> Предлобби открыто
                    </span>
                    <span className="text-sm text-slate-300">
                      {hasStarted
                        ? 'Сессия уже началась — подключайся в комнату.'
                        : `Старт через ${minutesUntilStart} ${formatMinutesLabel(minutesUntilStart)}`}
                    </span>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Подключись заранее</h2>
                  <p className="text-sm text-slate-300">
                    Проверь звук и видео, протестируй связь и дай знать кандидату, что скоро будешь на месте.
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                    <a
                      href="https://test.webrtc.org/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-secondary/50 bg-secondary/10 px-4 py-2 font-semibold text-secondary transition hover:bg-secondary/20"
                    >
                      <WifiIcon className="h-5 w-5" /> Пройти WebRTC тест
                    </a>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-4 py-2 text-slate-300">
                      <ChatBubbleLeftRightIcon className="h-5 w-5" /> Чат доступен для всех участников
                    </span>
                  </div>
                </div>
                <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Мини-чат</h3>
                    <button
                      type="button"
                      onClick={handleQuickMessage}
                      className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary transition hover:bg-secondary/20"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" /> Сказать «Скоро буду»
                    </button>
                  </div>
                  <div className="h-48 overflow-y-auto rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4">
                    <ul className="space-y-3 text-sm">
                      {messages.map((message) => (
                        <li
                          key={message.id}
                          className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ${
                            message.isSelf
                              ? 'items-end bg-secondary/10 text-secondary text-right'
                              : 'bg-slate-950/70 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                            <span className={message.isSelf ? 'text-secondary' : 'text-slate-400'}>{message.author}</span>
                            <span>{formatTime(message.timestamp)}</span>
                          </div>
                          <p
                            className={`text-sm leading-relaxed ${
                              message.isSelf ? 'text-secondary' : 'text-slate-200'
                            }`}
                          >
                            {message.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Написать сообщение..."
                      className="flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-secondary focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 shadow shadow-secondary/40 transition hover:bg-secondary/90"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Отправить
                    </button>
                  </form>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
