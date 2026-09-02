#!/usr/bin/env bash
# ready-tasks.sh — dispatchable tasks (contract §1). Thin wrapper over plan.mjs.
LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$LOOP_DIR/plan.mjs" ready --plan "${PLAN:-IMPLEMENTATION_PLAN.md}"
