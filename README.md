# 🚀 SuperMock AI Interview Platform

**SuperMock** — это инновационная AI-платформа для подготовки к техническим собеседованиям, которая объединяет реальных людей с искусственным интеллектом для создания максимально реалистичного опыта интервью.

## 🎯 Концепция проекта

Платформа решает проблему недостатка практики перед реальными собеседованиями, предоставляя пользователям возможность проходить моковые интервью с реальными интервьюерами и получать детальную AI-аналитику своих выступлений.

### Основные возможности
- **Real-time видео интервью** с WebRTC технологией
- **AI-генерация вопросов** на основе профиля кандидата
- **Умная система матчинга** по 5 критериям совместимости
- **Тренажер знаний** с адаптивным обучением
- **Многоязычность** - поддержка 6 языков
- **18+ IT профессий** для точного матчинга
- **Двусторонний фидбек** и AI-анализ выступлений

## 🏗️ Архитектура проекта

### Технологический стек
- **Frontend (Desktop)**: Tauri 2.x + Next.js + TypeScript + Tailwind CSS
- **Frontend (Web)**: Next.js + TypeScript + Tailwind CSS  
- **Backend**: Node.js + Fastify + TypeScript + Prisma ORM
- **База данных**: PostgreSQL (production) / SQLite (development)
- **Real-time**: WebSocket + WebRTC для видео/аудио связи
- **AI интеграция**: OpenRouter, Groq, Anthropic, OpenAI
- **Контейнеризация**: Docker + Docker Compose
- **Мониторинг**: Prometheus + Nginx

### Структура проекта
```
supermock/
├── app/                    # Desktop приложение (Tauri + Next.js)
│   ├── src/               # Next.js страницы и компоненты
│   ├── src-tauri/         # Конфигурация Tauri + Rust обвязка
│   └── package.json       # Зависимости desktop приложения
├── landing/               # Landing page (Next.js)
│   ├── src/               # Страницы, компоненты, стили лендинга
│   └── package.json       # Зависимости лендинга
├── server/                # Backend сервер (Node.js + Fastify)
│   ├── src/               # Исходный код сервера и маршруты
│   ├── prisma/            # Схема базы данных и сиды
│   └── tests/             # Unit/Integration тесты
├── shared/                # Общие типы, утилиты, константы
│   └── src/               # Исходники, собираемые в пакет
├── docker/                # Docker конфигурации и docker-compose
├── docs/                  # Документация (архитектура, roadmap)
├── scripts/               # Вспомогательные скрипты (bootstrap, CI)
├── package.json           # Общие скрипты pnpm workspace
├── pnpm-workspace.yaml    # Определение workspace
├── .env.example           # Пример переменных окружения
└── README.md              # Этот файл
```

### 🧱 Настройка монорепозитория

```bash
corepack enable
pnpm install           # установить зависимости во всех пакетах
cp .env.example .env   # скопировать и заполнить переменные окружения
pnpm dev               # запустить все приложения в дев-режиме
```

Отдельный запуск сервисов:

```bash
pnpm --filter @supermock/app dev      # desktop shell (Next.js + Tauri)
pnpm --filter @supermock/landing dev  # маркетинговый сайт
pnpm --filter @supermock/server dev   # Fastify API
```

Порты разработчика по умолчанию:

- https://supermock.ru локально → http://localhost:3000 (`landing`)
- https://app.supermock.ru локально → http://localhost:3100 (`app`)
- https://api.supermock.ru локально → http://localhost:4000 (`server`)

## 🌍 Многоязычность

Платформа поддерживает 6 языков:
- **English** (английский) - основной язык
- **Русский** (русский) - приоритетный для русскоязычного рынка  
- **Español** (испанский) - для испаноязычных стран
- **Français** (французский) - для франкоязычных регионов
- **Deutsch** (немецкий) - для немецкоязычных стран
- **中文** (китайский) - для китайскоязычного рынка

## 👥 Система ролей пользователей

- **CANDIDATE** - кандидаты, проходящие собеседования
- **INTERVIEWER** - интервьюеры, проводящие собеседования  
- **ADMIN** - администраторы платформы

## 🎯 Типы интервью

- **TECHNICAL** - технические собеседования
- **BEHAVIORAL** - поведенческие интервью
- **SYSTEM_DESIGN** - системное проектирование
- **CODING_CHALLENGE** - алгоритмические задачи
- **MOCK_INTERVIEW** - общие моковые интервью

## 💼 IT Профессии (18+ специальностей)

