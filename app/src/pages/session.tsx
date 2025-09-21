import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  BellAlertIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CommandLineIcon,
  FlagIcon,
  LifebuoyIcon,
  MicrophoneIcon,
  MapPinIcon,
  MoonIcon,
  PaperAirplaneIcon,
  PauseIcon,
  PlayIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  SunIcon,
  UserGroupIcon,
  VideoCameraIcon,
  WifiIcon
} from '@heroicons/react/24/outline';
import { useDailyCo } from '@/hooks/useDailyCo';
import { fetchMatchRequest, fetchMatchToken } from '@/lib/api';
import type { MatchRequestWithResultDto } from '../../../shared/src/types/matching.js';

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

type DifficultyLevel = 'easy' | 'medium' | 'hard';

type AIQuestion = {
  id: string;
  prompt: string;
  category: string;
  difficulty: DifficultyLevel;
  followUps: string[];
};

type TimerAlert = {
  id: string;
  milestone: number;
  message: string;
  createdAt: Date;
};

const SESSION_LENGTH_MINUTES = 60;
const WARNING_MINUTES = [30, 10, 5, 1] as const;

const QUESTION_BANK: ReadonlyArray<Omit<AIQuestion, 'id'>> = [
  {
    prompt: 'Спроектируй сервис уведомлений, который доставляет 5 млн сообщений в сутки с учётом ретраев и дедупликации.',
    category: 'System Design',
    difficulty: 'hard',
    followUps: [
      'Как масштабировать хранение предпочтений пользователей?',
      'Что делать при деградации внешнего провайдера?',
      'Как протестировать обработку 5xx от шлюзов?'
    ]
  },
  {
    prompt: 'Расскажи о случае, когда приходилось убеждать команду в техническом решении без формальной власти.',
    category: 'Behavioral',
    difficulty: 'medium',
    followUps: [
      'Какие метрики использовались для оценки решения?',
      'Какой была реакция команды изначально?',
      'Что бы ты сделал иначе сейчас?'
    ]
  },
  {
    prompt: 'Оптимизируй работу React-компонента списка из 10k элементов, где меняются фильтры и сортировка.',
    category: 'Frontend Architecture',
    difficulty: 'medium',
    followUps: [
      'Когда стоит использовать виртуализацию?',
      'Как замерить влияние изменений?',
      'Что делать с сложными ячейками?'
    ]
  },
  {
    prompt: 'Реши задачу: дан массив событий (start, end). Найди максимум пересечений во времени.',
    category: 'Algorithms',
    difficulty: 'easy',
    followUps: [
      'Какой будет сложность решения?',
      'Можно ли сделать решение потокобезопасным?',
      'Как проверить корректность?'
    ]
  },
  {
    prompt: 'Опиши стратегию rollout-а фичи с A/B, фичефлагами и откатом для платформы с миллионной аудиторией.',
    category: 'Delivery & Reliability',
    difficulty: 'hard',
    followUps: [
      'Какие риски фиксируешь в runbook?',
      'Как выбрать метрики, сигнализирующие об откате?',
      'Что автоматизируешь в CI/CD?'
    ]
  }
];

const COMPETENCY_AREAS = [
  {
    id: 'communication',
    label: 'Коммуникация',
    description: 'Чёткость формулировок, активное слушание, структурность ответов.'
  },
  {
    id: 'problem-solving',
    label: 'Решение задач',
    description: 'Декомпозиция, выбор подхода, способность оценивать компромиссы.'
  },
  {
    id: 'system-design',
    label: 'System design',
    description: 'Архитектурное мышление, нестандартные сценарии, учёт ограничений.'
  },
  {
    id: 'culture-add',
    label: 'Culture add',
    description: 'Влияние на команду, зрелость, proactivity и работа с обратной связью.'
  }
] as const;

const HOTKEY_HINTS = [
  { combo: '⌘ + Shift + T', description: 'Переключить тему доски' },
  { combo: 'Shift + Space', description: 'Поставить таймер на паузу' },
  { combo: '⌘ + L', description: 'Сфокусироваться на заметках интервьюера' }
];

const BOARD_VIEWS = [
  { id: 'notes', label: 'Заметки' },
  { id: 'code', label: 'Код' },
  { id: 'diagram', label: 'Диаграмма' }
] as const;

const BOARD_CONTENT: Record<(typeof BOARD_VIEWS)[number]['id'], string> = {
  notes:
    'Разбор: архитектура уведомлений → базы → метрики. Собрать примеры ошибок, уточнить SLA и обработку деградаций.',
  code: `function evaluateCandidate(signal) {
  const metrics = ['clarity', 'adaptability', 'systemThinking'];
  return metrics.every((key) => signal[key] >= 7);
}

const followUp = {
  action: 'Share resources on React perf',
  owner: 'Mentor'
};`,
  diagram:
    'Интервьюер ⇄ Кандидат\n  ↳ Shared board (темы: архитектура / поведение)\n  ↳ AI вопросы (прогресс, сложность)\n  ↳ Таймер + предупреждения (30/10/5/1)'
};

const difficultyLabels: Record<DifficultyLevel, string> = {
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный'
};

const COMPETENCY_RATING_LABELS: Record<'strong' | 'neutral' | 'weak', string> = {
  strong: 'Сильная сторона',
  neutral: 'Нейтрально',
  weak: 'Зона роста'
};

