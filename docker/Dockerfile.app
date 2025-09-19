# syntax=docker/dockerfile:1.6

FROM node:20-bullseye as base
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY app/package.json app/
COPY shared/package.json shared/

RUN corepack enable && pnpm fetch

COPY . .
RUN pnpm --filter @supermock/shared build && pnpm --filter @supermock/app build

FROM node:20-bullseye
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/app/.next ./.next
COPY --from=base /app/app/public ./public
COPY --from=base /app/app/package.json ./package.json
COPY --from=base /app/app/next.config.mjs ./next.config.mjs

RUN corepack enable && pnpm install --prod

EXPOSE 3000
CMD ["pnpm", "start"]
