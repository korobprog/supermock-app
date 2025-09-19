# SuperMock Desktop App

Tauri + Next.js shell for the hybrid desktop experience served from https://app.supermock.ru.

## Available Scripts

```bash
pnpm install
pnpm dev        # start Next.js and watch mode
tauri dev       # run the desktop shell once Rust deps are installed
pnpm build      # production build
```

## Project Highlights
- Next.js 14 + TypeScript + Tailwind CSS
- Tauri 2 for native window management and system integrations
- Shared packages imported via the monorepo workspace
- Designed to host video interviews, Monaco editor, chat, notifications and AI feedback modules

Refer to `/docs/architecture.md` for the big picture.
