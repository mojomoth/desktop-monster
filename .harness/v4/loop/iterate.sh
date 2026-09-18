#!/usr/bin/env bash
set -euo pipefail
# v4 reviews run through host-session agents; no nested paid CLI or git mutation.
exec node "$(cd "$(dirname "$0")" && pwd)/fun.mjs" "$@"
