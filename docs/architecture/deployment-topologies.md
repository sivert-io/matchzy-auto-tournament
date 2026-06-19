# Deployment topologies for Fragbase

Fragbase can run as a **single MAT instance** (current default) or evolve into a **hub + org instances** model. This document compares options so product and infra decisions stay aligned with the codebase.

## Current default (single stack)

One API + one PostgreSQL + two static portals (`/play`, `/org`):

```text
Caddy / Render
  ├── play.*  → client player SPA + /api proxy
  ├── org.*   → client org SPA + /api proxy
  └── PostgreSQL (all tournaments, teams, players, registrations)
```

- **Pros**: simplest ops, one migration path, matches today's `organization_id` column as optional metadata.
- **Cons**: all organizers share one DB and one tournament slot (`tournament.id = 1` legacy).

## Option A — Logical multi-org (recommended next step)

Same deployment, **scoped data** by `organization_id`:

- Global **players** and identity (Steam) can remain shared or be org-scoped per policy.
- Each **organization** owns tournaments, servers, registrations, audit log.
- One Docker Compose / one Render web service + managed Postgres.

This is what the schema foundation (`organizations`, `registrations`, `audit_log`) prepares for. Ops stay simple; isolation is application-level.

## Option B — Hub + per-org MAT containers

```text
Hub (global)
  ├── Player portal: profiles, global team registry, cross-org search
  ├── Shared Postgres: players, teams (global IDs), auth
  └── API: identity + team CRUD

Org instance (per organizer)
  ├── Org portal + API
  ├── Postgres: tournaments, matches, servers, registrations for that org only
  └── CS2 server webhooks → org API only
```

- **Pros**: hard isolation, independent upgrades, blast radius per camp.
- **Cons**: many databases, many envs, cross-org leaderboards need federation APIs, Mercado Pago OAuth per org instance (or hub proxy).

**Docker per org is feasible** but is an **ops product**: each org needs `DATABASE_URL`, `SERVER_TOKEN`, `MERCADOPAGO_*`, backups, and DNS (`camp1.fragbase.gg`). The hub would expose SSO/Steam and pass team rosters to org APIs.

## Option C — Hybrid (practical for Fragbase)

1. **One public hub** (`play.fragbase.gg`): players, teams with championship roster (5+1+2), Mercado Pago checkout redirects.
2. **Org workers** optional later: only heavy organizers get a dedicated MAT stack; small orgs stay on shared Option A.

## Registration & payments (product)

| Mode | Who registers | Payment |
|------|----------------|---------|
| **Shuffle** | Individual players on public leaderboard | Free today; paid path can reuse `registrations` |
| **Bracket / Swiss / RR** | **Team captain** on public team page | Mercado Pago Checkout Pro (**PIX + card**) when `registrationFeeCents > 0` |

Roster expectation for paid camps: **5 starters, 1 coach, 2 reserves** (validated when `role` is set on team players).

## Recommendation

1. Ship **Option A** (multi-org scoping in one DB) on the current monorepo — lowest risk.
2. Keep **hub global players/teams** as a product choice (not separate Docker) until you have multiple paying orgs.
3. Introduce **per-org Docker** only for enterprise tenants that need isolated servers/DB; automate with the same `docker/docker-compose.yml` template + unique env file per org.

## Environment variables (payments)

| Variable | Purpose |
|----------|---------|
| `MERCADOPAGO_CLIENT_ID` / `SECRET` | OAuth for organizers |
| `MERCADOPAGO_REDIRECT_URI` | OAuth callback |
| `API_BASE_URL` | Webhook + notification URL (must be reachable by Mercado Pago) |
| `PLAYER_PORTAL_URL` | Return URLs after checkout (defaults to `FRONTEND_BASE_URL`) |

Webhook: `GET /api/payments/mercadopago/webhook?topic=payment&id=...`
