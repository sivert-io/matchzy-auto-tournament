#!/usr/bin/env bash
# Manage an isolated Fragbase stack for one organization.
#
# Usage:
#   ./scripts/org-stack.sh <org-slug> up
#   ./scripts/org-stack.sh <org-slug> down
#   ./scripts/org-stack.sh <org-slug> logs
#   ./scripts/org-stack.sh <org-slug> ps
#
# Requires docker/env/<org-slug>.env (see docker/example.env.org).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORG_SLUG="${1:?usage: org-stack.sh <org-slug> <up|down|logs|ps>}"
ACTION="${2:-up}"
ENV_FILE="${ROOT}/docker/env/${ORG_SLUG}.env"
COMPOSE_FILE="${ROOT}/docker/docker-compose.org.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy docker/example.env.org and edit values first."
  exit 1
fi

export ORG_SLUG
export ORG_ENV_FILE="$ENV_FILE"

# Load HOST_PORT from env file for compose substitution
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

PROJECT="fragbase-${ORG_SLUG}"

case "$ACTION" in
  up)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" up -d
    echo "Org stack '${ORG_SLUG}' running on port ${HOST_PORT:-3069}"
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" down
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" logs -f --tail=100
    ;;
  ps)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" ps
    ;;
  *)
    echo "Unknown action: $ACTION (use up, down, logs, ps)"
    exit 1
    ;;
esac
