# Fragbase — smoke checklist (manual QA before VPS deploy)

Run with local Postgres + dev portals:

```bash
yarn db
yarn dev:player:win   # http://localhost:5173
yarn dev:org:win      # http://localhost:5174 (second terminal)
```

## Player portal — public browse (no login)

- [ ] `/` hub loads with glass background, skip link, cards (Camps, Teams, Players, Leaderboard)
- [ ] `/camps` shows organization + current tournament (`GET /api/public/camp`)
- [ ] `/teams` lists teams with search (`GET /api/public/teams`)
- [ ] `/teams/:id` shows roster + stats (public slim page, not captain console)
- [ ] `/player` search navigates to `/player/:steamId` public profile
- [ ] `/leaderboard` redirects to active tournament leaderboard
- [ ] `/login` Steam / SSO providers load
- [ ] Top nav: Home · Championships · Teams · Players · Leaderboard

## Player portal — after login (`/play`)

- [ ] PlayerHome + self-register CTA when enabled in org Settings
- [ ] Tournament leaderboard: shuffle self-registration
- [ ] `/team/:id` captain registration (free + Mercado Pago when fee > 0)
- [ ] Lobbies / skins under authenticated layout

## Org portal (`/organizer`)

- [ ] `/` shows organizer auth gate (not public browse)
- [ ] Dashboard StatTile links work
- [ ] Settings: self-register toggles, Mercado Pago OAuth
- [ ] Tournament: team registration fee, roster roles in TeamModal
- [ ] Bracket / Matches / Servers without layout regressions

## API smoke (automated)

```bash
yarn test:manual -- tests/api/organization.spec.ts
yarn test:manual -- tests/api/publicBrowse.spec.ts
```

## VPS deploy

```bash
node scripts/generate-env.mjs
# edit docker/env/fragbase-camp.env (domains, STEAM_API_KEY, secrets)
./scripts/org-stack.sh fragbase-camp up
```

Health:

```bash
curl -s https://admin.YOUR_CAMP/health
curl -s https://admin.YOUR_CAMP/api/public/camp
curl -s https://play.YOUR_CAMP/camps
```

See `docs/DEPLOY.md` for DNS, Mercado Pago webhook URL and CS2 server webhooks.
