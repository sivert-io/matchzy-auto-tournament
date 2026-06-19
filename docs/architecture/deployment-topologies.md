# Deployment topologies for Fragbase

## Chosen model (2026): hub + **one Docker stack per org**

Fragbase standardizes **isolated MAT stacks** for each organizer/camp. That avoids shared tournament state, DB collisions, and Mercado Pago config bleeding between orgs.

```text
                    ┌─────────────────────────────────────┐
                    │  Hub (optional, one VPS or Render)   │
                    │  play.fragbase.gg                   │
                    │  Global players, teams, Steam auth  │
                    │  (future: federate to org APIs)     │
                    └─────────────────────────────────────┘

┌──────────────────────────┐   ┌──────────────────────────┐
│ Org stack: camp-alpha    │   │ Org stack: camp-beta     │
│ admin.camp-alpha.*       │   │ admin.camp-beta.*        │
│ Postgres (isolated)      │   │ Postgres (isolated)      │
│ MAT API + org/play SPAs  │   │ MAT API + org/play SPAs  │
│ Mercado Pago OAuth       │   │ Mercado Pago OAuth       │
│ CS2 webhooks → this API  │   │ CS2 webhooks → this API  │
└──────────────────────────┘   └──────────────────────────┘
         ▲                              ▲
         │         CS2 servers          │
         └──────── (separate hosts) ────┘
```

**Repo tooling**

| Artifact | Purpose |
|----------|---------|
| `docker/docker-compose.org.yml` | Template compose (Postgres + app per org) |
| `docker/docker-compose.hub.yml` | Global player hub (play.fragbase.gg) |
| `docker/example.env.org` | Example env per org |
| `docker/example.env.hub` | Example env for hub |
| `scripts/org-stack.sh` | `up` / `down` / `logs` for one org slug |
| `scripts/hub-stack.sh` | `up` / `down` / `logs` for hub |

```bash
cp docker/example.env.org docker/env/camp-alpha.env
# edit secrets, HOST_PORT, domains
./scripts/org-stack.sh camp-alpha up
```

Each org needs: unique `HOST_PORT` (if same VPS), `ORG_SLUG`, `SESSION_SECRET`, `SERVER_TOKEN`, `DB_PASSWORD`, public URLs, and optional `MERCADOPAGO_*`.

Set `ORGANIZATION_ID` is injected from `ORG_SLUG` in compose (for future API scoping).

---

## VPS sizing (e.g. KVM 2: 2 vCPU, 8 GB RAM, 100 GB disk)

| Workload | On the same KVM? | Rough RAM |
|----------|------------------|-----------|
| **1 org stack** (Postgres + MAT) | Yes | ~1.5–2.5 GB |
| **2 org stacks** | Tight on 8 GB | ~3–5 GB |
| **3+ org stacks** | Not recommended on 8 GB | — |
| **CS2 game servers** | **No** — use dedicated game hosts | ~2–4 GB **per server** |

**Conclusion:** KVM 2 **dá** para **1 camp org stack** (+ hub leve ou só org). Para várias orgs em produção, use **um KVM por org** ou upgrade RAM (16 GB+ for 2–3 small org stacks).

Bandwidth 8 TB and 100 GB disk are ample for the web platform; demos/replays grow disk on game servers, not on MAT.

---

## Alternatives (not the default path)

### Single stack (legacy dev / small private LAN)

`docker/docker-compose.yml` — one tournament, one DB. Fine for homelab, not for multi-tenant prod.

### Logical multi-org (one DB, many `organization_id`)

Cheaper ops but shared blast radius; we keep schema support but **prod standard is docker-per-org**.

---

## Registration & payments

| Mode | Who registers | Payment |
|------|----------------|---------|
| **Shuffle** | Individual players (leaderboard) | Free or MP via org stack |
| **Bracket / Swiss / RR** | Team captain (team page) | Mercado Pago Checkout Pro (**PIX + card**) when fee > 0 |

Roster for camps: **5 starters, 1 coach, 2 reserves** when `role` is set on team players.

---

## Environment variables (payments)

| Variable | Purpose |
|----------|---------|
| `MERCADOPAGO_CLIENT_ID` / `SECRET` | Per-org OAuth |
| `MERCADOPAGO_REDIRECT_URI` | Must match org admin URL |
| `API_BASE_URL` | Webhook (`/api/payments/mercadopago/webhook`) |
| `PLAYER_PORTAL_URL` | Checkout return URLs (often hub `play.*`) |

Webhook: `GET /api/payments/mercadopago/webhook?topic=payment&id=...`

---

## DNS pattern (per org)

| Host | Role |
|------|------|
| `admin.<org>.fragbase.gg` | Organizer console (`ORG_HOST`) |
| `play.<org>.fragbase.gg` | Player portal for that camp (optional) |
| `play.fragbase.gg` | Global hub (optional central player/teams) |

Edge: Cloudflare Tunnel or Caddy on the VPS forwarding to `HOST_PORT` per org stack.
