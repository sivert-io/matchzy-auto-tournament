# Fragbase — deploy guide

Quick path from zero to production for **one camp org stack**.

## Prerequisites

- Linux VPS (KVM 2: 2 vCPU / 8 GB is enough for **one** org stack)
- Docker + Docker Compose
- DNS (or Cloudflare Tunnel) for `admin.*` and optional `play.*`
- Steam Web API key
- CS2 servers with MatchZy Enhanced (separate hosts)

## 1. Generate env files

```bash
node scripts/generate-env.mjs
```

Creates (if missing):

| File | Use |
|------|-----|
| `.env` | Local dev (`yarn db`, `yarn dev:org`) |
| `docker/env/local-org.env` | Local Docker org stack on port 3070 |
| `docker/env/local-hub.env` | Local hub on 3068 |
| `docker/env/fragbase-camp.env` | Production camp template |

Edit `STEAM_API_KEY`, domains, and Mercado Pago if charging registration fees.

Re-generate secrets: `node scripts/generate-env.mjs --force`

## 2. Build or pull image

**Option A — pull (after release on Docker Hub)**

Uses `sivertio/matchzy-auto-tournament:latest` in compose files.

**Option B — build on VPS**

```bash
docker compose -f docker/docker-compose.local.yml up -d --build
```

Or set `MAT_IMAGE` in env to your registry tag.

## 3. Start org stack (production)

```bash
cp docker/example.env.org docker/env/meu-camp.env   # or use fragbase-camp.env
# edit HOST_PORT, domains, secrets
./scripts/org-stack.sh meu-camp up
```

Caddy inside the container listens on **3069**; map `HOST_PORT` on the host (default 3069).

### DNS pattern

| Host | Env var | App |
|------|---------|-----|
| `admin.camp.fragbase.gg` | `ORG_HOST` | Organizer console |
| `play.camp.fragbase.gg` | `PLAYER_HOST` | Player portal (optional per camp) |
| `play.fragbase.gg` | Hub `PLAYER_HOST` | Global player hub |

Point DNS / Cloudflare Tunnel to `HOST_PORT` on the VPS.

## 4. Required env (per org)

| Variable | Notes |
|----------|--------|
| `SESSION_SECRET` | Random; required for sessions |
| `SERVER_TOKEN` | Same on all CS2 servers (MatchZy) |
| `DB_PASSWORD` | Postgres in stack |
| `STEAM_API_KEY` | Steam OAuth |
| `FRONTEND_BASE_URL` | `https://admin...` (OAuth redirects) |
| `API_BASE_URL` | Public API URL (MP webhook) |
| `PLAYER_PORTAL_URL` | Checkout return URLs |
| `ORGANIZATION_ID` | Injected from `ORG_SLUG` in compose |
| `MERCADOPAGO_*` | If `registrationFeeCents > 0` |

## 5. Hub (optional)

```bash
cp docker/example.env.hub docker/env/hub.env
./scripts/hub-stack.sh up
```

Hub holds global players/teams; **federation to org camps is future work**.

## 6. First login

1. Open org URL → Login with Steam.
2. On empty DB, **first Steam user** becomes admin automatically.
3. Settings → configure webhook, MP, self-register toggles.
4. Add CS2 servers → create tournament.

## 7. Health check

```bash
curl -s http://localhost:3069/health
curl -s http://localhost:3069/api/organizations/current
```

## Development (local)

**Windows** — `dev:server` uses bash; use the `:win` scripts instead:

```bash
yarn db                  # Postgres (Docker)
yarn dev:org:win         # API :3000 + org http://localhost:5174
yarn dev:player:win      # API :3000 + player http://localhost:5173
```

**Linux/macOS:**

```bash
yarn db
yarn dev:org             # http://localhost:5174
yarn dev:player          # http://localhost:5173
```

If you only run the Vite client without the API, the app shows a warning banner after ~8s (not a black screen).

Docker/Caddy: org → `http://admin.localhost:3069`, player → `http://play.localhost:3069` (not bare `localhost:3069` for org).

## Related

- Topology: `docs/architecture/deployment-topologies.md`
- Portals: `docs/architecture/portals.md`
- Env reference: `docs/ENV.md`
- Handoff: `docs/redesign-split.md`
