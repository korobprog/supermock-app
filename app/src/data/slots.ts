export type SlotStatus = 'upcoming' | 'live' | 'completed';

export interface SlotParticipant {
  id: string;
  name: string;
  role: 'candidate' | 'interviewer' | 'observer';
  stack: string[];
  timezone: string;
  avatarColor: string;
}

export interface Slot {
  id: string;
  title: string;
  status: SlotStatus;
  language: string;
  professionId: string;
  start: string;
  end: string;
  sessionFormat: string;
  capacity: number;
  participants: SlotParticipant[];
  focusAreas: string[];
  tools: string[];
  hostName: string;
  notes?: string;
  waitlistCount?: number;
}

export const SLOT_DATA: Slot[] = [
  {
    id: 'slot-frontend-01',
    title: 'Frontend Senior Mock',
    status: 'upcoming',
    language: '🇺🇸 English',
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
    tools: ['React', 'Next.js', 'TypeScript', 'Storybook'],
    hostName: 'Михаил Логинов',
    notes: 'Командная проверка UI-паттернов и SSR, поддержка Figma live handoff.',
    waitlistCount: 1
  },
  {
    id: 'slot-backend-02',
    title: 'Backend Architecture Review',
    status: 'upcoming',
    language: '🇩🇪 German',
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
    tools: ['Node.js', 'NestJS', 'Postgres', 'Docker', 'Kafka'],
    hostName: 'Супервайзер: Даниэль Фогт'
  },
  {
    id: 'slot-data-03',
    title: 'Data Science Pair Session',
    status: 'live',
    language: '🇺🇸 English',
    professionId: 'data-scientist',
    start: '2024-07-19T13:00:00Z',
    end: '2024-07-19T14:30:00Z',
    sessionFormat: 'Hands-on ML case',
    capacity: 3,
    participants: [
      {
        id: 'participant-lila',
        name: 'Lila Zhang',
        role: 'candidate',
        stack: ['Python', 'TensorFlow', 'scikit-learn'],
        timezone: 'Asia/Shanghai',
        avatarColor: 'bg-fuchsia-500'
      },
      {
        id: 'participant-ira',
        name: 'Ира Костина',
        role: 'observer',
        stack: ['Python', 'ML Ops'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-indigo-500'
      }
    ],
    focusAreas: ['Feature engineering', 'ML evaluation'],
    tools: ['Python', 'TensorFlow', 'scikit-learn', 'Airflow'],
    hostName: 'Модератор: Джессика Ли',
    waitlistCount: 2
  },
  {
    id: 'slot-mobile-04',
    title: 'Mobile UX Critique',
    status: 'upcoming',
    language: '🇺🇦 Ukrainian',
    professionId: 'mobile-developer',
    start: '2024-07-20T09:00:00Z',
    end: '2024-07-20T10:00:00Z',
    sessionFormat: 'Portfolio review',
    capacity: 4,
    participants: [
      {
        id: 'participant-oleg',
        name: 'Олег Кравчук',
        role: 'candidate',
        stack: ['Kotlin', 'Swift', 'Compose'],
        timezone: 'Europe/Kyiv',
        avatarColor: 'bg-amber-500'
      }
    ],
    focusAreas: ['Mobile UX', 'Animations', 'Accessibility'],
    tools: ['Figma', 'SwiftUI', 'Jetpack Compose'],
    hostName: 'Куратор: Наталья Черненко'
  },
  {
    id: 'slot-devops-05',
    title: 'DevOps On-Call Simulation',
    status: 'upcoming',
    language: '🇺🇸 English',
    professionId: 'devops-engineer',
    start: '2024-07-21T18:00:00Z',
    end: '2024-07-21T19:30:00Z',
    sessionFormat: 'Incident response drill',
    capacity: 2,
    participants: [
      {
        id: 'participant-rafa',
        name: 'Rafa Costa',
        role: 'interviewer',
        stack: ['Terraform', 'Kubernetes', 'Prometheus'],
        timezone: 'America/Sao_Paulo',
        avatarColor: 'bg-lime-500'
      }
    ],
    focusAreas: ['Incident response', 'Observability'],
    tools: ['Terraform', 'Kubernetes', 'Grafana'],
    hostName: 'Shift lead: Maria Lopez',
    waitlistCount: 3
  },
  {
    id: 'slot-qa-06',
    title: 'QA Automation Lab',
    status: 'live',
    language: '🇪🇸 Spanish',
    professionId: 'qa-engineer',
    start: '2024-07-19T16:00:00Z',
    end: '2024-07-19T17:30:00Z',
    sessionFormat: 'Live bug triage',
    capacity: 2,
    participants: [
      {
        id: 'participant-lucia',
        name: 'Lucía Fernández',
        role: 'candidate',
        stack: ['Cypress', 'Playwright', 'Jest'],
        timezone: 'Europe/Madrid',
        avatarColor: 'bg-yellow-500'
      },
      {
        id: 'participant-cesar',
        name: 'César Ortiz',
        role: 'interviewer',
        stack: ['Selenium', 'Allure'],
        timezone: 'America/Bogota',
        avatarColor: 'bg-blue-500'
      }
    ],
    focusAreas: ['Automation strategy', 'Flaky tests'],
    tools: ['Playwright', 'Cypress', 'Jest', 'Allure'],
    hostName: 'Lead QA: Мария Белова'
  },
  {
    id: 'slot-ux-07',
    title: 'UX Research Deep-Dive',
    status: 'completed',
    language: '🇺🇸 English',
    professionId: 'ux-designer',
    start: '2024-07-15T10:00:00Z',
    end: '2024-07-15T11:30:00Z',
    sessionFormat: 'Research critique',
    capacity: 3,
    participants: [
      {
        id: 'participant-ivanna',
        name: 'Ivanna Petrova',
        role: 'candidate',
        stack: ['UX Research', 'User interviews'],
        timezone: 'Europe/Prague',
        avatarColor: 'bg-purple-500'
      },
      {
        id: 'participant-jonas',
        name: 'Jonas Weber',
        role: 'interviewer',
        stack: ['Service Design', 'UX Research'],
        timezone: 'Europe/Berlin',
        avatarColor: 'bg-cyan-500'
      }
    ],
    focusAreas: ['Discovery research', 'Journey mapping'],
    tools: ['Maze', 'Notion', 'Figma'],
    hostName: 'Research lead: Emily Carter',
    notes: 'Разбор реальных кейсов исследования пользовательского опыта.',
    waitlistCount: 2
  },
  {
    id: 'slot-sre-08',
    title: 'SRE Reliability Clinic',
    status: 'completed',
    language: '🇺🇸 English',
    professionId: 'sre-engineer',
    start: '2024-07-12T14:00:00Z',
    end: '2024-07-12T15:30:00Z',
    sessionFormat: 'Postmortem workshop',
    capacity: 3,
    participants: [
      {
        id: 'participant-hiro',
        name: 'Hiro Tanaka',
        role: 'interviewer',
        stack: ['Kubernetes', 'SLOs'],
        timezone: 'Asia/Tokyo',
        avatarColor: 'bg-red-500'
      }
    ],
    focusAreas: ['Postmortems', 'SLOs'],
    tools: ['Datadog', 'PagerDuty', 'Grafana'],
    hostName: 'SRE Lead: Anton Kuznetsov'
  },
  {
    id: 'slot-data-analyst-09',
    title: 'Data Analyst Dashboard Review',
    status: 'upcoming',
    language: '🇺🇸 English',
    professionId: 'data-analyst',
    start: '2024-07-22T11:00:00Z',
    end: '2024-07-22T12:00:00Z',
    sessionFormat: 'Dashboard critique',
    capacity: 3,
    participants: [
      {
        id: 'participant-dmitry',
        name: 'Дмитрий Лебедев',
        role: 'observer',
        stack: ['Tableau', 'SQL'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-emerald-500'
      }
    ],
    focusAreas: ['BI Dashboards', 'Storytelling'],
    tools: ['Tableau', 'Power BI', 'SQL'],
    hostName: 'Moderator: Grace Kim'
  },
  {
    id: 'slot-product-manager-10',
    title: 'Product Strategy Jam',
    status: 'live',
    language: '🇺🇸 English',
    professionId: 'product-manager',
    start: '2024-07-19T17:00:00Z',
    end: '2024-07-19T18:30:00Z',
    sessionFormat: 'Strategy workshop',
    capacity: 4,
    participants: [
      {
        id: 'participant-samira',
        name: 'Samira Khan',
        role: 'candidate',
        stack: ['Product strategy', 'User research'],
        timezone: 'Asia/Dubai',
        avatarColor: 'bg-pink-500'
      },
      {
        id: 'participant-lev',
        name: 'Лев Александров',
        role: 'observer',
        stack: ['Product analytics', 'Pricing'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-slate-500'
      }
    ],
    focusAreas: ['North Star metric', 'Pricing strategy'],
    tools: ['Notion', 'Miro', 'Amplitude'],
    hostName: 'PM Coach: Brian Summers',
    waitlistCount: 1
  },
  {
    id: 'slot-prompt-11',
    title: 'Prompt Engineering Lab',
    status: 'upcoming',
    language: '🇺🇸 English',
    professionId: 'prompt-engineer',
    start: '2024-07-23T12:00:00Z',
    end: '2024-07-23T13:30:00Z',
    sessionFormat: 'Hands-on prompt tuning',
    capacity: 3,
    participants: [
      {
        id: 'participant-arjun',
        name: 'Arjun Patel',
        role: 'interviewer',
        stack: ['LLMOps', 'LangChain', 'RAG'],
        timezone: 'Asia/Kolkata',
        avatarColor: 'bg-orange-500'
      },
      {
        id: 'participant-marta',
        name: 'Marta Nowak',
        role: 'candidate',
        stack: ['Prompt tuning', 'LLMs'],
        timezone: 'Europe/Warsaw',
        avatarColor: 'bg-sky-500'
      }
    ],
    focusAreas: ['Prompt tuning', 'Evaluation'],
    tools: ['LangChain', 'OpenAI', 'Weights & Biases'],
    hostName: 'AI Facilitator: Chen Wei'
  },
  {
    id: 'slot-writer-12',
    title: 'Technical Writing Circle',
    status: 'completed',
    language: '🇺🇸 English',
    professionId: 'technical-writer',
    start: '2024-07-10T16:00:00Z',
    end: '2024-07-10T17:30:00Z',
    sessionFormat: 'Peer review',
    capacity: 4,
    participants: [
      {
        id: 'participant-nina',
        name: 'Nina Petrov',
        role: 'candidate',
        stack: ['API Docs', 'Developer experience'],
        timezone: 'Europe/Belgrade',
        avatarColor: 'bg-red-500'
      }
    ],
    focusAreas: ['API Docs', 'DX'],
    tools: ['Markdown', 'Notion', 'Docusaurus'],
    hostName: 'Editor: Chloe Martin',
    waitlistCount: 1
  },
  {
    id: 'slot-project-13',
    title: 'Project Management Mastermind',
    status: 'upcoming',
    language: '🇺🇸 English',
    professionId: 'project-manager',
    start: '2024-07-26T09:00:00Z',
    end: '2024-07-26T10:30:00Z',
    sessionFormat: 'Risk workshop',
    capacity: 3,
    participants: [
      {
        id: 'participant-ines',
        name: 'Ines Laurent',
        role: 'interviewer',
        stack: ['Agile', 'Risk management'],
        timezone: 'Europe/Paris',
        avatarColor: 'bg-emerald-500'
      }
    ],
    focusAreas: ['Risk management', 'Stakeholder comms'],
    tools: ['Jira', 'Confluence', 'Miro'],
    hostName: 'Coach: Daniel Roberts',
    notes: 'Разбор сложного кейса управления зависимостями в распределённой команде.'
  },
  {
    id: 'slot-business-analyst-14',
    title: 'Business Analyst Metrics Lab',
    status: 'upcoming',
    language: '🇺🇸 English',
    professionId: 'business-analyst',
    start: '2024-07-28T14:00:00Z',
    end: '2024-07-28T15:30:00Z',
    sessionFormat: 'Case interview',
    capacity: 3,
    participants: [
      {
        id: 'participant-ali',
        name: 'Ali Hassan',
        role: 'candidate',
        stack: ['SQL', 'Financial analysis'],
        timezone: 'Asia/Riyadh',
        avatarColor: 'bg-indigo-500'
      }
    ],
    focusAreas: ['Metrics discovery', 'Stakeholder alignment'],
    tools: ['SQL', 'Power BI', 'Excel'],
    hostName: 'Lead BA: Victoria Smirnova'
  },
  {
    id: 'slot-chinese-mentor-15',
    title: 'Mandarin Career Coaching',
    status: 'completed',
    language: '🇨🇳 Chinese',
    professionId: 'product-manager',
    start: '2024-07-08T09:00:00Z',
    end: '2024-07-08T10:00:00Z',
    sessionFormat: 'Career coaching session',
    capacity: 2,
    participants: [
      {
        id: 'participant-lian',
        name: 'Lian Zhao',
        role: 'interviewer',
        stack: ['Product strategy', 'Leadership'],
        timezone: 'Asia/Shanghai',
        avatarColor: 'bg-amber-500'
      },
      {
        id: 'participant-wei',
        name: 'Wei Chen',
        role: 'observer',
        stack: ['Coaching', 'UX Research'],
        timezone: 'Asia/Hong_Kong',
        avatarColor: 'bg-blue-500'
      }
    ],
    focusAreas: ['Career planning', 'Leadership'],
    tools: ['Notion', 'Miro'],
    hostName: 'Coach: Yuchen Li'
  },
  {
    id: 'slot-russian-frontend-16',
    title: 'Frontend разработка на React',
    status: 'upcoming',
    language: '🇷🇺 Russian',
    professionId: 'frontend-developer',
    start: '2024-07-30T14:00:00Z',
    end: '2024-07-30T15:30:00Z',
    sessionFormat: 'Live coding (React + TypeScript)',
    capacity: 3,
    participants: [
      {
        id: 'participant-alexey',
        name: 'Алексей Петров',
        role: 'interviewer',
        stack: ['React', 'TypeScript', 'Next.js'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-blue-500'
      },
      {
        id: 'participant-maria',
        name: 'Мария Сидорова',
        role: 'candidate',
        stack: ['React', 'Redux', 'Jest'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-pink-500'
      }
    ],
    focusAreas: ['React hooks', 'Performance optimization', 'Testing'],
    tools: ['React', 'TypeScript', 'Jest', 'Storybook'],
    hostName: 'Ментор: Дмитрий Козлов',
    notes: 'Практическое занятие по современным паттернам React разработки.',
    waitlistCount: 2
  },
  {
    id: 'slot-russian-backend-17',
    title: 'Backend архитектура на Node.js',
    status: 'live',
    language: '🇷🇺 Russian',
    professionId: 'backend-developer',
    start: '2024-07-19T12:00:00Z',
    end: '2024-07-19T13:30:00Z',
    sessionFormat: 'System design interview',
    capacity: 2,
    participants: [
      {
        id: 'participant-sergey',
        name: 'Сергей Волков',
        role: 'interviewer',
        stack: ['Node.js', 'PostgreSQL', 'Redis'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-green-500'
      }
    ],
    focusAreas: ['API design', 'Database optimization', 'Caching'],
    tools: ['Node.js', 'Express', 'PostgreSQL', 'Redis'],
    hostName: 'Архитектор: Андрей Морозов',
    waitlistCount: 1
  },
  {
    id: 'slot-russian-data-18',
    title: 'Data Science с Python',
    status: 'upcoming',
    language: '🇷🇺 Russian',
    professionId: 'data-scientist',
    start: '2024-07-31T10:00:00Z',
    end: '2024-07-31T11:30:00Z',
    sessionFormat: 'ML case study',
    capacity: 3,
    participants: [
      {
        id: 'participant-elena',
        name: 'Елена Новикова',
        role: 'candidate',
        stack: ['Python', 'Pandas', 'Scikit-learn'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-purple-500'
      },
      {
        id: 'participant-vladimir',
        name: 'Владимир Соколов',
        role: 'observer',
        stack: ['Python', 'TensorFlow', 'MLOps'],
        timezone: 'Europe/Moscow',
        avatarColor: 'bg-orange-500'
      }
    ],
    focusAreas: ['Feature engineering', 'Model evaluation', 'MLOps'],
    tools: ['Python', 'Pandas', 'Scikit-learn', 'Docker'],
    hostName: 'Data Lead: Игорь Лебедев',
    notes: 'Разбор реального кейса машинного обучения для e-commerce.'
  }
];

export async function fetchSlotDetails(id: string): Promise<Slot> {
  const slot = SLOT_DATA.find((item) => item.id === id);

  if (!slot) {
    throw new Error('Slot not found');
  }

  return slot;
}
