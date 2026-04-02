#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="${APP_NAME:-fileviewer}"
IMAGE_NAME="${IMAGE_NAME:-${APP_NAME}:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-${APP_NAME}}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"

if command -v docker >/dev/null 2>&1; then
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-docker}"
elif command -v podman >/dev/null 2>&1; then
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"
else
  echo "Neither docker nor podman is installed." >&2
  exit 1
fi

cd "${SCRIPT_DIR}"

if ! "${CONTAINER_RUNTIME}" image inspect "${IMAGE_NAME}" >/dev/null 2>&1; then
  echo "Image ${IMAGE_NAME} does not exist yet. Running deploy first."
  "${SCRIPT_DIR}/deploy.sh"
fi

if [ -f "${SCRIPT_DIR}/.env" ]; then
  ENV_FILE_ARGS=(--env-file "${SCRIPT_DIR}/.env")
else
  ENV_FILE_ARGS=()
fi

if "${CONTAINER_RUNTIME}" ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "Removing existing container ${CONTAINER_NAME}"
  "${CONTAINER_RUNTIME}" rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "Starting ${CONTAINER_NAME} on port ${HOST_PORT}"
"${CONTAINER_RUNTIME}" run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  "${ENV_FILE_ARGS[@]}" \
  "${IMAGE_NAME}"

echo "App available at http://127.0.0.1:${HOST_PORT}"
