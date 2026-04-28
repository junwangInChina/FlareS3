#!/usr/bin/env bash

set -euo pipefail

BASE_CONFIG=""
OUTPUT_CONFIG=""
WORKER_NAME=""
DATABASE_NAME=""

while [ $# -gt 0 ]; do
  case "$1" in
    --base-config)
      BASE_CONFIG="$2"
      shift 2
      ;;
    --output-config)
      OUTPUT_CONFIG="$2"
      shift 2
      ;;
    --worker-name)
      WORKER_NAME="$2"
      shift 2
      ;;
    --database-name)
      DATABASE_NAME="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [ -z "${BASE_CONFIG}" ] || [ -z "${OUTPUT_CONFIG}" ] || [ -z "${WORKER_NAME}" ] || [ -z "${DATABASE_NAME}" ]; then
  echo "Usage: prepare-wrangler-ci-config.sh --base-config <path> --output-config <path> --worker-name <name> --database-name <name>" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed" >&2
  exit 1
fi

retry_on_7009() {
  local max_attempts="$1"
  shift
  local attempt=1
  local delay=2
  local out

  while true; do
    if out="$($@ 2>&1)"; then
      echo "${out}"
      return 0
    fi

    if echo "${out}" | grep -q "code: 7009"; then
      if [ "${attempt}" -ge "${max_attempts}" ]; then
        echo "${out}" >&2
        return 1
      fi
      echo "Wrangler failed with code 7009 (Upstream service unavailable). Retry ${attempt}/${max_attempts} in ${delay}s..." >&2
      sleep "${delay}"
      attempt=$((attempt + 1))
      delay=$((delay * 2))
      continue
    fi

    echo "${out}" >&2
    return 1
  done
}

D1_LIST_JSON="$(retry_on_7009 6 npx wrangler d1 list --json)"
D1_ID="$(echo "${D1_LIST_JSON}" | jq -r --arg name "${DATABASE_NAME}" '.[] | select(.name==$name) | (.uuid // .database_id // .id)' | head -n 1)"

if [ -z "${D1_ID}" ] || [ "${D1_ID}" = "null" ]; then
  echo "D1 database not found, creating: ${DATABASE_NAME}"

  if ! retry_on_7009 6 npx wrangler d1 create "${DATABASE_NAME}"; then
    echo "wrangler d1 create failed (it may already exist or be temporarily unavailable); continuing to resolve id via list" >&2
  fi

  for _ in 1 2 3 4 5; do
    D1_LIST_JSON="$(retry_on_7009 6 npx wrangler d1 list --json)"
    D1_ID="$(echo "${D1_LIST_JSON}" | jq -r --arg name "${DATABASE_NAME}" '.[] | select(.name==$name) | (.uuid // .database_id // .id)' | head -n 1)"
    if [ -n "${D1_ID}" ] && [ "${D1_ID}" != "null" ]; then
      break
    fi
    sleep 2
  done
fi

if [ -z "${D1_ID}" ] || [ "${D1_ID}" = "null" ]; then
  echo "Failed to resolve D1 database id for ${DATABASE_NAME}" >&2
  exit 1
fi

echo "Resolved D1 database id for ${DATABASE_NAME}: ${D1_ID}"

sed -E \
  -e "s/^name[[:space:]]*=[[:space:]]*\".*\"/name = \"${WORKER_NAME}\"/" \
  -e "s/^database_name[[:space:]]*=[[:space:]]*\".*\"/database_name = \"${DATABASE_NAME}\"/" \
  -e "s/^database_id[[:space:]]*=[[:space:]]*\".*\"/database_id = \"${D1_ID}\"/" \
  "${BASE_CONFIG}" > "${OUTPUT_CONFIG}"

echo "Prepared ${OUTPUT_CONFIG} for worker ${WORKER_NAME}"
