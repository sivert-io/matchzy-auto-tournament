# Fragbase portals architecture

## Decision

Fragbase exposes two product portals over one API and one source of truth:

- **Player Hub** (`/play`): player identity, team participation, lobbies, matches, rankings and skins.
- **Organizer Console** (`/organizer`): tournament operations, teams, players, servers, maps, templates, settings and administration.

The portals are separate security and navigation boundaries. They are not separate backends. This avoids duplicating tournament state, authentication, integrations and business rules.

## Route and access model

Canonical paths and access levels live in `client/src/config/portals.ts`.

| Access | Meaning |
| --- | --- |
| `public` | No identity required. Public profiles, team pages and leaderboards. |
| `identity` | A Steam player identity or authenticated administrator is required. |
| `admin` | An administrator session and linked Steam identity are required. |

`RequireAccess` is the client guard. API middleware remains the security boundary; hiding a route in React never grants or revokes permission.

Legacy MAT URLs redirect to canonical organizer/player URLs so bookmarks and internal links keep working during migration.

## Domain boundaries

New backend work should be organized by domain instead of by UI page:

```text
api/src/domains/
  identity/
  organizations/
  teams/
  competitions/
  registrations/
  matches/
  servers/
  integrity/
  billing/
  inventory/
```

Each domain owns its service rules, repository queries, request schemas and events. Routes should translate HTTP into domain calls and must not contain tournament policy.

## Multi-organization data model

The next schema migration should introduce these additive entities before allowing third-party organizers:

```text
organizations
organization_memberships (organization_id, user_id, role)
competitions (organization_id, ...)
competition_staff (competition_id, user_id, role)
team_memberships (team_id, player_id, role, status)
registrations (competition_id, team_id, status, payment_status)
audit_log (organization_id, actor_id, action, entity, before, after)
```

Every organizer query must be scoped by `organization_id`. Platform administrators are explicit and must not be inferred from an absent organization filter.

## Permission model

Prefer capabilities over scattered role comparisons:

- `competition:create`, `competition:publish`, `competition:operate`
- `registration:review`, `payment:review`
- `match:assign-server`, `match:override-result`
- `team:manage-own`, `roster:invite`
- `integrity:review`, `organization:manage-members`

Roles grant capability sets. API handlers authorize the capability against the target organization or competition.

## Extraction path

Keep the current single Vite build while features are being separated. Extract physical workspaces only when independent deployment is useful:

```text
apps/player-web
apps/organizer-web
apps/api
packages/ui
packages/api-client
packages/contracts
```

Because canonical routes, access rules and portal shells are already isolated, this later extraction is mechanical rather than another product rewrite.

## Operational requirements

- Validate all mutations server-side and record privileged changes in `audit_log`.
- Use idempotency keys for payments, registrations and match creation.
- Publish domain events for bracket generation, server allocation and notifications.
- Keep external integrations behind adapters with timeouts, retries and circuit breakers.
- Add contract tests for portal/API boundaries and end-to-end tests for player and organizer critical paths.
