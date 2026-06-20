# Environment variables

## Core

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port inside container (default `3000`) |
| `NODE_ENV` | No | `development` or `production` |
| `SESSION_SECRET` | **Yes (prod)** | express-session secret |
| `SERVER_TOKEN` | **Yes (prod)** | Shared secret with MatchZy on CS2 servers |

## Database

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` (Docker) |
| `DB_HOST` | Host when not using `DATABASE_URL` |
| `DB_PORT` | Default `5432` |
| `DB_USER` | Default `postgres` |
| `DB_PASSWORD` | Postgres password |
| `DB_NAME` | Default `matchzy_tournament` |

## Multi-instance / org

| Variable | Description |
|----------|-------------|
| `ORGANIZATION_ID` | Org slug for this stack (compose sets from `ORG_SLUG`) |
| `ORGANIZATION_NAME` | Display name |
| `ORGANIZATION_SLUG` | URL slug (usually same as id) |
| `PLAYER_HOST` | Caddy vhost for player SPA |
| `ORG_HOST` | Caddy vhost for org SPA |

## URLs

| Variable | Description |
|----------|-------------|
| `FRONTEND_BASE_URL` | OAuth redirect base (org admin URL) |
| `API_BASE_URL` | Public API (Mercado Pago webhook) |
| `PLAYER_PORTAL_URL` | Player portal for checkout returns |

Dev example:

```env
FRONTEND_BASE_URL=http://localhost:5174
API_BASE_URL=http://localhost:3000
PLAYER_PORTAL_URL=http://localhost:5173
```

## Auth

| Variable | Description |
|----------|-------------|
| `AUTH_STEAM_ENABLED` | Default `true` |
| `STEAM_API_KEY` | Required for Steam login |
| `AUTH_DISCORD_ENABLED` | Optional SSO |
| `AUTH_GITHUB_ENABLED` | Optional SSO |
| `AUTH_KEYCLOAK_ENABLED` | Optional SSO |

## Mercado Pago (org checkout)

| Variable | Description |
|----------|-------------|
| `MERCADOPAGO_CLIENT_ID` | OAuth app |
| `MERCADOPAGO_CLIENT_SECRET` | OAuth secret |
| `MERCADOPAGO_REDIRECT_URI` | `API_BASE_URL/api/payments/mercadopago/callback` |

## Logging

| Variable | Default |
|----------|---------|
| `LOG_LEVEL` | `info` |
| `LOG_HTTP_REQUESTS` | optional |
| `LOG_DB_VERBOSE` | auto in debug |

## Generate local files

```bash
node scripts/generate-env.mjs
```

See also `example.env`, `docker/example.env.org`, `docker/example.env.hub`.
