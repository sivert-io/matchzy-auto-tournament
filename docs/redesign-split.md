# Fragbase — Split Player/Org + Redesign (handoff)

> Doc vivo pra tocar o programa em sessões separadas. Atualize ao fim de cada fase.
> Branch de trabalho: **`feat/split-player-org-apps`** (parte de `main`).

## Objetivo

Separar o front-end em **dois apps físicos** (Player e Org), servidos em **subdomínios próprios**, cada um com **landing + login próprios**, e **reescrever as telas** dos dois portais sobre o **tema glass** (vidro fosco + wallpaper de mapa CS2 trocável, que já foi entregue na `main`). Backend (Express + Postgres + Socket.IO) continua **único e compartilhado**.

## Arquitetura do split

- Um workspace `client`, **dois entry points**:
  - Player: `client/apps/player/index.html` → `client/src/player/{main,App}.tsx` → build em `api/public/play`
  - Org: `client/apps/org/index.html` → `client/src/org/{main,App}.tsx` → build em `api/public/org`
- Providers/chrome comuns: `client/src/shared/AppProviders.tsx` (theme, Auth, Snackbar, PageHeader, Background, `AppBackground`, FAB). Cada App monta **só as rotas do seu portal**.
- Vite: `client/vite.player.config.ts` (porta 5173) e `client/vite.org.config.ts` (porta 5174); ambos com `publicDir`→`client/public`, `fs.allow`→`client/`, e proxy `/api`,`/socket.io`,`/map-images`.
- Serving: `docker/Caddyfile` roteia **por Host** (`PLAYER_HOST` default `play.localhost`, `ORG_HOST` default `admin.localhost`) → dir de cada app, com fallback `:3069` → player. Express serve player em `/app` e org em `/app-org` (caminho secundário).

## Como rodar (dev)

```bash
yarn db            # Postgres (docker)
yarn dev:player    # API + player em http://localhost:5173
# noutro terminal:
yarn dev:org       # API + org em http://localhost:5174
```
Build de produção: `yarn build` (server + os dois apps) ou `yarn client:build:apps` só o front.

## Fases e progresso

- [x] **Fase 0 — Split** (commit `5c2fe63`): dois entries/configs/builds, scripts, Caddy por Host, Express ajustado. Builds e lint OK. Sem mudança visual.
- [x] **Limpeza de legado**: removidos `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`, `client/vite.config.ts`; scripts repontados; eslint ignora os novos vite configs.
- [x] **Fase 1 — Entrada + shells**: landings, login por portal, `PublicTopBar`, gate na raiz, i18n `auth.json`.
- [x] **Fase 2 — Design system em todo o client** (jun/2026):
  - **41 componentes** convertidos `Card` → `GlassCard` via `scripts/convert-cards-to-glass.mjs`
  - **Todas as pages** com `GlassCard` e/ou `PageShell`
  - **Zero** `<Card>` no JSX fora de `GlassCard.tsx` (único wrapper interno)
  - `EmptyState` usa `GlassCard`; import circular com barrel corrigido
  - Build player + org: **EXIT 0**
- [ ] **Fase 3 — Polish/perf/a11y/i18n** e QA visual com backend.

## Cobertura Fase 2

### Pages (todas)

**Player:** Landing, Login, PlayerHome, Lobbies, Inventory, FindPlayer, LobbyRoom, PlayerProfile, TeamMatch, TournamentLeaderboard, NotFound.

**Org:** Landing, Login, ConnectSteam, Dashboard, Tournament, Settings, Teams, Players, Maps, ELOTemplates, Templates, Bracket, Matches, AdminTools, Servers, Development.

### Componentes convertidos (amostra)

Dashboard (`DashboardStats`, charts, onboarding), Tournament (form, stepper, live, shuffle, veto), Team (`MatchInfoCard`, roster, stats), Admin (`LogViewer`, `ServerEventsMonitor`), Modals (`MatchDetailsModal`, `PlayerSelectionModal`), Veto, SwissView, LobbyMatchPanel, EquippedSkinsGallery, EmptyState, StatusLegend, MatchCard, MatchListCard, MapCard, MapPoolCard, etc.

### Exceções intencionais

- **Bracket**: mantém `Box` com `ref` para fullscreen API (não dá pra substituir por `PageShell` no root).
- **Settings / Tournament sub-forms**: usam `Paper`/`Accordion` — estrutura de formulário, não cards de superfície.
- **GlassCard.tsx**: único lugar que importa MUI `Card` diretamente.

## Design system (Fase 2, base)

Primitivas em `client/src/shared/ui/`: `PageShell`, `SectionHeader`, `GlassCard`, `StatTile`, `DataTable`, `EmptyState` (re-export). Manter marca P&B + wallpaper de mapa.

### Larguras padronizadas (`layoutTokens.ts`)

| Token | px | Uso |
|-------|-----|-----|
| `pageWidth.narrow` | 640 | Login, ConnectSteam, NotFound, FindPlayer |
| `pageWidth.content` | 960 | PlayerProfile, TeamMatch |
| `pageWidth.default` | 1200 | Hub org/player, leaderboard, landing |
| `pageWidth.wide` | 1440 | Matches, Tournament, LobbyRoom |
| `pageWidth.full` | 1680 | Dashboard, Servers, bracket (conteúdo interno) |

- **`Layout.tsx`**: cap externo em `pageWidth.full` (1680) — pages escolhem tier interno via `PageShell`.
- **Páginas públicas** (TopNavBar / PublicTopBar): `PageShell` + `publicPageShellSx` (ritmo vertical abaixo da barra).
- **Script**: `scripts/standardize-page-widths.mjs` — troca números mágicos por tokens.

## Decisões/pendências (precisam do dono)

1. **Domínio real + subdomínios**: confirmar hostnames de produção e Cloudflare Tunnel/DNS.
2. **Telas públicas** no app Player — confirmar se org também precisa acessá-las.
3. **Copy/marca** final de landing/login.

## Known issues (pré-existentes)

- `yarn lint` — 1 erro em `client/src/vite-env.d.ts` (Fase 3).
- `tsc -p api` — erros pré-existentes; build usa esbuild.

## Próximos passos (pós-merge Fase 2)

1. Merge `feat/split-player-org-apps` → `main`
2. QA visual com `yarn db` + `dev:player` / `dev:org`
3. Fase 3: pt-BR i18n, strings hardcoded, a11y, produto (inscrições, pagamentos, multi-org)
