# Portal preview gallery

Screenshots of the Player and Org portals (glass UI).

## Generate

```bash
yarn db
yarn api:dev          # terminal 1 — API on :3000
yarn client:dev:player # terminal 2 — http://localhost:5173
yarn client:dev:org    # terminal 3 — http://localhost:5174
yarn preview:portals
```

Or with concurrent dev:

```bash
yarn db
yarn dev:player   # API + player
# second terminal: yarn dev:org
yarn preview:portals
```

## Files

| File | Screen |
|------|--------|
| `org-landing.png` | Org landing |
| `org-login.png` | Org login |
| `org-dashboard.png` | Dashboard + StatTiles |
| `org-tournament.png` | Tournament |
| `org-settings.png` | Settings |
| `player-landing.png` | Player landing |
| `player-login.png` | Player login |
| `player-home.png` | Player home |

Legacy full-app screenshots (pre-split): `docs/assets/preview/*.png` via `yarn screenshot:generate`.