const COMPETENCY_RATING_CLASSES: Record<'strong' | 'neutral' | 'weak', string> = {
  strong: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 focus-visible:outline-emerald-300',
  neutral: 'border-slate-500/60 bg-slate-900/60 text-slate-200 focus-visible:outline-secondary',
  weak: 'border-rose-500/60 bg-rose-600/20 text-rose-200 focus-visible:outline-rose-300'
};

const RECOMMENDATION_BADGE_CLASSES: Record<'advocate' | 'hold' | 'decline', string> = {
  advocate: 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 focus-visible:outline-emerald-300',
  hold: 'border-amber-400/60 bg-amber-500/20 text-amber-200 focus-visible:outline-amber-300',
  decline: 'border-rose-500/60 bg-rose-600/20 text-rose-200 focus-visible:outline-rose-300'
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

function generateQuestionId(category: string) {
  return `${category.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`;
}

function pickRandomQuestion(excludePrompt?: string) {
  const pool = excludePrompt
    ? QUESTION_BANK.filter((entry) => entry.prompt !== excludePrompt)
    : QUESTION_BANK;
  const fallbackPool = pool.length ? pool : QUESTION_BANK;
  const candidate = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  return {
    ...candidate,
    id: generateQuestionId(candidate.category)
  } satisfies AIQuestion;
}

function adjustDifficulty(level: DifficultyLevel, direction: 'up' | 'down'): DifficultyLevel {
  const order: DifficultyLevel[] = ['easy', 'medium', 'hard'];
  const index = order.indexOf(level);
  if (index === -1) {
    return level;
  }
  if (direction === 'up') {
    return order[Math.min(order.length - 1, index + 1)] ?? level;
  }
  return order[Math.max(0, index - 1)] ?? level;
}

function buildInitialDeck(size = 4): AIQuestion[] {
  const prompts = new Set<string>();
  const deck: AIQuestion[] = [];

  while (deck.length < size) {
    const candidate = pickRandomQuestion();
    if (prompts.has(candidate.prompt)) {
      continue;
    }

    prompts.add(candidate.prompt);
    deck.push(candidate);
  }

  return deck;
}

function createMilestoneState(): Record<number, boolean> {
  return WARNING_MINUTES.reduce<Record<number, boolean>>((acc, value) => {
    acc[value] = false;
    return acc;
  }, {});
}

export default function ActiveSessionPage() {
  const router = useRouter();
  const matchIdParam = typeof router.query.matchId === 'string' ? router.query.matchId : null;
  const [matchData, setMatchData] = useState<MatchRequestWithResultDto | null>(null);
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [isFetchingRoomToken, setIsFetchingRoomToken] = useState(false);
  const [roomTokenError, setRoomTokenError] = useState<string | null>(null);

  const [sessionStart] = useState(() => new Date(Date.now() + 12 * 60 * 1000));
  const sessionEnd = useMemo(
    () => new Date(sessionStart.getTime() + 60 * 60 * 1000),
    [sessionStart]
  );

  const initialDeck = useMemo(() => buildInitialDeck(), []);
  const [questionDeck, setQuestionDeck] = useState<AIQuestion[]>(() => initialDeck);
  const [questionStates, setQuestionStates] = useState<Record<string, { answered: boolean; flagged: boolean }>>(() =>
    Object.fromEntries(initialDeck.map((question) => [question.id, { answered: false, flagged: false }]))
  );
  const [relevanceRatings, setRelevanceRatings] = useState<
    Record<string, 'relevant' | 'neutral' | 'off-topic' | null>
  >(() => Object.fromEntries(initialDeck.map((question) => [question.id, null])));
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [timerAlerts, setTimerAlerts] = useState<TimerAlert[]>([]);
  const [triggeredMilestones, setTriggeredMilestones] = useState<Record<number, boolean>>(() => createMilestoneState());
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [sessionSecondsElapsed, setSessionSecondsElapsed] = useState(0);
  const [boardTheme, setBoardTheme] = useState<'dark' | 'light'>('dark');
  const [boardView, setBoardView] = useState<(typeof BOARD_VIEWS)[number]['id']>('notes');
  const [boardNotes, setBoardNotes] = useState(
    'Итоги первых 20 минут: сильная декомпозиция, быстро выбирает метрики. Слабые места — нестабильные примеры по перформансу.'
  );
  const [competencyRatings, setCompetencyRatings] = useState<Record<string, 'strong' | 'neutral' | 'weak' | null>>(() =>
    Object.fromEntries(COMPETENCY_AREAS.map((area) => [area.id, null]))
  );
  const [interviewerSummaryNotes, setInterviewerSummaryNotes] = useState(
    'Кандидат уверенно держит темп, задаёт уточняющие вопросы и держит связь с бизнес-контекстом.'
  );
  const [interviewerRiskNotes, setInterviewerRiskNotes] = useState(
    'Не хватает конкретики по работе с React profiler, стоит попросить показать план улучшений.'
  );
  const [interviewerActionItems, setInterviewerActionItems] = useState(
    'Отправить шаблон ретро по perf-оптимизациям и договориться о follow-up через 2 дня.'
  );
  const [recommendationDecision, setRecommendationDecision] = useState<'advocate' | 'hold' | 'decline'>('advocate');

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
    if (!router.isReady || !matchIdParam) {
      return;
    }

    let canceled = false;

    setIsMatchLoading(true);
    setMatchError(null);

    fetchMatchRequest(matchIdParam)
      .then((response) => {
        if (!canceled) {
          setMatchData(response);
        }
      })
      .catch((err) => {
        if (!canceled) {
          setMatchError(err instanceof Error ? err.message : 'Не удалось загрузить данные матча');
        }
      })
      .finally(() => {
        if (!canceled) {
          setIsMatchLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [matchIdParam, router.isReady]);

  const handleMatchReload = useCallback(async () => {
    if (!matchIdParam) {
      return;
    }

    setIsMatchLoading(true);
    setMatchError(null);

    try {
      const response = await fetchMatchRequest(matchIdParam);
      setMatchData(response);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Не удалось загрузить данные матча');
    } finally {
      setIsMatchLoading(false);
    }
  }, [matchIdParam]);

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

  const matchResult = matchData?.result ?? null;
  const roomUrl = matchResult?.roomUrl ?? null;
  const roomId = matchResult?.roomId ?? null;
  const roomKey = matchResult ? `${matchResult.id}:${matchResult.roomId ?? matchResult.roomUrl ?? ''}` : null;
  const hasDailyRoom = Boolean(roomUrl);
  const hasDailyToken = Boolean(roomToken);
  const hasDailyCredentials = hasDailyRoom && hasDailyToken;
  const dailyUserName = matchResult?.interviewer?.displayName ?? 'SuperMock';

  useEffect(() => {
    setRoomToken(null);
    setRoomTokenError(null);
    setIsFetchingRoomToken(false);
  }, [roomKey]);

  useEffect(() => {
    if (!matchIdParam || !hasDailyRoom) {
      return;
    }

    if (roomToken || roomTokenError || isFetchingRoomToken) {
      return;
    }

    let canceled = false;

    setIsFetchingRoomToken(true);
    setRoomTokenError(null);

    fetchMatchToken(matchIdParam)
      .then((response) => {
        if (canceled) {
          return;
        }

        setRoomToken(response.token);
      })
      .catch((err) => {
        if (canceled) {
          return;
        }

        const message =
          err instanceof Error ? err.message : 'Не удалось получить доступ к видеокомнате';
        setRoomTokenError(message);
        setRoomToken(null);
      })
      .finally(() => {
        if (!canceled) {
          setIsFetchingRoomToken(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [matchIdParam, hasDailyRoom, roomToken, roomTokenError, isFetchingRoomToken]);

  const handleRoomTokenRetry = useCallback(() => {
    setRoomToken(null);
    setRoomTokenError(null);
    setIsFetchingRoomToken(false);
  }, []);

  const dailyCo = useDailyCo({
    roomUrl,
    token: roomToken ?? undefined,
    userName: dailyUserName,
    autoJoin: hasDailyCredentials && isLobbyOpen,
    maxReconnectionAttempts: 3
  });

  useEffect(() => {
    if (!hasStarted) {
      setSessionSecondsElapsed(0);
      return;
    }

    if (isTimerPaused) {
      return;
    }

    const interval = setInterval(() => {
      setSessionSecondsElapsed((prev) => Math.min(prev + 1, SESSION_LENGTH_MINUTES * 60));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [hasStarted, isTimerPaused]);

  useEffect(() => {
    if (!hasStarted) {
      setTimerAlerts([]);
      setTriggeredMilestones(createMilestoneState());
    }
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) {
      return;
    }

    const minutesLeft = Math.max(0, Math.ceil((SESSION_LENGTH_MINUTES * 60 - sessionSecondsElapsed) / 60));
    const dueMilestones = WARNING_MINUTES.filter((milestone) => !triggeredMilestones[milestone] && minutesLeft <= milestone);

    if (!dueMilestones.length) {
      return;
    }

    dueMilestones.forEach((milestone) => {
      setTimerAlerts((prev) => [
        {
          id: `timer-alert-${milestone}-${Date.now()}`,
          milestone,
          message: `До конца осталось ${milestone} ${formatMinutesLabel(milestone)}.`,
          createdAt: new Date()
        },
        ...prev
      ]);
    });

    setTriggeredMilestones((prev) => ({
      ...prev,
      ...Object.fromEntries(dueMilestones.map((milestone) => [milestone, true]))
    }));
  }, [hasStarted, sessionSecondsElapsed, triggeredMilestones]);

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

  const totalSessionSeconds = SESSION_LENGTH_MINUTES * 60;
  const sessionSecondsLeft = Math.max(0, totalSessionSeconds - sessionSecondsElapsed);
  const sessionProgressPercent = Math.min(100, Math.round((sessionSecondsElapsed / totalSessionSeconds) * 100));
  const sessionMinutesLeft = Math.max(0, Math.ceil(sessionSecondsLeft / 60));

  const answeredCount = useMemo(
    () => Object.values(questionStates).filter((state) => state?.answered).length,
    [questionStates]
  );
  const flaggedCount = useMemo(
    () => Object.values(questionStates).filter((state) => state?.flagged).length,
    [questionStates]
  );

  const totalQuestions = questionDeck.length;
  const candidateProgressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const activeQuestion = questionDeck[activeQuestionIndex] ?? null;
  const activeQuestionState = activeQuestion
    ? questionStates[activeQuestion.id] ?? { answered: false, flagged: false }
    : null;
  const activeQuestionRelevance = activeQuestion ? relevanceRatings[activeQuestion.id] ?? null : null;
  const upcomingMilestones = WARNING_MINUTES.filter((milestone) => !triggeredMilestones[milestone]);
  const sessionHoursLeft = Math.floor(sessionSecondsLeft / 3600)
    .toString()
    .padStart(2, '0');
  const sessionMinutesComponent = Math.floor((sessionSecondsLeft % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const sessionSecondsComponent = Math.floor(sessionSecondsLeft % 60)
    .toString()
    .padStart(2, '0');
  const sessionTimerLabel = `${sessionHoursLeft}:${sessionMinutesComponent}:${sessionSecondsComponent}`;
  const difficultyBadgeClass: Record<DifficultyLevel, string> = {
    easy: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
    medium: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    hard: 'border-rose-500/40 bg-rose-600/15 text-rose-200'
  };
  const relevanceOptions = [
    { value: 'relevant' as const, label: 'В тему' },
    { value: 'neutral' as const, label: 'Норм' },
    { value: 'off-topic' as const, label: 'Мимо' }
  ];
  const decisionOptions = [
    { value: 'advocate' as const, label: 'Рекомендую' },
    { value: 'hold' as const, label: 'Нужен доп. раунд' },
    { value: 'decline' as const, label: 'Не рекомендую' }
  ];
  const isPrevDisabled = activeQuestionIndex <= 0;
  const isNextDisabled = activeQuestionIndex >= totalQuestions - 1;
  const boardThemeClasses =
    boardTheme === 'dark'
      ? 'border-slate-800 bg-slate-950 text-slate-100'
      : 'border-slate-200 bg-slate-50 text-slate-900';
  const boardInputClasses =
    boardTheme === 'dark'
      ? 'border-slate-800 bg-slate-900/80 text-slate-100 placeholder:text-slate-500'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-500';
  const boardViewContent = BOARD_CONTENT[boardView];
  const timerAlertPreview = timerAlerts.slice(0, 4);
  const latestAlert = timerAlerts[0] ?? null;
  const boardHeaderLabelClass = boardTheme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const boardTitleClass = boardTheme === 'dark' ? 'text-white' : 'text-slate-900';
  const boardDescriptionClass = boardTheme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const boardThemeButtonClass =
    boardTheme === 'dark'
      ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-900 focus-visible:outline-secondary'
      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus-visible:outline-secondary';
  const boardTabInactiveClass =
    boardTheme === 'dark'
      ? 'border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-900 focus-visible:outline-secondary'
      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 focus-visible:outline-secondary';
  const boardContentWrapperClass =
    boardTheme === 'dark'
      ? 'border-slate-800 bg-slate-900/70 text-slate-200'
      : 'border-slate-200 bg-white/80 text-slate-700';
  const boardHotkeyItemClass =
    boardTheme === 'dark'
      ? 'border-slate-800/70 bg-slate-950/60 text-slate-300'
      : 'border-slate-200 bg-white text-slate-600';
  const boardPreTextClass = boardTheme === 'dark' ? 'text-slate-200' : 'text-slate-600';
  const interviewerTextareaClass =
    'w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-secondary focus:outline-none';
  const interviewerCardClass = 'rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5';
  const notesHotkey = HOTKEY_HINTS[2] ?? null;

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

  const handleQuestionNavigation = (direction: 'prev' | 'next') => {
    setActiveQuestionIndex((prev) => {
      if (direction === 'prev') {
        return Math.max(0, prev - 1);
      }
      return Math.min(totalQuestions - 1, prev + 1);
    });
  };

  const handleRegenerateActiveQuestion = () => {
    if (!activeQuestion) {
      return;
    }

    const replacement = pickRandomQuestion(activeQuestion.prompt);
    const replacementWithId: AIQuestion = {
      ...replacement,
      id: activeQuestion.id
    };

    setQuestionDeck((prev) =>
      prev.map((question, index) => (index === activeQuestionIndex ? replacementWithId : question))
    );
    setQuestionStates((prev) => ({
      ...prev,
      [activeQuestion.id]: { answered: false, flagged: false }
    }));
    setRelevanceRatings((prev) => ({
      ...prev,
      [activeQuestion.id]: null
    }));
  };

  const handleDifficultyAdjust = (direction: 'up' | 'down') => {
    if (!activeQuestion) {
      return;
    }

    const nextLevel = adjustDifficulty(activeQuestion.difficulty, direction);
    if (nextLevel === activeQuestion.difficulty) {
      return;
    }

    setQuestionDeck((prev) =>
      prev.map((question, index) =>
        index === activeQuestionIndex ? { ...question, difficulty: nextLevel } : question
      )
    );
  };

  const handleMarkAnswered = () => {
    if (!activeQuestion) {
      return;
    }

    setQuestionStates((prev) => {
      const current = prev[activeQuestion.id] ?? { answered: false, flagged: false };
      if (current.answered) {
        return prev;
      }
      return {
        ...prev,
        [activeQuestion.id]: { ...current, answered: true }
      };
    });
  };

  const handleToggleFlag = () => {
    if (!activeQuestion) {
      return;
    }

    setQuestionStates((prev) => {
      const current = prev[activeQuestion.id] ?? { answered: false, flagged: false };
      return {
        ...prev,
        [activeQuestion.id]: { ...current, flagged: !current.flagged }
      };
    });
  };

  const handleSetRelevance = (value: 'relevant' | 'neutral' | 'off-topic') => {
    if (!activeQuestion) {
      return;
    }

    setRelevanceRatings((prev) => {
      const current = prev[activeQuestion.id] ?? null;
      return {
        ...prev,
        [activeQuestion.id]: current === value ? null : value
      };
    });
  };

  const handleToggleTimerPause = () => {
    setIsTimerPaused((prev) => !prev);
  };

  const handleSwitchTheme = () => {
    setBoardTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectBoardView = (view: (typeof BOARD_VIEWS)[number]['id']) => {
    setBoardView(view);
  };

  const handleCompetencyRating = (areaId: string, rating: 'strong' | 'neutral' | 'weak') => {
    setCompetencyRatings((prev) => ({
      ...prev,
      [areaId]: prev[areaId] === rating ? null : rating
    }));
  };

  const handleAddQuestion = () => {
    const newQuestion = pickRandomQuestion();
    setQuestionDeck((prev) => [...prev, newQuestion]);
    setQuestionStates((prev) => ({
      ...prev,
      [newQuestion.id]: { answered: false, flagged: false }
    }));
    setRelevanceRatings((prev) => ({
      ...prev,
      [newQuestion.id]: null
    }));
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
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-xl shadow-slate-950/40">
            <div className="flex flex-col gap-6 xl:flex-row">
              <div className="xl:w-2/3">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-inner shadow-slate-950/30">
                  <div ref={dailyCo.containerRef} className="absolute inset-0 h-full w-full" />
                  {(() => {
                    if (isMatchLoading) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-sm text-slate-300">
                          <ArrowPathIcon className="h-6 w-6 animate-spin text-secondary" />
                          <span>Загружаем данные встречи…</span>
                        </div>
                      );
                    }

                    if (matchError) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 px-6 text-center text-sm text-rose-200">
                          <ShieldExclamationIcon className="h-6 w-6" />
                          <span>{matchError}</span>
                          <button
                            type="button"
                            onClick={handleMatchReload}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-200/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
                          >
                            <ArrowPathIcon className="h-4 w-4" /> Обновить данные
                          </button>
                        </div>
                      );
                    }

                    if (!hasDailyRoom) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 px-6 text-center text-sm text-slate-300">
                          <VideoCameraIcon className="h-6 w-6 text-slate-400" />
                          <span>Комната появится автоматически после планирования встречи.</span>
                        </div>
                      );
                    }

                    if (isFetchingRoomToken) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 text-sm text-slate-300">
                          <ArrowPathIcon className="h-6 w-6 animate-spin text-secondary" />
                          <span>Получаем доступ к видеокомнате…</span>
                        </div>
                      );
                    }

                    if (roomTokenError) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 px-6 text-center text-sm text-rose-200">
                          <ShieldExclamationIcon className="h-6 w-6" />
                          <span>{roomTokenError}</span>
                          <button
                            type="button"
                            onClick={handleRoomTokenRetry}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-200/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
                          >
                            <ArrowPathIcon className="h-4 w-4" /> Обновить доступ
                          </button>
                        </div>
                      );
                    }

                    if (!hasDailyToken) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 text-sm text-slate-300">
                          <VideoCameraIcon className="h-6 w-6 text-slate-400" />
                          <span>Готовим доступ к комнате Daily.co…</span>
                        </div>
                      );
                    }

                    if (dailyCo.error && !dailyCo.isConnected) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 px-6 text-center text-sm text-rose-200">
                          <ShieldExclamationIcon className="h-6 w-6" />
                          <span>{dailyCo.error}</span>
                          <button
                            type="button"
                            onClick={dailyCo.retry}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-200/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
                          >
                            <ArrowPathIcon className="h-4 w-4" /> Повторить подключение
                          </button>
                        </div>
                      );
                    }

                    if (dailyCo.isLoading && !dailyCo.isConnected) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 text-sm text-slate-300">
                          <ArrowPathIcon className="h-6 w-6 animate-spin text-secondary" />
                          <span>Подключаемся к Daily.co…</span>
                        </div>
                      );
                    }

                    if (!dailyCo.isConnected) {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/60 text-sm text-slate-300">
                          <WifiIcon className="h-6 w-6 text-slate-400" />
                          <span>Ждём начала — подключение откроется в момент старта.</span>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-6">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Видео-сессия</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        dailyCo.isConnected
                          ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                          : 'border-slate-700 bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      <WifiIcon className="h-4 w-4" /> {dailyCo.isConnected ? 'В эфире' : dailyCo.isLoading ? 'Подключаемся' : 'Ожидание'}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
                      <UserGroupIcon className="h-4 w-4" /> {dailyCo.participantsCount} участник{dailyCo.participantsCount === 1 ? '' : 'ов'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs ${
                        dailyCo.cameraEnabled ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <VideoCameraIcon className="h-4 w-4" /> {dailyCo.cameraEnabled ? 'Камера активна' : 'Камера выключена'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs ${
                        dailyCo.microphoneEnabled ? 'text-emerald-200' : 'text-slate-400'
                      }`}
                    >
                      <MicrophoneIcon className="h-4 w-4" /> {dailyCo.microphoneEnabled ? 'Микрофон включён' : 'Микрофон выключен'}
                    </span>
                  </div>
                </div>

                {(matchError || roomTokenError || (dailyCo.error && !dailyCo.isConnected)) && (
                  <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                    <div className="flex items-start gap-3">
                      <ShieldExclamationIcon className="mt-0.5 h-5 w-5" />
                      <div className="space-y-2">
                        <p>{matchError ?? roomTokenError ?? dailyCo.error}</p>
                        <div className="flex flex-wrap gap-2">
                          {matchError && (
                            <button
                              type="button"
                              onClick={handleMatchReload}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-200/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
                            >
                              <ArrowPathIcon className="h-4 w-4" /> Обновить данные
                            </button>
                          )}
                          {roomTokenError && (
                            <button
                              type="button"
                              onClick={handleRoomTokenRetry}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-200/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
                            >
                              <ArrowPathIcon className="h-4 w-4" /> Повторить попытку
                            </button>
                          )}
                          {dailyCo.error && !dailyCo.isConnected && (
                            <button
                              type="button"
                              onClick={dailyCo.retry}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-200/10 px-3 py-1 text-xs font-semibold text-rose-100 transition hover:bg-rose-200/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-200"
                            >
                              <ArrowPathIcon className="h-4 w-4" /> Повторить подключение
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={dailyCo.join}
                    disabled={
                      !hasDailyCredentials ||
                      dailyCo.isConnected ||
                      dailyCo.isLoading ||
                      isFetchingRoomToken
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlayIcon className="h-5 w-5" /> Присоединиться
                  </button>
                  <button
                    type="button"
                    onClick={dailyCo.leaveCall}
                    disabled={!dailyCo.isConnected || dailyCo.isLoading}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PauseIcon className="h-5 w-5" /> Завершить
                  </button>
                  <button
                    type="button"
                    onClick={dailyCo.toggleCamera}
                    disabled={!dailyCo.isConnected}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      dailyCo.cameraEnabled
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 focus-visible:outline-emerald-300'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-900 focus-visible:outline-secondary'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <VideoCameraIcon className="h-5 w-5" />
                    {dailyCo.cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
                  </button>
                  <button
                    type="button"
                    onClick={dailyCo.toggleMicrophone}
                    disabled={!dailyCo.isConnected}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      dailyCo.microphoneEnabled
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 focus-visible:outline-emerald-300'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-900 focus-visible:outline-secondary'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <MicrophoneIcon className="h-5 w-5" />
                    {dailyCo.microphoneEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
                  </button>
                  <button
                    type="button"
                    onClick={dailyCo.retry}
                    disabled={!hasDailyCredentials || dailyCo.isLoading || isFetchingRoomToken}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-5 w-5" /> Переподключить
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Комната Daily.co:</span>
                    {roomId ? (
                      <code className="rounded bg-slate-900/80 px-2 py-1 text-slate-200">{roomId}</code>
                    ) : (
                      <span className="text-slate-500">ещё не создана</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

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

          <section className="space-y-6 rounded-3xl border border-rose-500/60 bg-rose-950/30 p-8 shadow-xl shadow-rose-950/30">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 text-sm text-rose-100/80">
                <p className="text-xs uppercase tracking-[0.3em] text-rose-200/70">Основной таймер</p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-3xl font-semibold text-white">{sessionTimerLabel}</span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 bg-rose-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-100">
                    {sessionMinutesLeft} {formatMinutesLabel(sessionMinutesLeft)} до конца
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-rose-100/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 px-2 py-1 text-rose-100">
                    <ClockIcon className="h-4 w-4" /> {sessionProgressPercent}%
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 px-2 py-1 text-rose-100">
                    <BoltIcon className="h-4 w-4" /> Осталось вопросов: {totalQuestions - answeredCount}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 px-2 py-1 text-rose-100">
                    <FlagIcon className="h-4 w-4" /> Флагов: {flaggedCount}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleToggleTimerPause}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-100/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                >
                  {isTimerPaused ? <PlayIcon className="h-5 w-5" /> : <PauseIcon className="h-5 w-5" />}
                  {isTimerPaused ? 'Продолжить' : 'Пауза'}
                </button>
                <button
                  type="button"
                  onClick={handleSwitchTheme}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-100/20 bg-rose-900/40 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-200"
                >
                  {boardTheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                  {boardTheme === 'dark' ? 'Светлый режим доски' : 'Тёмный режим доски'}
                </button>
                <div className="flex items-center gap-2 rounded-full border border-rose-100/20 bg-rose-900/40 px-4 py-2 text-xs text-rose-100">
                  <CommandLineIcon className="h-4 w-4" /> {HOTKEY_HINTS[1]?.combo} — {HOTKEY_HINTS[1]?.description}
                </div>
              </div>
            </div>
            {latestAlert ? (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-rose-200/40 bg-rose-500/20 px-4 py-3 text-sm text-rose-50">
                <div className="flex items-center gap-3">
                  <BellAlertIcon className="h-5 w-5" />
                  <span>{latestAlert.message}</span>
                </div>
                <span className="text-xs text-rose-100/70">
                  {formatTime(latestAlert.createdAt)} · {timerAlertPreview.length} уведомл.
                </span>
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {timerAlertPreview.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl border border-rose-200/20 bg-rose-900/40 px-4 py-3 text-xs text-rose-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-rose-100">
                      <FlagIcon className="h-4 w-4" /> {alert.milestone} мин
                    </span>
                    <time>{formatTime(alert.createdAt)}</time>
                  </div>
                  <p className="mt-2 text-rose-50/90">{alert.message}</p>
                </div>
              ))}
              {upcomingMilestones.length ? (
                <div className="rounded-2xl border border-rose-200/20 bg-rose-900/40 px-4 py-3 text-xs text-rose-100">
                  <div className="flex items-center gap-2 text-rose-100">
                    <ClockIcon className="h-4 w-4" /> Следующие напоминания
                  </div>
                  <p className="mt-2 text-rose-50/80">
                    {upcomingMilestones.map((milestone) => `${milestone} мин`).join(' · ') || 'Все предупреждения отправлены'}
                  </p>
                </div>
              ) : null}
            </div>
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

          <div className="grid gap-8 xl:grid-cols-[1.7fr_1fr]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AI-панель</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">Вопросы для интервью</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    Управляй подборкой вопросов, чтобы держать ритм сессии. Меняй сложность, перегенерируй подсказки и
                    помечай их релевантность для кандидата.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  <SparklesIcon className="h-5 w-5" /> Добавить вопрос
                </button>
              </div>

              {activeQuestion ? (
                <div className="mt-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 font-semibold text-slate-200">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />{' '}
                      <span>
                        Вопрос {activeQuestionIndex + 1}/{totalQuestions}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${difficultyBadgeClass[activeQuestion.difficulty]}`}
                      >
                        <BoltIcon className="h-4 w-4" /> {difficultyLabels[activeQuestion.difficulty]}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-200">
                        <CommandLineIcon className="h-4 w-4" /> {activeQuestion.category}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-5">
                    <h3 className="text-lg font-semibold text-white">{activeQuestion.prompt}</h3>
                    <p className="mt-4 text-xs uppercase tracking-[0.25em] text-slate-400">Фоллоу-апы</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {activeQuestion.followUps.map((followUp, index) => (
                        <li key={followUp} className="flex items-start gap-2">
                          <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs text-slate-400">
                            {index + 1}
                          </span>
                          <span>{followUp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleQuestionNavigation('prev')}
                        disabled={isPrevDisabled}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronLeftIcon className="h-5 w-5" /> Предыдущий
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuestionNavigation('next')}
                        disabled={isNextDisabled}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Следующий <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleMarkAnswered}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          activeQuestionState?.answered
                            ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 focus-visible:outline-emerald-300'
                            : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900 focus-visible:outline-secondary'
                        }`}
                      >
                        <CheckCircleIcon className="h-5 w-5" /> {activeQuestionState?.answered ? 'Отмечен' : 'Задан'}
                      </button>
                      <button
                        type="button"
                        onClick={handleToggleFlag}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          activeQuestionState?.flagged
                            ? 'border-amber-400/60 bg-amber-500/20 text-amber-200 focus-visible:outline-amber-300'
                            : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900 focus-visible:outline-amber-300'
                        }`}
                      >
                        <FlagIcon className="h-5 w-5" /> {activeQuestionState?.flagged ? 'В стоп-листе' : 'Отметить'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleRegenerateActiveQuestion}
                      className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                    >
                      <ArrowPathIcon className="h-5 w-5" /> Перегенерировать
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDifficultyAdjust('down')}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                    >
                      <ChevronLeftIcon className="h-5 w-5" /> Легче
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDifficultyAdjust('up')}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                    >
                      Сложнее <ChevronRightIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Оценка релевантности</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {relevanceOptions.map((option) => {
                        const isActive = activeQuestionRelevance === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleSetRelevance(option.value)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              isActive
                                ? 'border-secondary bg-secondary text-slate-950 focus-visible:outline-secondary'
                                : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900 focus-visible:outline-secondary'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-6 text-sm text-slate-300">
                  Нет доступных вопросов. Нажми «Добавить вопрос», чтобы сгенерировать новую подсказку.
                </div>
              )}
            </section>

            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/30">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Прогресс кандидата</p>
                    <h2 className="mt-1 text-xl font-semibold text-white">
                      Вопрос {totalQuestions ? activeQuestionIndex + 1 : 0} из {totalQuestions}
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary">
                    <SparklesIcon className="h-4 w-4" /> {candidateProgressPercent}%
                  </span>
                </div>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-secondary transition-all"
                    style={{ width: `${candidateProgressPercent}%` }}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Задано</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{answeredCount}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Флаги</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{flaggedCount}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Осталось</dt>
                    <dd className="mt-2 text-lg font-semibold text-white">{totalQuestions - answeredCount}</dd>
                  </div>
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
                    <dt className="text-xs uppercase tracking-[0.25em] text-slate-400">Текущий статус</dt>
                    <dd className="mt-2 text-sm text-slate-200">
                      {activeQuestionState?.answered
                        ? 'Вопрос закрыт'
                        : activeQuestionState?.flagged
                        ? 'Отложен на потом'
                        : 'Готов к обсуждению'}
                    </dd>
                  </div>
                </dl>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  {questionDeck.map((question, index) => {
                    const state = questionStates[question.id] ?? { answered: false, flagged: false };
                    const isActive = index === activeQuestionIndex;
                    return (
                      <li
                        key={question.id}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs uppercase tracking-wide ${
                          isActive
                            ? 'border-secondary bg-secondary/20 text-secondary'
                            : state.answered
                            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200'
                            : state.flagged
                            ? 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                            : 'border-slate-800/70 bg-slate-950/60 text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-left text-[11px] font-semibold">
                          {isActive ? (
                            <PlayIcon className="h-4 w-4" />
                          ) : state.answered ? (
                            <CheckCircleIcon className="h-4 w-4" />
                          ) : state.flagged ? (
                            <FlagIcon className="h-4 w-4" />
                          ) : (
                            <SparklesIcon className="h-4 w-4" />
                          )}
                          {question.category}
                        </span>
                        <span className="hidden text-[10px] font-semibold text-slate-400 sm:block">
                          {difficultyLabels[question.difficulty]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={`rounded-3xl p-6 shadow-lg shadow-slate-950/30 transition ${boardThemeClasses}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={`text-xs uppercase tracking-[0.3em] ${boardHeaderLabelClass}`}>Общая доска</p>
                    <h2 className={`mt-1 text-xl font-semibold ${boardTitleClass}`}>Рабочее пространство кандидата</h2>
                    <p className={`mt-2 text-sm ${boardDescriptionClass}`}>
                      Переключай темы и представления, чтобы синхронизироваться по заметкам, коду и диаграммам.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSwitchTheme}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${boardThemeButtonClass}`}
                  >
                    {boardTheme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    {boardTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {BOARD_VIEWS.map((view) => {
                    const isActive = boardView === view.id;
                    return (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => handleSelectBoardView(view.id)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          isActive
                            ? 'border-secondary bg-secondary text-slate-950 focus-visible:outline-secondary'
                            : boardTabInactiveClass
                        }`}
                      >
                        {view.label}
                      </button>
                    );
                  })}
                </div>
                <div className={`mt-5 rounded-2xl border p-5 ${boardContentWrapperClass}`}>
                  {boardView === 'notes' ? (
                    <textarea
                      value={boardNotes}
                      onChange={(event) => setBoardNotes(event.target.value)}
                      className={`min-h-[220px] w-full resize-y rounded-xl border px-4 py-3 text-sm leading-relaxed transition focus:border-secondary focus:outline-none ${boardInputClasses}`}
                    />
                  ) : (
                    <pre className={`whitespace-pre-wrap text-sm leading-relaxed ${boardPreTextClass}`}>
                      {boardViewContent}
                    </pre>
                  )}
                </div>
                <ul className="mt-5 grid gap-2 text-xs">
                  {HOTKEY_HINTS.map((hint) => (
                    <li
                      key={hint.combo}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2 ${boardHotkeyItemClass}`}
                    >
                      <span className="font-semibold tracking-wide">{hint.combo}</span>
                      <span className="text-right text-[11px] uppercase tracking-[0.25em]">{hint.description}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

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

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-lg shadow-slate-950/30">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Интервьюер</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Оценка и рекомендации</h2>
              <p className="mt-2 text-sm text-slate-400">
                Зафиксируй впечатления по ключевым компетенциям и подготовь финальный вердикт по кандидату.
              </p>
            </div>
            {notesHotkey ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                <CommandLineIcon className="h-4 w-4" /> {notesHotkey.combo} — {notesHotkey.description}
              </span>
            ) : null}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              {COMPETENCY_AREAS.map((area) => {
                const current = competencyRatings[area.id] ?? null;
                return (
                  <div key={area.id} className={interviewerCardClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{area.label}</h3>
                        <p className="mt-1 text-sm text-slate-300">{area.description}</p>
                      </div>
                      {current ? (
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${COMPETENCY_RATING_CLASSES[current]}`}
                        >
                          {COMPETENCY_RATING_LABELS[current]}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(['strong', 'neutral', 'weak'] as const).map((value) => {
                        const isActive = current === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleCompetencyRating(area.id, value)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              isActive
                                ? COMPETENCY_RATING_CLASSES[value]
                                : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900 focus-visible:outline-secondary'
                            }`}
                          >
                            {COMPETENCY_RATING_LABELS[value]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-4">
              <div className={interviewerCardClass}>
                <h3 className="text-lg font-semibold text-white">Заметки интервьюера</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">
                  Фокус на заметках: {notesHotkey ? notesHotkey.combo : '⌘ + L'}
                </p>
                <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-slate-400">Сводка</label>
                <textarea
                  value={interviewerSummaryNotes}
                  onChange={(event) => setInterviewerSummaryNotes(event.target.value)}
                  rows={4}
                  className={interviewerTextareaClass}
                />
                <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-slate-400">Риски</label>
                <textarea
                  value={interviewerRiskNotes}
                  onChange={(event) => setInterviewerRiskNotes(event.target.value)}
                  rows={3}
                  className={interviewerTextareaClass}
                />
                <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-slate-400">Action items</label>
                <textarea
                  value={interviewerActionItems}
                  onChange={(event) => setInterviewerActionItems(event.target.value)}
                  rows={3}
                  className={interviewerTextareaClass}
                />
              </div>
              <div className={interviewerCardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Рекомендация</h3>
                    <p className="mt-1 text-sm text-slate-300">Выбери финальный вердикт по кандидату.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                    <ClipboardDocumentCheckIcon className="h-4 w-4" />
                    {decisionOptions.find((option) => option.value === recommendationDecision)?.label ?? 'Не выбрано'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {decisionOptions.map((option) => {
                    const isActive = recommendationDecision === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRecommendationDecision(option.value)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                          isActive
                            ? RECOMMENDATION_BADGE_CLASSES[option.value]
                            : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-900 focus-visible:outline-secondary'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-xs text-slate-300">
                  <span className="font-semibold text-secondary">Подсказка:</span> реши вовремя, чтобы координаторы могли
                  назначить следующий шаг без задержек.
                </div>
              </div>
            </div>
          </div>
        </section>

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
