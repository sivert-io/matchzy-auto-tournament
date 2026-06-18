# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MatchZy Auto Tournament (MAT) is an automated CS2 tournament management platform. It manages tournament brackets, map veto, player ratings (OpenSkill ELO), match loading onto CS2 game servers via the MatchZy Enhanced plugin, and real-time updates via WebSockets.

## Architecture

Yarn workspaces monorepo with two packages:

- **`api/`** (`@matchzy/api`) — Express + TypeScript backend. Uses PostgreSQL (via raw `pg` queries, no ORM), Socket.IO for real-time events, Passport for auth (Steam, Discord, GitHub, Keycloak). Built with esbuild (`api/esbuild.config.js`). Schema is defined in `api/src/config/database.schema.ts` with auto-migration on startup.
- **`client/`** (`@matchzy/client`) — React 18 + Vite SPA. Uses MUI, react-router-dom, react-i18next, socket.io-client. Builds into `api/public/` so the API serves the SPA in production.

Key integration: CS2 game servers run the MatchZy Enhanced plugin which sends webhook events to `/api/events`. The API sends RCON commands back to control matches. The `matchEventHandler` service processes these events and updates match/tournament state.

### API layer structure
- `api/src/routes/` — Express route handlers (REST endpoints under `/api/*`)
- `api/src/services/` — Business logic (tournament progression, match loading, veto, ratings, RCON, server tracking)
- `api/src/config/` — Database, auth (Passport strategies), Swagger
- `api/src/types/` — TypeScript type definitions
- `api/src/utils/` — Helpers (logging via pino, match progression logic)

### Client layer structure
- `client/src/pages/` — Route-level page components
- `client/src/components/` — UI components organized by domain (admin, tournament, match, veto, team, player)
- `client/src/hooks/` — Custom React hooks (bracket rendering, live stats, socket connections)
- `client/src/contexts/` — React contexts (Auth, Snackbar, PageHeader)
- `client/src/utils/api.ts` — API client; all calls use relative `/api/*` paths (proxied by Vite in dev, Caddy in prod)
- `client/src/locales/` — i18n translation JSON files (English is source of truth)
- `client/src/brackets-viewer/` — Vendored/forked bracket rendering library (excluded from linting)

### Real-time flow
Socket.IO server (`api/src/services/socketService.ts`) emits typed events for tournament updates, bracket changes, match state, veto progress, and server status. The client subscribes via hooks like `useTournament`, `useLiveStats`, `usePlayerConnections`.

## Development Commands

```bash
# Install dependencies
yarn install

# Start dev (API + client concurrently, API logs to logs/ directory)
yarn dev              # client accessible on network
yarn dev:localhost     # client on localhost only

# Start individual services
yarn api:dev          # API only (tsx watch, port 3000)
yarn client:dev       # Vite dev server only (port 5173)

# Build
yarn build            # syncs version, builds API (esbuild) + client (Vite → api/public/)
yarn build:server     # API only
yarn build:client     # client only

# Lint
yarn lint             # ESLint (flat config: eslint.config.mjs)
yarn lint:fix

# Database (Docker PostgreSQL)
yarn db               # Start or create postgres container (port 5432)
yarn db:stop
yarn db:reset         # Remove and recreate container (loses data)

# Docker (production)
yarn docker:up                # Pull image + start (docker-compose.yml)
yarn docker:local:up          # Build from source + start (docker-compose.local.yml)
yarn docker:local:rebuild     # Rebuild just the app container
```

## Testing

Tests are Playwright E2E tests (API + UI) in `tests/`. They require a running API + PostgreSQL instance.

```bash
# Run all tests (sharded in Docker, default 4 shards)
yarn test

# Run all tests single-threaded
yarn test:single

# Run specific test file
yarn test:manual -- tests/api/veto.spec.ts

# Run tests by tag
yarn test:veto          # @veto tagged tests
yarn test:cs-major      # @cs-major tagged tests

# Run with Playwright UI
yarn test:ui

# API tests only
yarn test:api

# Install Playwright browsers
yarn test:install
```

Tests use `tests/playwright.config.ts` (workers: 1 to prevent DB collisions). Sharded tests (`yarn test`) spin up isolated Docker containers per shard with separate databases. Test helpers are in `tests/helpers/`.

## Environment Setup

Copy `example.env` to `.env`. Key variables:
- `DATABASE_URL` or individual `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME`
- `SERVER_TOKEN` — shared secret between API and CS2 servers
- `SESSION_SECRET` — for express-session
- `STEAM_API_KEY` — required for Steam auth
- `FRONTEND_BASE_URL` — used for OAuth redirects

## i18n

English translations live in `client/src/locales/en/translation.json`. Utility scripts:
```bash
yarn workspace @matchzy/client i18n:check      # Check for duplicate keys
yarn workspace @matchzy/client i18n:missing     # Find missing translations
yarn workspace @matchzy/client i18n:sync        # Sync missing keys to other locales
```

## Key Technical Details

- Node 20 (`.nvmrc`)
- The API uses `?` placeholder SQL that gets converted to PostgreSQL `$1, $2` style at runtime (`convertPlaceholders` in `database.ts`)
- Database schema auto-creates tables on startup; migrations are applied inline in `database.schema.ts`
- The client build output goes to `api/public/` — the Express server serves the SPA from there in production
- In dev, Vite proxies `/api/*`, `/socket.io/*`, and `/map-images/*` to Express on port 3000
- Production runs behind Caddy (in Docker) which reverse-proxies to Express on port 3000, exposed on port 3069
- Tournament bracket logic uses the `brackets-manager` library (single/double elimination, Swiss, round robin, shuffle)
- Version is kept in sync across root, api, and client `package.json` via `scripts/sync-version.sh`
