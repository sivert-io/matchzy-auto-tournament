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
- [x] **Fase 2 — Design system em todo o client** (jun/2026, commit `9ef0137`):
  - **41 componentes** convertidos `Card` → `GlassCard` via `scripts/convert-cards-to-glass.mjs`
  - **Todas as pages** com `GlassCard` e/ou `PageShell` (exceto **Bracket** — ver exceções)
  - **Zero** `<Card>` no JSX fora de `GlassCard.tsx` (único wrapper interno)
  - `EmptyState` usa `GlassCard`; import circular com barrel corrigido
  - **`layoutTokens.ts`**: tiers `pageWidth.*` + `publicPageShellSx`; cap do `Layout` em `pageWidth.full`
  - **Zero** `Container maxWidth` nas pages — largura só via `PageShell`
  - Build player + org: **EXIT 0** (`yarn client:build:apps`)
- [x] **Fase 3 — Polish/i18n/a11y** (jun/2026):
  - Locale **`pt-BR`** completo (`client/src/locales/pt-BR/`), registrado em `i18n.ts` com fallback `pt` → `pt-BR`
  - **LanguageSwitcher**: pt-BR (default), en, lv
  - **PlayerHome**, **ConnectSteam**, **Bracket**, **TournamentLeaderboard** — strings em i18n
  - **a11y**: `PageShell` como `<main id="main-content">`, skip link (Layout + PublicTopBar), `aria-label` na navegação
  - `yarn lint` → 0 errors; `yarn client:build:apps` → OK
- [ ] **Fase 4 — Produto + QA** (manual / backend):
  - [x] **Self-register (player)**: `/api/auth/me` expõe `allowSelfRegister`; `AuthContext.selfRegister()`; CTAs em **PlayerHome** e **PlayerProfile** quando auto-cadastro está ativo
  - [x] **Shuffle inscrição (player)**: individual shuffle registration on public leaderboard
  - [x] **Inscrição por time**: captain registers on team page; Mercado Pago Checkout Pro (PIX + card) when fee > 0
  - [x] **Elenco campeonato**: roles `starter` / `coach` / `reserve` (5+1+2) + validation
  - [x] **Mercado Pago (org)**: OAuth connect + checkout preference + webhook
  - [x] **Multi-org (schema + seed)**: tables + default org; API `GET /api/organizations/current`
  - [x] **Deploy topologies doc**: `docs/architecture/deployment-topologies.md`
  - [x] **Docker per org**: `docker-compose.org.yml`, `org-stack.sh`, `example.env.org`
  - [x] **Player hub stack**: `docker-compose.hub.yml`, `hub-stack.sh`, `example.env.hub`
  - [x] **ORGANIZATION_ID env**: seed + tournament `organization_id` from instance env
  - [ ] QA visual com backend (`yarn db` + `dev:player` / `dev:org`)
  - [ ] Multi-org API scoping (queries filtered by `organization_id`)
  - [ ] Remount opcional **DashboardStats** → `StatTile`

## Cobertura Fase 2

### Pages (todas)

**Player:** Landing, Login, PlayerHome, Lobbies, Inventory, FindPlayer, LobbyRoom, PlayerProfile, TeamMatch, TournamentLeaderboard, NotFound.

**Org:** Landing, Login, ConnectSteam, Dashboard, Tournament, Settings, Teams, Players, Maps, ELOTemplates, Templates, Bracket, Matches, AdminTools, Servers, Development.

### Componentes convertidos (amostra)

Dashboard (`DashboardStats`, charts, onboarding), Tournament (form, stepper, live, shuffle, veto), Team (`MatchInfoCard`, roster, stats), Admin (`LogViewer`, `ServerEventsMonitor`), Modals (`MatchDetailsModal`, `PlayerSelectionModal`), Veto, SwissView, LobbyMatchPanel, EquippedSkinsGallery, EmptyState, StatusLegend, MatchCard, MatchListCard, MapCard, MapPoolCard, etc.

### Exceções intencionais

- **Bracket**: mantém `Box` com `ref` para fullscreen API — **sem `PageShell` no root**; usa `GlassCard` nos blocos internos.
- **Login / Landing / ConnectSteam**: `PageShell` estreito/default, layout **centrado na viewport** — **não** usam `publicPageShellSx` (só páginas com `TopNavBar`).
- **Settings / Tournament sub-forms**: usam `Paper`/`Accordion` — estrutura de formulário, não cards de superfície.
- **GlassCard.tsx**: único lugar que importa MUI `Card` diretamente.

### Mapa `pageWidth` por tela

| Tier | Pages |
|------|-------|
| `narrow` (640) | Login, ConnectSteam, NotFound, FindPlayer |
| `content` (960) | PlayerProfile, TeamMatch |
| `default` (1200) | PlayerHome¹, Lobbies, Inventory, Landing, TournamentLeaderboard, Teams, Players, Maps, Settings, Templates, ELOTemplates, AdminTools, Development |
| `wide` (1440) | Matches, Tournament, LobbyRoom |
| `full` (1680) | Dashboard, Servers |
| *(sem PageShell)* | Bracket |

¹ `PlayerHome` usa `pageWidth.default` explicitamente.

### Scripts de manutenção

- `scripts/convert-cards-to-glass.mjs` — migração mecânica `Card` → `GlassCard`
- `scripts/standardize-page-widths.mjs` — números mágicos → `pageWidth.*`

### Opcional (Fase 4)

- Remount fino do **DashboardStats** com `StatTile` (hoje glass via tema; funcional)
- QA visual com backend (`yarn db` + `dev:player` / `dev:org`)

## Design system (Fase 2, base)

Primitivas em `client/src/shared/ui/`: `PageShell`, `SectionHeader`, `GlassCard`, `StatTile`, `DataTable`, `EmptyState` (re-export). Manter marca P&B + wallpaper de mapa.

### Larguras padronizadas (`layoutTokens.ts`)

| Token | px | Uso |
|-------|-----|-----|
| `pageWidth.narrow` | 640 | Login, ConnectSteam, NotFound, FindPlayer |
| `pageWidth.content` | 960 | PlayerProfile, TeamMatch |
| `pageWidth.default` | 1200 | Hub org/player, leaderboard, landing, PlayerHome |
| `pageWidth.wide` | 1440 | Matches, Tournament, LobbyRoom |
| `pageWidth.full` | 1680 | Dashboard, Servers |

- **`Layout.tsx`**: cap externo em `pageWidth.full` (1680) — pages escolhem tier interno via `PageShell`.
- **Páginas públicas com `TopNavBar`**: `PageShell` + `publicPageShellSx` (FindPlayer, PlayerProfile, TeamMatch, TournamentLeaderboard, NotFound).
- **Login / Landing / ConnectSteam**: `PageShell` sem `publicPageShellSx` (centrado na viewport).

## Decisões/pendências (precisam do dono)

1. **Domínio real + subdomínios**: confirmar hostnames de produção e Cloudflare Tunnel/DNS.
2. **Telas públicas** no app Player — confirmar se org também precisa acessá-las.
3. **Copy/marca** final de landing/login.

## Known issues (pré-existentes)

- `tsc -p api` — erros pré-existentes; build usa esbuild.

## Próximos passos

1. **QA visual** com backend: `yarn db` + `yarn dev:player` / `yarn dev:org`
2. Merge `feat/split-player-org-apps` → `main`
3. **Fase 4 (restante)**: inscrições player + checkout MP, multi-org no backend, QA visual
