#!/usr/bin/env bash

set -euo pipefail

SMOKE_URL="${1:-}"
LABEL="${2:-release}"

if [ -z "${SMOKE_URL}" ]; then
  echo "Usage: smoke-check.sh <smoke-url> [label]" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed" >&2
  exit 1
fi

echo "Running ${LABEL} smoke against ${SMOKE_URL}"
RESPONSE="$(curl --fail --silent --show-error --location --retry 5 --retry-delay 5 --retry-all-errors "${SMOKE_URL}")"
echo "${RESPONSE}"
echo "${RESPONSE}" | jq -e '.status == "ok"' >/dev/null
