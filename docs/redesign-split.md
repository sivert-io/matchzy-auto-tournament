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
- [x] **Fase 1 — Entrada + shells** (implementada, falta QA visual): `pages/Landing.tsx` (compartilhada, dirigida por `portal`) com hero + CTAs + destaques glass; `Login` agora é portal-aware (copy/marca por portal via `login.{portal}.*`, link "voltar"); `components/layout/PublicTopBar.tsx` (barra pública leve p/ landing+login, sem o polling do `SharedNavBar`); raiz `/` de cada app virou um gate (logado → home; senão → Landing); corrigido bug latente do `TopNavBar` que não passava `portal` ao `SharedNavBar`. i18n em `auth.json` (en + pt-PT): seções `landing.*` e `login.{player,organizer}.*`. Build dos dois apps e lint OK (só o erro pré-existente do `vite-env.d.ts`).
- [~] **Fase 2 — Reescrita das telas** (em andamento). Design system glass criado em `client/src/shared/ui/` (`PageShell`, `SectionHeader`, `GlassCard`, `StatTile`, `EmptyState`, `DataTable` + barrel `index.ts`). Telas-piloto: **PlayerHome** remontada sobre os primitivos (PageShell + SectionHeader + GlassCard); **Dashboard** envolvida em `PageShell` no nível de página. **Pendente:** remount interno do `DashboardStats` (744 linhas, cards compostos + charts MUI-X) — é tarefa própria; hoje continua glass/funcional via tema. Build + lint OK. Telas autenticadas não têm QA visual (precisa de backend/auth).
- [ ] **Fase 3 — Polish/perf/a11y/i18n** e limpeza final.

## Telas a remontar (Fase 2)

Legenda: ✅ remontada · 🚧 parcial · ⬜ pendente.

- **Player:** Landing ✅, Login ✅, PlayerHome ✅, Lobbies ✅, Skins/Inventory ✅, FindPlayer ✅, LobbyRoom ⬜ (1136 linhas), PlayerProfile ⬜ (1600).
- **Org:** Landing ✅, Login ✅, Teams ✅, Players ✅, Maps ✅ (MapCard/MapPoolCard), ELOTemplates ✅, AdminTools ✅, Templates ✅, Dashboard 🚧 (shell em PageShell; `DashboardStats` 744 linhas com charts ⬜), Tournament ⬜ (1183), Bracket ⬜ (798), Matches ⬜ (853), Servers ⬜ (1851), Settings ⬜ (2059), Development ⬜ (1107).

> As pendentes são telas grandes (369–2059 linhas); cada uma é um trabalho focado. Padrão de remontagem já estabelecido: `PageShell`/`SectionHeader` no shell, `GlassCard` (com `interactive`/`onClick`/`to`) nos cards, `EmptyState` (de `shared/ui`, que re-exporta `components/shared`) nos vazios, `StatTile`/`DataTable` onde couber.

## Design system (Fase 2, base)

Primitivas glass em `client/src/shared/ui/` consumidas pelos dois apps: `PageShell`, `SectionHeader`, `GlassCard`, `StatTile`, `DataTable`, `EmptyState`. Manter marca P&B + wallpaper de mapa. Cada tela é **remontada** (hierarquia/agrupamento), não só repintada.

## Decisões/pendências (precisam do dono)

1. **Domínio real + subdomínios**: confirmar hostnames de produção e como o **Cloudflare Tunnel/DNS** mapeia `play.*` e `admin.*` → container `:3069`. Hoje os hostnames são env (`PLAYER_HOST`/`ORG_HOST`) com default `*.localhost`. **Serving de prod não foi testado.**
2. **Telas públicas** (PlayerProfile, TeamMatch, Leaderboard) hoje vivem no app **Player**. Confirmar se é isso mesmo ou se devem ser acessíveis também pelo Org.
3. **Login**: na Fase 1, separar landing/login por portal (decidido). Definir copy/marca de cada um.

## Known issues (pré-existentes, não do split)

- `yarn lint` acusa **1 erro** em `client/src/vite-env.d.ts` (triple-slash p/ `theme.d.ts`) — já existia no `main` (commit `7ead4e5`). Não mexi: é augmentation de tipos e o build não typecheck-a, então o fix tem risco sem validação. Tratar na Fase 3.
- `tsc -p api/tsconfig.json` tem vários erros **pré-existentes** em serviços do backend; o build real usa esbuild (`yarn build:server`), que passa.

## Próximos passos (próxima sessão)

1. **QA visual da Fase 1**: subir `dev:player` e `dev:org`, conferir landing (anônimo), login por portal, gate da raiz (logado → home) e o glass nas duas barras públicas.
2. Definir copy/marca final de cada landing/login (hoje há defaults em `auth.json`); confirmar secondary CTA do org (hoje aponta p/ docs `docs.sivert.io`).
3. **Fase 2** — telas-piloto: **PlayerHome** e **Dashboard** como referência do redesign.
4. Definir o **design system** (`shared/ui/`) e atacar as telas restantes em lote.
