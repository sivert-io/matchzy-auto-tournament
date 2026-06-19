# Fragbase Fase 4 — smoke checklist (manual QA)

Run with local Postgres + dev portals:

```bash
yarn db
yarn dev:player   # http://localhost:5173
yarn dev:org      # http://localhost:5174 (second terminal)
```

## Player portal (`/play`)

- [ ] Landing loads with glass background and skip link
- [ ] Login / Steam connect flow opens
- [ ] PlayerHome shows self-register CTA when enabled in org Settings
- [ ] Tournament leaderboard: shuffle self-registration register/unregister
- [ ] Team page: captain sees registration card (free + paid fee paths)
- [ ] PlayerProfile self-register CTA when logged in without player row

## Org portal (`/org`)

- [ ] Dashboard: four **StatTile** summary cards link to tournament/matches/servers/players
- [ ] Settings: toggles `allowSelfRegister`, shuffle self-register, MP OAuth connect
- [ ] Tournament: team self-registration toggle + registration fee (BRL cents)
- [ ] Teams: championship roster roles (starter/coach/reserve) in TeamModal
- [ ] Bracket / Matches / Servers pages render without layout regressions

## API smoke (optional)

```bash
yarn test:manual -- tests/api/organization.spec.ts
```

## Deploy stacks (production)

```bash
cp docker/example.env.hub docker/env/hub.env && ./scripts/hub-stack.sh up
cp docker/example.env.org docker/env/camp-alpha.env && ./scripts/org-stack.sh camp-alpha up
```
