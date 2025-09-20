import { useMemo, useState } from 'react';
import Head from 'next/head';
import {
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  FunnelIcon,
  StarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

import { PROFESSION_OPTIONS } from '@/data/professions';

type SlotStatus = 'upcoming' | 'live' | 'completed';

interface SlotParticipant {
  id: string;
  name: string;
  role: 'candidate' | 'interviewer' | 'observer';
  stack: string[];
  timezone: string;
  avatarColor: string;
}

interface Slot {
  id: string;
  title: string;
  status: SlotStatus;
  language: string;
  professionId: string;
  start: string; // ISO
  end: string; // ISO
  sessionFormat: string;
  capacity: number;
  participants: SlotParticipant[];
  focusAreas: string[];
  hostName: string;
  notes?: string;
  waitlistCount?: number;
}

const SLOT_TABS: { id: SlotStatus; label: string }[] = [
  { id: 'upcoming', label: 'Предстоящие' },
  { id: 'live', label: 'Идут сейчас' },
  { id: 'completed', label: 'Завершённые' }
];

const PROFESSION_TITLES = new Map(PROFESSION_OPTIONS.map((option) => [option.id, option.title]));

const SLOT_DATA: Slot[] = [
  {
    id: 'slot-frontend-01',
    title: 'Frontend Senior Mock',
    status: 'upcoming',
    language: 'English',
    professionId: 'frontend-developer',
    start: '2024-07-24T15:00:00Z',
    end: '2024-07-24T16:00:00Z',
    sessionFormat: 'Live coding (React + System Design)',
    capacity: 2,
    participants: [
      {
        id: 'participant-anna',
        name: 'Анна Смирнова',
        role: 'interviewer',
        stack: ['React', 'TypeScript', 'GraphQL'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-rose-500'
      }
    ],
    focusAreas: ['UI performance', 'Accessibility', 'SSR'],
    hostName: 'Михаил Логинов',
    notes: 'Командная проверка UI-паттернов и SSR, поддержка Figma live handoff.',
    waitlistCount: 1
  },
  {
    id: 'slot-backend-02',
    title: 'Backend Architecture Review',
    status: 'upcoming',
    language: 'Deutsch',
    professionId: 'backend-developer',
    start: '2024-07-25T08:30:00Z',
    end: '2024-07-25T09:30:00Z',
    sessionFormat: 'System design interview',
    capacity: 3,
    participants: [
      {
        id: 'participant-johann',
        name: 'Johann Müller',
        role: 'interviewer',
        stack: ['Node.js', 'PostgreSQL', 'Docker'],
        timezone: 'Europe/Berlin',
        avatarColor: 'bg-sky-500'
      },
      {
        id: 'participant-olga',
        name: 'Ольга Янова',
        role: 'candidate',
        stack: ['Node.js', 'Fastify', 'Kafka'],
        timezone: 'Europe/Riga',
        avatarColor: 'bg-emerald-500'
      }
    ],
    focusAreas: ['High-load API', 'Observability', 'Queues'],
    hostName: 'Супервайзер: Даниэль Фогт'
  },
  {
    id: 'slot-data-03',
    title: 'Data Science Pair Session',
    status: 'live',
    language: 'English',
    professionId: 'data-scientist',
    start: '2024-07-19T13:00:00Z',
    end: '2024-07-19T14:30:00Z',
    sessionFormat: 'Case study + Jupyter live coding',
    capacity: 3,
    participants: [
      {
        id: 'participant-elena',
        name: 'Elena Duarte',
        role: 'candidate',
        stack: ['Python', 'Pandas', 'TensorFlow'],
        timezone: 'Europe/Madrid',
        avatarColor: 'bg-fuchsia-500'
      },
      {
        id: 'participant-viktor',
        name: 'Виктор Ковалёв',
        role: 'interviewer',
        stack: ['Python', 'MLflow', 'Kubeflow'],
        timezone: 'Europe/Kyiv',
        avatarColor: 'bg-amber-500'
      },
      {
        id: 'participant-samira',
        name: 'Samira Khan',
        role: 'observer',
        stack: ['LLM tooling', 'Prompt engineering'],
        timezone: 'Asia/Dubai',
        avatarColor: 'bg-indigo-500'
      }
    ],
    focusAreas: ['Model evaluation', 'Feature store', 'Prompted insights'],
    hostName: 'Хост: SuperMock AI Ops',
    notes: 'Синхронная проверка пайплайна + live генерация отчёта в Notion.'
  },
  {
    id: 'slot-mobile-04',
    title: 'Mobile UI Jam',
    status: 'completed',
    language: 'Español',
    professionId: 'mobile-developer',
    start: '2024-07-12T17:00:00Z',
    end: '2024-07-12T18:15:00Z',
    sessionFormat: 'Cross-platform challenge',
    capacity: 4,
    participants: [
      {
        id: 'participant-lucia',
        name: 'Lucía Fernández',
        role: 'candidate',
        stack: ['React Native', 'Expo', 'TypeScript'],
        timezone: 'America/Mexico_City',
        avatarColor: 'bg-orange-500'
      },
      {
        id: 'participant-jorge',
        name: 'Jorge Martinez',
        role: 'interviewer',
        stack: ['Kotlin', 'Swift', 'Compose'],
        timezone: 'America/Bogota',
        avatarColor: 'bg-blue-500'
      }
    ],
    focusAreas: ['Offline-first', 'Animations', 'Accessibility'],
    hostName: 'Модератор: Carla Ruiz'
  },
  {
    id: 'slot-devops-05',
    title: 'DevOps Reliability Lab',
    status: 'upcoming',
    language: 'Русский',
    professionId: 'devops-engineer',
    start: '2024-07-23T10:00:00Z',
    end: '2024-07-23T11:30:00Z',
    sessionFormat: 'Incident response simulation',
    capacity: 2,
    participants: [],
    focusAreas: ['SRE practice', 'Monitoring', 'Alert fatigue'],
    hostName: 'Модератор: SuperMock Crew',
    notes: 'Слот без участников — система ищет интервьюеров для инцидент-симуляции.'
  },
  {
    id: 'slot-qa-06',
    title: 'QA Automation Drill',
    status: 'completed',
    language: 'English',
    professionId: 'qa-engineer',
    start: '2024-07-10T07:30:00Z',
    end: '2024-07-10T08:30:00Z',
    sessionFormat: 'Automation scenario review',
    capacity: 2,
    participants: [
      {
        id: 'participant-daria',
        name: 'Дарья Мельникова',
        role: 'candidate',
        stack: ['Cypress', 'Playwright', 'Jest'],
        timezone: 'Europe/Vilnius',
        avatarColor: 'bg-lime-500'
      }
    ],
    focusAreas: ['E2E strategy', 'Flaky tests mitigation'],
    hostName: 'Интервьюер: Marcus Lee'
  }
];

const uniqueLanguages = Array.from(new Set(SLOT_DATA.map((slot) => slot.language))).sort((a, b) =>
  a.localeCompare(b, 'ru')
);

const professionOptions = Array.from(new Set(SLOT_DATA.map((slot) => slot.professionId)))
  .map((professionId) => ({
    id: professionId,
    title: PROFESSION_TITLES.get(professionId) ?? professionId
  }))
  .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

function getTimezoneLabel(date: Date) {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short'
  }).formatToParts(date);

  return parts.find((part) => part.type === 'timeZoneName')?.value ?? '';
}

function formatLocalDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(date);
}

function formatLocalTimeRange(start: Date, end: Date) {
  const startTime = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(start);

  const endTime = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  }).format(end);

  return `${startTime} – ${endTime}`;
}

function formatUtcRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC'
  });

  const startLabel = formatter.format(start);
  const endLabel = formatter.format(end);

  if (startLabel.split(',')[0] === endLabel.split(',')[0]) {
    const [, startTime] = startLabel.split(', ');
    const [, endTime] = endLabel.split(', ');
    return `${startLabel.split(',')[0]}, ${startTime} – ${endTime} UTC`;
  }

  return `${startLabel} – ${endLabel} UTC`;
}

function getStatusBadgeClasses(status: SlotStatus) {
  switch (status) {
    case 'live':
      return 'bg-emerald-500/20 text-emerald-300';
    case 'completed':
      return 'bg-slate-700/70 text-slate-200';
    default:
      return 'bg-sky-500/20 text-sky-200';
  }
}

interface SlotCardProps {
  slot: Slot;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showUtc: boolean;
  isFavourite: boolean;
  onToggleFavourite: () => void;
}

function SlotCard({ slot, isExpanded, onToggleExpand, showUtc, isFavourite, onToggleFavourite }: SlotCardProps) {
  const startDate = useMemo(() => new Date(slot.start), [slot.start]);
  const endDate = useMemo(() => new Date(slot.end), [slot.end]);

  const availableSeats = slot.capacity - slot.participants.length;
  const localDateLabel = formatLocalDate(startDate);
  const localTimeRange = formatLocalTimeRange(startDate, endDate);
  const timezoneLabel = getTimezoneLabel(startDate);
  const utcRange = formatUtcRange(startDate, endDate);

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30 transition-colors">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${getStatusBadgeClasses(slot.status)}`}>
              {SLOT_TABS.find((tab) => tab.id === slot.status)?.label}
            </span>
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              {slot.language}
            </span>
            <span className="rounded-full bg-slate-800/50 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-400">
              {PROFESSION_TITLES.get(slot.professionId) ?? slot.professionId}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{slot.title}</h3>
          <p className="text-sm text-slate-300">{slot.sessionFormat}</p>
        </div>
        <button
          type="button"
          onClick={onToggleFavourite}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
            isFavourite
              ? 'border-amber-400/70 bg-amber-400/10 text-amber-300'
              : 'border-slate-700 text-slate-400 hover:border-amber-300/70 hover:text-amber-200'
          }`}
          aria-label={isFavourite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={isFavourite}
        >
          <StarIcon className={`h-5 w-5 ${isFavourite ? 'fill-current' : ''}`} />
        </button>
      </header>

      <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <ClockIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">{localDateLabel}</p>
            <p className="text-sm font-semibold text-white">
              {localTimeRange} <span className="text-xs font-normal text-slate-400">({timezoneLabel})</span>
            </p>
            {showUtc && <p className="text-xs text-slate-500">UTC: {utcRange}</p>}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-right md:items-end">
          <p className="text-xs uppercase tracking-wide text-slate-500">Участники</p>
          <p className="text-sm font-semibold text-white">
            {slot.participants.length}/{slot.capacity}{' '}
            <span className="text-xs font-normal text-slate-400">мест занято</span>
          </p>
          <p className="text-xs text-slate-500">
            {availableSeats > 0 ? `Свободных мест: ${availableSeats}` : 'Свободных мест нет'}
          </p>
          {slot.waitlistCount ? (
            <p className="text-xs text-amber-300">Лист ожидания: {slot.waitlistCount}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {slot.focusAreas.map((area) => (
          <span key={area} className="rounded-full bg-slate-800/70 px-3 py-1 text-[11px] uppercase tracking-wide text-slate-300">
            {area}
          </span>
        ))}
      </div>

      {slot.notes && <p className="mt-4 text-xs text-slate-400">{slot.notes}</p>}

      <footer className="mt-6 space-y-4">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          aria-expanded={isExpanded}
        >
          <span>Детали слота</span>
          {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
        </button>

        {isExpanded && (
          <div className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Хост</p>
                <p className="text-sm font-medium text-white">{slot.hostName}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <UsersIcon className="h-4 w-4" />
                <span>Участники ({slot.participants.length})</span>
              </div>
            </div>

            <ul className="space-y-3">
              {slot.participants.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400">
                  Пока никто не присоединился — слот отметится как свободный в рассылке.
                </li>
              ) : (
                slot.participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800/70 bg-slate-900/60 px-4 py-3"
                  >
                    <span
                      className={`${participant.avatarColor} flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white`}
                    >
                      {participant.name.charAt(0)}
                    </span>
                    <div className="min-w-[200px] flex-1">
                      <p className="text-sm font-semibold text-white">{participant.name}</p>
                      <p className="text-xs text-slate-400">
                        {participant.role === 'candidate'
                          ? 'Кандидат'
                          : participant.role === 'interviewer'
                          ? 'Интервьюер'
                          : 'Наблюдатель'}{' '}
                        · {participant.stack.slice(0, 3).join(', ')}
                      </p>
                      <p className="text-[11px] text-slate-500">Таймзона: {participant.timezone}</p>
                    </div>
                    {participant.stack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {participant.stack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-secondary/90">
                Присоединиться
              </button>
              <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500">
                Запланировать позже
              </button>
              <button
                onClick={onToggleFavourite}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  isFavourite
                    ? 'border-amber-300 bg-amber-300/10 text-amber-200'
                    : 'border-slate-700 text-slate-200 hover:border-amber-300 hover:text-amber-200'
                }`}
              >
                {isFavourite ? 'В избранном' : 'Добавить в избранное'}
              </button>
            </div>
          </div>
        )}
      </footer>
    </article>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}