### Основные разработческие роли:
- **Frontend Developer** - Next.js, Vue.js, Angular, Svelte, JavaScript, TypeScript
- **Backend Developer** - Node.js, Python, Java, C#, Go, Express, FastAPI, Spring Boot
- **Full Stack Developer** - Next.js, Vue.js, TypeScript, Node.js, Python, Express
- **Mobile Developer** - React Native, Flutter, Xamarin, Swift, Kotlin, Java
- **DevOps Engineer** - AWS, Azure, Google Cloud, Docker, Kubernetes, Helm
- **QA Engineer** - Selenium, Cypress, Jest, Mocha, JavaScript, Python, Java

### Специализированные роли:
- **Data Scientist** - Python, R, SQL, TensorFlow, PyTorch, Scikit-learn
- **Data Engineer** - Python, SQL, Apache Spark, Hadoop, Kafka, Airflow
- **ML Engineer** - Python, TensorFlow, PyTorch, Scikit-learn, MLflow, Kubeflow
- **Security Engineer** - Python, Bash, PowerShell, OWASP, Nmap, Metasploit
- **Cloud Engineer** - AWS, Azure, Google Cloud, Terraform, Ansible, Docker
- **System Administrator** - Linux, Windows Server, networking, DNS, DHCP

### Дизайн и управление:
- **UI/UX Designer** - Figma, Sketch, Adobe XD, InVision, Framer, Principle
- **Product Manager** - Google Analytics, Mixpanel, Amplitude, Jira, Confluence

### Дополнительные роли:
- **Blockchain Developer** - Solidity, Web3.js, Ethereum, Smart contracts
- **Game Developer** - Unity, Unreal Engine, C#, C++, JavaScript
- **Embedded Developer** - C, C++, Assembly, microcontrollers, IoT
- **Other** - Другие IT специальности и нишевые направления

## 📊 Уровни опыта

- **Junior** - Начинающие специалисты (0-2 года опыта)
- **Middle** - Опытные специалисты (2-5 лет опыта)
- **Senior** - Старшие специалисты (5+ лет опыта)

## 🎯 Ключевые страницы

### 1. Страница матчинга (`/interview`)
- Настройка параметров матчинга
- AI-алгоритм совместимости по 5 критериям
- Предварительный просмотр матчей
- Очередь ожидания

### 2. Страница видео интервью (`/conference/:roomId`)
- WebRTC видеозвонки высокого качества
- Monaco Editor для программирования
- Real-time чат
- Демонстрация экрана
- Система оценки в реальном времени

### 3. Страница профиля (`/profile`)
- Личная и профессиональная информация
- Настройки матчинга
- Статистика и достижения
- Управление подпиской

### 4. Страница чата (`/chat`)
- Личные чаты и групповые сообщества
- Фильтрация по языкам и профессиям
- Голосовые и видео-звонки
- Модерация и безопасность

### 5. Тренажер знаний (`/trainer`)
- AI-анализ фидбека после интервью
- Генерация персонализированных вопросов
- Адаптивное обучение
- Система достижений

### 6. Виджет поддержки
- AI-чат с эскалацией к человеку
- Плавающий виджет на всех страницах
- Многоязычная поддержка
- Интеграция с системой тикетов

## 💰 Модель монетизации

### Текущие тарифы (Beta версия)
1. **Free** - $1/месяц
   - Безлимитные моковые собеседования
   - Базовые функции платформы

2. **Basic** - $9.99/месяц
   - Моковые собеседования
   - AI помощник
   - Расширенная аналитика

3. **Pro** - $20/3 месяца (популярный)
   - Все функции Basic
   - Обучение в приложениях
   - Цикл повторения
   - Приоритетная поддержка
   - Эксклюзивные функции

### Социальная миссия
- **10% от всех платежей** направляется на благотворительность
- Бесплатное обучение для людей с ограниченными возможностями
- Поддержка малоимущих семей

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+ 
- pnpm (рекомендуется)
- Docker и Docker Compose
- PostgreSQL (для production)

### Установка

1. **Клонирование репозитория**
```bash
git clone https://github.com/your-username/supermock-app.git
cd supermock-app
```

2. **Установка зависимостей**
```bash
# Установка зависимостей для всех частей проекта
pnpm install

# Или установка по отдельности
cd app && pnpm install
cd ../landing && pnpm install  
cd ../server && pnpm install
```

3. **Настройка переменных окружения**
```bash
# Копирование примера конфигурации
cp .env.example .env

# Редактирование переменных окружения
nano .env
```

