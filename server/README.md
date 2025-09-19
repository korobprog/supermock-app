# SuperMock API Server

Fastify + TypeScript backend powering matchmaking, interviews and analytics.

## Quick start
```bash
pnpm install
pnpm --filter @supermock/server dev
```

## Responsibilities
- REST & WebSocket gateways
- WebRTC signalling, queueing and matchmaking
- AI provider orchestration
- Prisma ORM for PostgreSQL/SQLite
- Auth (JWT + OAuth providers)
- Notification orchestration (Telegram, push, email)

See `/docs/api-overview.md` for module design.
