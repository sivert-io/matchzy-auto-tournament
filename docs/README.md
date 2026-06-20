# Fragbase docs

| Doc | Purpose |
|-----|---------|
| [redesign-split.md](./redesign-split.md) | Player/Org split handoff, phases, screen map |
| [DEPLOY.md](./DEPLOY.md) | Production deploy (org stack, hub, first login) |
| [ENV.md](./ENV.md) | All environment variables |
| [qa/fase4-smoke-checklist.md](./qa/fase4-smoke-checklist.md) | Manual QA checklist |
| [architecture/portals.md](./architecture/portals.md) | Portal architecture & routes |
| [architecture/deployment-topologies.md](./architecture/deployment-topologies.md) | Hub + docker-per-org model |

## Preview screenshots

After `yarn dev:player` + `yarn dev:org` + API:

```bash
yarn preview:portals
```

Output: `docs/assets/preview/portals/*.png`
