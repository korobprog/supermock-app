# SuperMock Architecture Overview

SuperMock is organised as a pnpm workspace monorepo with three deployable surfaces and shared packages.

```
supermock/
├── app/       # Desktop application (Tauri + Next.js)
├── landing/   # Marketing site (Next.js)
├── server/    # Fastify API + WebSocket backend
├── shared/    # Reusable TypeScript utilities, types, constants
├── docker/    # Container recipes for local + production deploys
├── docs/      # Documentation hub
├── scripts/   # Automation & CI helpers
└── .env       # Root environment file copied from .env.example
```

## Service Boundaries
- **Desktop (Tauri)** – wraps the Next.js experience with native integrations (notifications, file access) and hosts the interview
  tooling: WebRTC conference, Monaco editor, AI-driven prompts, trainer widgets.
- **Landing (Web)** – multilingual marketing site with signup funnels, pricing, waitlist and blog/SEO content.
- **Server (API)** – Fastify service exposing REST + WebSocket endpoints, orchestrating matchmaking, AI analytics, billing and
  notifications. Prisma provides the persistence layer on PostgreSQL/SQLite.

## Cross-cutting Concerns
- **Shared library** centralises domain constants (roles, interview types, matching weights) and pure utilities (matching score
  calculation) to avoid duplication between client and server code.
- **Environment management** is governed through the root `.env` file with per-service overrides. Secrets flow into Docker/
  Kubernetes deployments and CI pipelines.
- **AI integrations** rely on provider-specific keys (OpenRouter, OpenAI, Anthropic, Groq) and the server module handles
  failover/aggregation.
- **Real-time stack** uses Fastify WebSockets for signalling, WebRTC for media, and Redis for state fan-out.
- **Observability** integrates Prometheus exporters, Grafana dashboards and structured logging via Pino.

## Deployment Story
1. Build shared library once (`pnpm --filter @supermock/shared build`).
2. Build each product surface (desktop, landing, server) either via pnpm scripts or Docker multi-stage builds.
3. Deploy containers via Docker Compose, Kubernetes or another orchestrator. `docker/docker-compose.yml` is optimised for local
   development with PostgreSQL + Redis sidecars.
4. Use GitHub Actions/GitLab CI to run lint/test/build pipelines and push images to the configured registry.

See additional specs in `docs/platform-roadmap.md` and workspace-specific READMEs.
