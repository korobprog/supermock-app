# 🚀 SuperMock AI Interview System

Полнофункциональная система для проведения моковых технических собеседований с поддержкой AI. Включает десктопное приложение (Tauri + React) и серверную часть (Node.js + Fastify).

## ✨ Возможности

### 🖥️ Десктопное приложение (Tauri)
- **Видео-интервью**: Высококачественная видео и аудио связь через WebRTC
- **Живое программирование**: Редактор кода с подсветкой синтаксиса (Monaco Editor)
- **Чат в реальном времени**: Мгновенные сообщения во время интервью
- **AI анализ**: Детальная обратная связь и рекомендации от AI
- **Локальные уведомления**: Уведомления через Tauri API
- **Настройки**: Гибкая настройка языка, темы, редактора кода
- **История интервью**: Просмотр и экспорт прошлых сессий

### 🖥️ Серверная часть (Node.js + Fastify)
- **REST API**: Полный API для всех операций с интервью
- **WebSocket**: Реальное время для чата, видео-звонков и совместной работы с кодом
- **Аутентификация**: JWT с поддержкой OAuth (Google, Telegram)
- **AI интеграция**: OpenAI, Anthropic, OpenRouter для анализа интервью
- **Matchmaking**: Умная система подбора кандидатов и интервьюеров
- **База данных**: PostgreSQL с Prisma ORM

## 🛠 Технологии

### Frontend (Tauri)
- **Desktop**: Tauri 2.x
- **UI**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Code Editor**: Monaco Editor (VS Code engine)
- **Video/Audio**: WebRTC
- **State Management**: React Context API
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **AI**: OpenAI, Anthropic, OpenRouter
- **WebSocket**: Native WebSocket support
- **Language**: TypeScript

### DevOps
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Database**: PostgreSQL 15
- **Cache**: Redis

## 📦 Быстрый старт

### Предварительные требования

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (или используйте Docker)
- Rust (для Tauri)

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd supermock-ai-interview
```

### 2. Настройка окружения

```bash
# Скопируйте пример конфигурации
cp server/env.example .env

# Отредактируйте .env файл с вашими настройками
nano .env
```

### 3. Запуск полной системы

```bash
# Запуск всех сервисов (база данных, сервер, nginx)
./start-full-system.sh
```

### 4. Запуск десктопного приложения

```bash
cd decktop
npm install
npm run tauri:dev
```

## 🔧 Конфигурация

### Переменные окружения

Основные настройки в файле `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/supermock_interviews"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-here"

# AI API Keys
# AI Configuration
# Note: Users now provide their own OpenRouter API keys through the frontend settings
# No server-side AI API keys are required

# OAuth (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
```

## 📚 API Документация

### Основные эндпоинты

- **Health Check**: `GET /health`
- **Authentication**: `POST /api/auth/login`, `POST /api/auth/register`
- **Interviews**: `GET /api/interviews`, `POST /api/interviews`
- **AI Analysis**: `POST /api/ai/analyze`, `POST /api/ai/questions`
- **WebSocket**: `ws://localhost:3001/ws`

### WebSocket сообщения

```javascript
// Подключение
const ws = new WebSocket('ws://localhost:3001/ws', {
  headers: {
    'user-id': 'user-id',
    'interview-id': 'interview-id'
  }
});

// Отправка сообщения
ws.send(JSON.stringify({
  type: 'message',
  data: { content: 'Hello!', type: 'TEXT' },
  timestamp: Date.now()
}));
```

## 🏗 Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Tauri App     │    │   Web Frontend  │    │   Mobile App    │
│   (Desktop)     │    │   (Optional)    │    │   (Future)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Nginx Proxy          │
                    │   (Load Balancer)         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    Fastify Server         │
                    │  (REST API + WebSocket)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    PostgreSQL + Redis     │
                    │    (Database + Cache)     │
                    └───────────────────────────┘
```

## 🚀 Развертывание

### Development

```bash
# Запуск в режиме разработки
./start-full-system.sh

# Запуск только сервера
cd server
npm run dev

# Запуск только Tauri приложения
cd decktop
npm run tauri:dev
```

### Production

```bash
# Сборка и запуск production версии
docker-compose -f docker-compose.full.yml up --build -d

# Остановка системы
./stop-system.sh
```

### Docker команды

```bash
# Просмотр логов
docker-compose -f docker-compose.full.yml logs -f

# Перезапуск сервиса
docker-compose -f docker-compose.full.yml restart server

# Подключение к базе данных
docker-compose -f docker-compose.full.yml exec postgres psql -U supermock -d supermock_interviews
```

## 🧪 Тестирование

```bash
# Тестирование сервера
cd server
npm test

# Тестирование с покрытием
npm run test:coverage

# Тестирование API
curl http://localhost:3001/health
```

## 📊 Мониторинг

### Health Checks

- **Server**: `http://localhost:3001/health`
- **Database**: Проверка через Docker
- **Redis**: Проверка через Docker

### Логи

```bash
# Все сервисы
docker-compose -f docker-compose.full.yml logs -f

# Только сервер
docker-compose -f docker-compose.full.yml logs -f server

# Только база данных
docker-compose -f docker-compose.full.yml logs -f postgres
```

## 🔒 Безопасность

- JWT-based аутентификация
- Хеширование паролей с bcrypt
- CORS конфигурация
- Rate limiting
- Валидация входных данных с Zod
- Защита от SQL инъекций с Prisma
- XSS защита

## 📁 Структура проекта

```
supermock-ai-interview/
├── decktop/                 # Tauri десктопное приложение
│   ├── src/
│   │   ├── components/      # React компоненты
│   │   ├── pages/          # Страницы приложения
│   │   ├── contexts/       # React контексты
│   │   └── main/           # Tauri main process
│   ├── src-tauri/          # Tauri конфигурация
│   └── package.json
├── server/                 # Node.js сервер
│   ├── src/
│   │   ├── routes/         # API маршруты
│   │   ├── websocket/      # WebSocket обработчики
│   │   ├── middleware/     # Middleware
│   │   └── lib/           # Утилиты
│   ├── prisma/            # База данных схема
│   └── package.json
├── docker-compose.full.yml # Docker Compose конфигурация
├── nginx.conf             # Nginx конфигурация
├── start-full-system.sh   # Скрипт запуска
├── stop-system.sh         # Скрипт остановки
└── README.md
```

## 🤝 Разработка

### Добавление новых функций

1. **Backend**: Добавьте маршруты в `server/src/routes/`
2. **Frontend**: Добавьте компоненты в `decktop/src/components/`
3. **Database**: Обновите схему в `server/prisma/schema.prisma`
4. **WebSocket**: Добавьте обработчики в `server/src/websocket/`

### Code Style

- **TypeScript**: Строгая типизация
- **ESLint**: Автоматическое форматирование
- **Prettier**: Единый стиль кода
- **Conventional Commits**: Стандартные коммиты

## 📝 Лицензия

MIT License

## 🆘 Поддержка

- **Issues**: Создайте issue в репозитории
- **Documentation**: Проверьте документацию в папках `decktop/README.md` и `server/README.md`
- **Community**: Присоединяйтесь к обсуждениям

## 🎯 Roadmap

- [ ] Мобильное приложение (React Native)
- [ ] Интеграция с календарями
- [ ] Расширенная аналитика
- [ ] Интеграция с HR системами
- [ ] Многоязычная поддержка
- [ ] Видео запись интервью
- [ ] Автоматическое тестирование кода

---

**SuperMock AI Interview System** - Будущее технических собеседований уже здесь! 🚀

Создано с ❤️ командой SuperMock