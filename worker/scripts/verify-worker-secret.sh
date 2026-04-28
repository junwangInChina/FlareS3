#!/usr/bin/env bash

set -euo pipefail

CONFIG_PATH=""
SECRET_NAME="R2_MASTER_KEY"
WORKER_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --config)
      CONFIG_PATH="$2"
      shift 2
      ;;
    --secret-name)
      SECRET_NAME="$2"
      shift 2
      ;;
    --worker-name)
      WORKER_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "${CONFIG_PATH}" ] || [ -z "${WORKER_NAME}" ]; then
  echo "Usage: verify-worker-secret.sh --config <path> --worker-name <name> [--secret-name <name>]" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed" >&2
  exit 1
fi

SECRETS_JSON="$(npx wrangler --config "${CONFIG_PATH}" secret list --format json 2>/dev/null || echo '[]')"
HAS_KEY="$(echo "${SECRETS_JSON}" | jq -r --arg key "${SECRET_NAME}" '[.[] | select(.name==$key)] | length')"

if [ "${HAS_KEY}" = "0" ]; then
  echo "::error::${SECRET_NAME} is missing for worker ${WORKER_NAME}. Provision it in Cloudflare before deploying so existing R2 credentials remain decryptable."
  exit 1
fi

echo "${SECRET_NAME} already exists for ${WORKER_NAME}"
