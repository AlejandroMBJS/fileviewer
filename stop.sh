#!/usr/bin/env bash

set -euo pipefail

APP_NAME="${APP_NAME:-fileviewer}"
CONTAINER_NAME="${CONTAINER_NAME:-${APP_NAME}}"

if command -v docker >/dev/null 2>&1; then
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-docker}"
elif command -v podman >/dev/null 2>&1; then
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"
else
  echo "Neither docker nor podman is installed." >&2
  exit 1
fi

if "${CONTAINER_RUNTIME}" ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  echo "Stopping and removing ${CONTAINER_NAME}"
  "${CONTAINER_RUNTIME}" rm -f "${CONTAINER_NAME}"
else
  echo "Container ${CONTAINER_NAME} is not running."
fi
