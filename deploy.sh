#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="${APP_NAME:-fileviewer}"
IMAGE_NAME="${IMAGE_NAME:-${APP_NAME}:latest}"
ODA_DEB_URL="${ODA_DEB_URL:-https://www.opendesign.com/guestfiles/get?filename=ODAFileConverter_QT6_lnxX64_8.3dll_27.1.deb}"

if command -v docker >/dev/null 2>&1; then
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-docker}"
elif command -v podman >/dev/null 2>&1; then
  CONTAINER_RUNTIME="${CONTAINER_RUNTIME:-podman}"
else
  echo "Neither docker nor podman is installed." >&2
  exit 1
fi

echo "Using container runtime: ${CONTAINER_RUNTIME}"
echo "Building image: ${IMAGE_NAME}"

cd "${SCRIPT_DIR}"
"${CONTAINER_RUNTIME}" build \
  --build-arg "ODA_DEB_URL=${ODA_DEB_URL}" \
  -t "${IMAGE_NAME}" \
  .

echo "Image ready: ${IMAGE_NAME}"
