#!/usr/bin/env bash
set -euo pipefail

corepack enable
pnpm install
pnpm db:migrate || true
pnpm db:seed || true

printf '\nSuperMock environment bootstrapped.\n'
