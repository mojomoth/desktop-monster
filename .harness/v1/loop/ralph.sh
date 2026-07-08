#!/usr/bin/env bash
# ralph.sh — standalone Ralph loop for the Desktop Monster harness.
# Each iteration: fresh `claude -p` subprocess, one plan task, gates verified
# independently by this script. Exits 0 on verified sentinel, 1 on iteration
# cap, 2 on blocked-escalation.
#
# NOTE: uses --dangerously-skip-permissions so the agent can edit files
# non-interactively. Run only in a trusted/sandboxed repo.
set -uo pipefail   # NOT -e: gate failures are data, not fatal errors.

# ---------- args ----------
MAX_ITER=25
HV="$(cat .harness/CURRENT 2>/dev/null || echo v1)"
PROMPT_FILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --max-iterations) MAX_ITER="$2"; shift 2 ;;
    --prompt)         PROMPT_FILE="$2"; shift 2 ;;
    --version)        HV="$2"; shift 2 ;;
    -h|--help) echo "usage: ralph.sh [--max-iterations N] [--prompt PATH] [--version vN]"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 64 ;;
  esac
done
PROMPT_FILE="${PROMPT_FILE:-.harness/$HV/loop/PROMPT.md}"
GATES_CMD='npm test && npm run lint && npm run typecheck'
SENTINEL='<promise>DONE</promise>'

# ---------- preflight ----------
[ -f "$PROMPT_FILE" ] || { echo "FATAL: prompt not found: $PROMPT_FILE" >&2; exit 66; }
[ -f SPEC.md ] && [ -f IMPLEMENTATION_PLAN.md ] || {
  echo "FATAL: SPEC.md / IMPLEMENTATION_PLAN.md missing — run desmon-1-plan first." >&2; exit 65; }
command -v claude >/dev/null || { echo "FATAL: claude CLI not on PATH" >&2; exit 69; }
git rev-parse --git-dir >/dev/null 2>&1 || { git init -b main && git add -A && git commit -m "chore: init [ralph]"; }

# ---------- session dir ----------
if [ -f .agentdoc/LATEST ]; then TS="$(cat .agentdoc/LATEST)"; else
  TS="$(date +%Y-%m-%dT%H-%M-%S)"; mkdir -p ".agentdoc/$TS"; printf '%s\n' "$TS" > .agentdoc/LATEST
fi
S=".agentdoc/$TS"; mkdir -p "$S/prompts" "$S/sessions" "$S/plans"
[ -f "$S/meta.json" ] || printf '{"session":"%s","harness_version":"%s","claude_cli":"%s","runner":"ralph.sh"}\n' \
  "$TS" "$HV" "$(claude --version 2>/dev/null | head -1)" > "$S/meta.json"
RUNLOG="$S/sessions/ralph-run.log"
note() { printf '%s %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "$RUNLOG"; }
note "ralph start: harness=$HV max_iter=$MAX_ITER prompt=$PROMPT_FILE session=$TS"

verify_gates() {  # $1 = logfile ; one retry for flake allowance
  local log="$1" try
  [ -f package.json ] || { echo "no package.json yet" >> "$log"; return 1; }
  for try in 1 2; do
    if bash -c "$GATES_CMD" >> "$log" 2>&1; then return 0; fi
    echo "--- gate attempt $try failed ---" >> "$log"
  done
  return 1
}

plan_converged() { ! grep -qE '^### \[( |~|!)\] T' IMPLEMENTATION_PLAN.md; }

LAST_BLOCKED_TASK=""; BLOCKED_STREAK=0
i=1
while [ "$i" -le "$MAX_ITER" ]; do
  ITER="$(printf '%02d' "$i")"
  note "=== iteration $ITER ==="

  # guard: clean tree (auto-commit stragglers from crashed iterations)
  if [ -n "$(git status --porcelain)" ]; then
    git add -A && git commit -q -m "chore(wip): auto-commit stray changes before iter $ITER [ralph]"
    note "iter $ITER: auto-committed dirty tree"
  fi

  # render + archive the exact prompt fed to the agent (BEFORE spawning)
  RENDERED="$S/prompts/100-builder-iter-$ITER.md"
  sed -e "s|{{SESSION_DIR}}|$S|g" -e "s|{{ITER}}|$ITER|g" "$PROMPT_FILE" > "$RENDERED"

  # run one fresh-context builder (optional wall-clock cap if coreutils installed)
  LOG="$S/sessions/iter-$ITER.log"
  RUNNER=(claude -p "$(cat "$RENDERED")" --dangerously-skip-permissions --output-format text)
  if command -v gtimeout >/dev/null; then
    gtimeout --signal=INT 3600 "${RUNNER[@]}" 2>&1 | tee "$LOG"
  else
    "${RUNNER[@]}" 2>&1 | tee "$LOG"
  fi
  RC=${PIPESTATUS[0]}; note "iter $ITER: claude exited $RC"

  # parse the status block from agent output
  STATUS="$(awk '/^<status>$/{f=1;next} /^<\/status>$/{f=0} f' "$LOG")"
  TASK="$(printf '%s\n' "$STATUS"   | sed -n 's/^task: //p'   | tail -1)"
  RESULT="$(printf '%s\n' "$STATUS" | sed -n 's/^result: //p' | tail -1)"
  note "iter $ITER: task=${TASK:-?} result=${RESULT:-UNPARSEABLE}"

  # snapshot the plan (audit trail of plan modifications)
  [ -f IMPLEMENTATION_PLAN.md ] && cp IMPLEMENTATION_PLAN.md "$S/plans/IMPLEMENTATION_PLAN.iter-$ITER.md"

  # independent gate verification — trust but verify
  GLOG="$S/sessions/iter-$ITER.gates.log"; : > "$GLOG"
  if verify_gates "$GLOG"; then MYGATES=pass; else MYGATES=fail; fi
  note "iter $ITER: orchestrator gates=$MYGATES"

  # sentinel: honor only if THIS script confirms gates + plan completion
  if grep -qxF "$SENTINEL" "$LOG"; then
    if [ "$MYGATES" = pass ] && plan_converged; then
      note "CONVERGED at iteration $ITER — sentinel verified."; exit 0
    fi
    note "iter $ITER: FALSE SENTINEL (gates=$MYGATES converged=$(plan_converged && echo yes || echo no)) — continuing."
  fi

  # blocked-escalation bookkeeping
  if [ "$RESULT" = "BLOCKED" ] && [ -n "$TASK" ] && [ "$TASK" = "$LAST_BLOCKED_TASK" ]; then
    BLOCKED_STREAK=$((BLOCKED_STREAK+1))
  elif [ "$RESULT" = "BLOCKED" ]; then
    LAST_BLOCKED_TASK="$TASK"; BLOCKED_STREAK=1
  else
    LAST_BLOCKED_TASK=""; BLOCKED_STREAK=0
  fi
  if [ "$BLOCKED_STREAK" -ge 3 ]; then
    note "ESCALATION: $TASK blocked 3 consecutive iterations. Human input needed (see its Notes in IMPLEMENTATION_PLAN.md)."
    exit 2
  fi

  i=$((i+1))
done

note "FAILED: iteration cap ($MAX_ITER) reached without verified sentinel."
note "Resume with: bash .harness/$HV/loop/ralph.sh   (plan file preserves all progress)"
exit 1
