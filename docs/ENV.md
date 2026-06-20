# Environment variables

Complete reference for Fragbase / MatchZy Auto Tournament.

**Quick start:** `node scripts/generate-env.mjs` then add `STEAM_API_KEY`.

## Required for production (org camp stack)

| Variable | Example | Notes |
|----------|---------|--------|
| `SESSION_SECRET` | random 32+ bytes | express-session |
| `SERVER_TOKEN` | random | Same on all CS2 MatchZy servers |
| `DB_PASSWORD` | random | Postgres in stack |
| `STEAM_API_KEY` | from Steam | https://steamcommunity.com/dev/apikey |
| `FRONTEND_BASE_URL` | `https://admin.camp.fragbase.gg` | Org portal — **OAuth redirects** |
| `API_BASE_URL` | `https://admin.camp.fragbase.gg` | CS2 webhooks, Mercado Pago |
| `PLAYER_PORTAL_URL` | `https://play.camp.fragbase.gg` | Checkout return URLs |
| `ORG_HOST` | `admin.camp.fragbase.gg` | Caddy vhost → org SPA |
| `PLAYER_HOST` | `play.camp.fragbase.gg` | Caddy vhost → player SPA |
| `ORG_SLUG` | `camp-alpha` | Compose project + `ORGANIZATION_ID` |

Mercado Pago (only if `registrationFeeCents > 0`):

| Variable | Example |
|----------|---------|
| `MERCADOPAGO_CLIENT_ID` | MP OAuth app |
| `MERCADOPAGO_CLIENT_SECRET` | MP OAuth secret |
| `MERCADOPAGO_REDIRECT_URI` | `API_BASE_URL/api/payments/mercadopago/callback` |

## Local dev (split portals)

```env
FRONTEND_BASE_URL=http://localhost:5174   # org Vite
API_BASE_URL=http://localhost:3000        # API
PLAYER_PORTAL_URL=http://localhost:5173   # player Vite
MERCADOPAGO_REDIRECT_URI=http://localhost:3000/api/payments/mercadopago/callback
```

## Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | API port inside container |
| `NODE_ENV` | No | `development` | `production` on Docker stacks |
| `SESSION_SECRET` | **Prod** | dev fallback | Session signing |
| `SERVER_TOKEN` | **Prod** | — | MatchZy + API server auth |

## Database

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Set by `docker-compose.org.yml` in Docker |
| `DB_HOST` | `127.0.0.1` local / `postgres` in compose |
| `DB_PORT` | `5432` |
| `DB_USER` | `postgres` |
| `DB_PASSWORD` | Postgres password |
| `DB_NAME` | `matchzy_tournament` (hub: `fragbase_hub`) |

## Multi-instance / org

| Variable | Description |
|----------|-------------|
| `ORG_SLUG` | Stack slug (`org-stack.sh` argument) |
| `ORGANIZATION_ID` | Usually same as `ORG_SLUG` |
| `ORGANIZATION_NAME` | Display name |
| `ORGANIZATION_SLUG` | URL slug |
| `HOST_PORT` | Host port mapped to Caddy `3069` |
| `PLAYER_HOST` | Player SPA hostname |
| `ORG_HOST` | Org SPA hostname |

## URLs

| Variable | Used for |
|----------|----------|
| `FRONTEND_BASE_URL` | Steam/SSO OAuth return URLs (org admin) |
| `API_BASE_URL` | MatchZy webhooks, MP webhook, Swagger |
| `PLAYER_PORTAL_URL` | Mercado Pago checkout success/failure URLs |

## Auth

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_STEAM_ENABLED` | `true` | Steam login |
| `STEAM_API_KEY` | — | Required for Steam |
| `AUTH_DISCORD_ENABLED` | — | Optional SSO |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | — | Discord OAuth |
| `AUTH_GITHUB_ENABLED` | — | Optional SSO |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | GitHub OAuth |
| `AUTH_KEYCLOAK_ENABLED` | — | Optional SSO |
| `KEYCLOAK_ISSUER_URL` / `KEYCLOAK_CLIENT_ID` / `KEYCLOAK_CLIENT_SECRET` | — | Keycloak OIDC |

## Docker deploy

| Variable | Description |
|----------|-------------|
| `MAT_IMAGE` | Default `sivertio/matchzy-auto-tournament:latest` |

## Logging

| Variable | Default |
|----------|---------|
| `LOG_LEVEL` | `info` |
| `LOG_HTTP_REQUESTS` | `true` (set `false` to quiet) |
| `LOG_DB_VERBOSE` | auto when `LOG_LEVEL=debug` |
| `LOG_RCON_VERBOSE` | `false` |

## Optional

| Variable | Description |
|----------|-------------|
| `CORS_ORIGIN` | Socket.IO CORS (default `*`) |
| `FACEIT_API_KEY` | FACEIT ELO in lobbies |
| `CS2_ADMINS_JSON_PATH` | Path to admins.json on server |
| `GITHUB_TOKEN` | fetchCS2Maps GitHub API |
| `MATCHZY_ENABLE_SIMULATION_IN_PROD` | Simulation in prod |
| `ENABLE_TEST_ENDPOINTS` | E2E test helpers |
| `TEST_STEAM_ID` | Playwright admin Steam ID |

## Files

| File | Purpose |
|------|---------|
| `.env` | Local dev (`yarn dev:player` / `yarn dev:org`) |
| `docker/env/fragbase-camp.env` | Production camp (generated) |
| `docker/example.env.org` | Template per-org stack |
| `docker/example.env.hub` | Global hub stack |
| `example.env` | Annotated reference (copy to `.env`) |

Generate:

```bash
node scripts/generate-env.mjs
node scripts/generate-env.mjs --force   # regenerate secrets
```

See `docs/DEPLOY.md` for VPS steps.