function NotificationToggle({ label, description, checked, onToggle }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60 ${
          checked ? 'bg-secondary/80' : 'bg-slate-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-slate-950 transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SlotDashboardPage() {
  const [activeTab, setActiveTab] = useState<SlotStatus>('upcoming');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [professionFilter, setProfessionFilter] = useState<string>('all');
  const [onlyFree, setOnlyFree] = useState(false);
  const [onlyWithParticipants, setOnlyWithParticipants] = useState(false);
  const [showUtc, setShowUtc] = useState(true);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [favourites, setFavourites] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    telegram: true,
    email: true,
    push: false
  });

  const toggleFavourite = (slotId: string) => {
    setFavourites((previous) =>
      previous.includes(slotId)
        ? previous.filter((id) => id !== slotId)
        : [...previous, slotId]
    );
  };

  const resetFilters = () => {
    setLanguageFilter('all');
    setProfessionFilter('all');
    setOnlyFree(false);
    setOnlyWithParticipants(false);
  };

  const filteredByControls = useMemo(() => {
    return SLOT_DATA.filter((slot) => {
      if (languageFilter !== 'all' && slot.language !== languageFilter) {
        return false;
      }

      if (professionFilter !== 'all' && slot.professionId !== professionFilter) {
        return false;
      }

      if (onlyFree && slot.participants.length >= slot.capacity) {
        return false;
      }

      if (onlyWithParticipants && slot.participants.length === 0) {
        return false;
      }

      return true;
    });
  }, [languageFilter, professionFilter, onlyFree, onlyWithParticipants]);

  const tabCounts = useMemo(() => {
    return filteredByControls.reduce(
      (acc, slot) => {
        acc[slot.status] += 1;
        return acc;
      },
      { upcoming: 0, live: 0, completed: 0 } as Record<SlotStatus, number>
    );
  }, [filteredByControls]);

  const filteredSlots = useMemo(() => {
    return filteredByControls
      .filter((slot) => slot.status === activeTab)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [activeTab, filteredByControls]);

  const activeProfessionTitle =
    professionFilter === 'all'
      ? 'Все профессии'
      : PROFESSION_TITLES.get(professionFilter) ?? professionFilter;

  return (
    <>
      <Head>
        <title>SuperMock · Дашборд слотов</title>
      </Head>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 p-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Дашборд слотов</h1>
          <p className="text-sm text-slate-400">
            Выбирайте подходящие интервальные окна, фильтруйте по языку и профессии, отслеживайте занятость участников и
            настраивайте уведомления о новых слотах.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-slate-400" />
              Управление фильтрами
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500"
            >
              <FunnelIcon className="h-4 w-4" />
              Сбросить фильтры
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-500">Язык</span>
              <select
                value={languageFilter}
                onChange={(event) => setLanguageFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="all">Все языки</option>
                {uniqueLanguages.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-slate-500">Профессия</span>
              <select
                value={professionFilter}
                onChange={(event) => setProfessionFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              >
                <option value="all">Все профессии</option>
                {professionOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-3 text-xs text-slate-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyFree}
                  onChange={(event) => setOnlyFree(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Только свободные
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyWithParticipants}
                  onChange={(event) => setOnlyWithParticipants(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Есть участники
              </label>
              <p className="text-[11px] text-slate-500">
                Активно: {languageFilter === 'all' ? 'любой язык' : languageFilter},{' '}
                {activeProfessionTitle.toLowerCase()}
              </p>
            </div>

            <div className="flex flex-col gap-3 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-wide text-slate-500">Отображение времени</span>
              <button
                type="button"
                role="switch"
                aria-checked={showUtc}
                onClick={() => setShowUtc((previous) => !previous)}
                className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  showUtc
                    ? 'border-secondary/60 bg-secondary/10 text-secondary'
                    : 'border-slate-700 text-slate-300 hover:border-secondary/60 hover:text-secondary'
                }`}
              >
                {showUtc ? 'Локально + UTC' : 'Только локально'}
              </button>
              <p className="text-[11px] text-slate-500">
                Показывать время в вашей таймзоне и в UTC, чтобы синхронизироваться с международными участниками.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {SLOT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setExpandedSlotId(null);
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? 'bg-secondary text-slate-950'
                      : 'border border-slate-700 text-slate-300 hover:border-secondary/60 hover:text-secondary'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 text-xs text-slate-900/70">
                    {tabCounts[tab.id] ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Отфильтровано слотов: <span className="font-semibold text-slate-300">{filteredSlots.length}</span>
            </p>
          </div>

          {filteredSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
              <p className="text-sm font-semibold text-white">Нет слотов по выбранным фильтрам</p>
              <p className="mt-2 text-sm text-slate-400">
                Попробуйте изменить язык, профессию или отключите фильтры «Только свободные» и «Есть участники».
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredSlots.map((slot) => (
                <SlotCard
                  key={slot.id}
                  slot={slot}
                  isExpanded={expandedSlotId === slot.id}
                  onToggleExpand={() =>
                    setExpandedSlotId((current) => (current === slot.id ? null : slot.id))
                  }
                  showUtc={showUtc}
                  isFavourite={favourites.includes(slot.id)}
                  onToggleFavourite={() => toggleFavourite(slot.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Настройки уведомлений</h2>
              <p className="text-sm text-slate-400">
                Управляйте каналами, по которым SuperMock уведомит о новых слотах, обновлениях участников и изменениях расписания.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Активные каналы: {Object.entries(notificationSettings)
                .filter(([, value]) => value)
                .map(([channel]) => channel)
                .join(', ') || 'нет'}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <NotificationToggle
              label="Telegram"
              description="Моментальные пуши в бота @supermock_slots, поддержка быстрых действий"
              checked={notificationSettings.telegram}
              onToggle={() =>
                setNotificationSettings((state) => ({
                  ...state,
                  telegram: !state.telegram
                }))
              }
            />
            <NotificationToggle
              label="Email"
              description="Ежедневная сводка по свободным слотам и изменениям в расписании"
              checked={notificationSettings.email}
              onToggle={() =>
                setNotificationSettings((state) => ({
                  ...state,
                  email: !state.email
                }))
              }
            />
            <NotificationToggle
              label="Push"
              description="Браузерные уведомления о том, что слот открылся или завершился"
              checked={notificationSettings.push}
              onToggle={() =>
                setNotificationSettings((state) => ({
                  ...state,
                  push: !state.push
                }))
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-secondary/90">
              Сохранить настройки
            </button>
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500">
              Отправить тестовое уведомление
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

