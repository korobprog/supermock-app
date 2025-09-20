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

## Recent additions
- Onboarding completion workflow (`POST /onboarding/complete`) now persists candidate and interviewer profiles
- Real-time session management endpoints (`/sessions/*`) with WebSocket broadcast channel at `/ws/sessions`
- Availability slot live updates via `/ws/slots` and notification streaming on `/ws/notifications`
- AI interview analytics (`GET /analytics/interviews/:id/ai`) and platform stats (`GET /analytics/overview`)
