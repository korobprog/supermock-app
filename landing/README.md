# SuperMock Landing

Маркетинговая посадочная страница SuperMock, собранная на Next.js 14 с поддержкой i18n и компонентами shadcn/ui. Проект больше не использует Vite или сторонние роутеры – глобальная навигация и счётчик Яндекс.Метрики подключаются напрямую через Next.js.

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- pnpm 8+

### Установка зависимостей
В корне репозитория выполните:

```bash
pnpm install
```

### Режим разработки
Запуск локального сервера выполняется командой:

```bash
pnpm dev --filter ./landing
```

### Production-сборка
Сборка и запуск production-версии:

```bash
pnpm build --filter ./landing
pnpm start --filter ./landing
```

## 🧱 Структура
- `src/pages` – страницы Next.js с локализацией через `next-i18next`
- `src/components/Layout.tsx` – общий лэйаут с `Navigation` и `YandexMetrika`
- `public/` – статические ресурсы (иллюстрации, иконки)

## 🧰 Используемые технологии
- Next.js 14
- React 18 + TypeScript
- next-i18next
- Tailwind CSS + shadcn/ui

## 📝 Линтинг и форматирование
ESLint и Stylelint настроены, но запуск выполняется напрямую через соответствующие бинарники, если это потребуется:

```bash
pnpm exec next lint
pnpm exec stylelint "src/**/*.{css,scss}" --fix
```

