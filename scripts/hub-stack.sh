#!/usr/bin/env bash
# Manage the global Fragbase player hub stack.
#
# Usage:
#   ./scripts/hub-stack.sh up
#   ./scripts/hub-stack.sh down
#   ./scripts/hub-stack.sh logs
#   ./scripts/hub-stack.sh ps
#
# Requires docker/env/hub.env (see docker/example.env.hub).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ACTION="${1:-up}"
ENV_FILE="${ROOT}/docker/env/hub.env"
COMPOSE_FILE="${ROOT}/docker/docker-compose.hub.yml"
PROJECT="fragbase-hub"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy docker/example.env.hub and edit values first."
  exit 1
fi

export HUB_ENV_FILE="$ENV_FILE"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

case "$ACTION" in
  up)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT" up -d
    echo "Hub stack running on port ${HOST_PORT:-3068}"
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