4. **Запуск в режиме разработки**
```bash
# Запуск всех сервисов через Docker Compose
docker-compose up -d

# Или запуск по отдельности
pnpm dev:app      # Desktop приложение
pnpm dev:landing  # Landing page
pnpm dev:server   # Backend сервер
```

### Деплой на сервер

1. **Подготовка сервера**
```bash
# Клонирование на сервер
git clone https://github.com/your-username/supermock-app.git
cd supermock-app

# Настройка переменных окружения
cp .env.example .env
nano .env
```

2. **Запуск в production**
```bash
# Сборка и запуск всех контейнеров
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose ps
```

## 🔧 Разработка

### Структура команд

```bash
# Разработка
pnpm dev              # Запуск всех сервисов в dev режиме
pnpm dev:app          # Только desktop приложение
pnpm dev:landing      # Только landing page
pnpm dev:server       # Только backend сервер

# Сборка
pnpm build            # Сборка всех проектов
pnpm build:app        # Сборка desktop приложения
pnpm build:landing    # Сборка landing page
pnpm build:server     # Сборка backend сервера

# Тестирование
pnpm test             # Запуск всех тестов
pnpm test:unit        # Unit тесты
pnpm test:integration # Integration тесты
pnpm test:e2e         # End-to-end тесты

# Линтинг и форматирование
pnpm lint             # Проверка кода
pnpm format           # Форматирование кода
pnpm type-check       # Проверка типов TypeScript

# База данных
pnpm db:migrate       # Применение миграций
pnpm db:seed          # Заполнение тестовыми данными
pnpm db:reset         # Сброс базы данных
```

### Технические особенности

#### Real-time коммуникация
- **WebSocket** для чата и синхронизации состояния
- **WebRTC** для видео/аудио связи
- **STUN/TURN серверы** для NAT traversal
- **Автоматическое переподключение** при потере связи

#### AI интеграция
- **Множественные провайдеры**: OpenRouter, Groq, Anthropic, OpenAI
- **Автоматическое переключение** при исчерпании лимитов
- **Персонализированные модели** для каждого пользователя
- **Детальная аналитика** выступлений

#### Безопасность
- **JWT токены** для аутентификации
- **OAuth интеграция** (Google, Telegram)
- **Шифрование данных** в транзите и покое
- **GDPR совместимость**

## 📊 Мониторинг и метрики

### KPI платформы
- Количество активных пользователей
- Количество проведенных интервью
- Процент успешных трудоустройств
- Retention rate пользователей
- NPS (Net Promoter Score)

### Технические метрики
- Время отклика API (< 200ms)
- Доступность системы (99.9% uptime)
- Производительность WebRTC соединений
- Использование AI провайдеров
- Ошибки и исключения

## 🔗 Полезные ссылки

- **Сайт**: https://supermock.ru/
- **Desktop App**: https://app.supermock.ru/
- **API**: https://api.supermock.ru/
- **Документация**: [Ссылка на документацию]
- **Поддержка**: [Ссылка на поддержку]
- **Telegram Bot**: @SuperMockBot

## 🤝 Участие в разработке

Мы приветствуем вклад в развитие проекта! Пожалуйста, ознакомьтесь с нашими [правилами участия](CONTRIBUTING.md) перед началом работы.

### Как помочь проекту
1. **Сообщения об ошибках** - создавайте issues с подробным описанием
2. **Предложения функций** - делитесь идеями в discussions
3. **Pull requests** - присылайте исправления и новые функции
4. **Документация** - помогайте улучшать документацию
5. **Тестирование** - тестируйте новые версии и сообщайте о проблемах

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 🎯 Roadmap

### Краткосрочные цели (3-6 месяцев)
- [ ] Завершение Beta версии
- [ ] Увеличение пользовательской базы
- [ ] Оптимизация AI алгоритмов
- [ ] Расширение языковой поддержки

### Среднесрочные цели (6-12 месяцев)
- [ ] Мобильное приложение
- [ ] Корпоративные пакеты
- [ ] Интеграция с HR-системами
- [ ] Расширение на новые рынки

### Долгосрочные цели (1-2 года)
- [ ] AI-ментор для персонального обучения
- [ ] Виртуальная реальность для интервью
- [ ] Глобальная сеть интервьюеров
- [ ] IPO или стратегическое партнерство

---

**SuperMock** - готовьтесь к собеседованиям с AI и реальными людьми! 🚀

*Создано с ❤️ для IT сообщества*
