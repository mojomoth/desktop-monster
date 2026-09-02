#!/usr/bin/env bash
# ralph.sh — standalone driver for the harness v2 parallel-lane loop.
# Each lane runs a fresh `claude -p` / `codex exec` worker in its own git
# worktree; iterate.sh merges, verifies (gates + smoke on main) and writes the
# plan. Exit: 0 converged · 1 iteration cap · 2 blocked escalation ·
# 3 crash escalation · 4 deadlock (open tasks but nothing dispatchable).
#
# NOTE: workers run with --dangerously-skip-permissions / codex workspace-write.
# Run only in a trusted repo.
set -uo pipefail

MAX_ITER="${MAX_ITER:-50}"; LANES="${LANES:-3}"
HV="$(cat .harness/CURRENT 2>/dev/null || echo v2)"
while [ $# -gt 0 ]; do
  case "$1" in
    --max-iterations) MAX_ITER="$2"; shift 2 ;;
    --lanes)          LANES="$2"; shift 2 ;;
    --version)        HV="$2"; shift 2 ;;
    -h|--help) echo "usage: ralph.sh [--max-iterations N] [--lanes N] [--version vN]"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 64 ;;
  esac
done
LOOP=".harness/$HV/loop"

# ---------- preflight ----------
[ -f "$LOOP/iterate.sh" ] || { echo "FATAL: $LOOP/iterate.sh missing" >&2; exit 66; }
[ -f SPEC.md ] && [ -f IMPLEMENTATION_PLAN.md ] || {
  echo "FATAL: SPEC.md / IMPLEMENTATION_PLAN.md missing — run desmon-1-plan first." >&2; exit 65; }
for tool in claude codex gtimeout node git; do
  command -v "$tool" >/dev/null || { echo "FATAL: $tool not on PATH" >&2; exit 69; }
done
git rev-parse --git-dir >/dev/null 2>&1 || { echo "FATAL: not a git repo" >&2; exit 65; }
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "FATAL: run from main (lanes merge into main)" >&2; exit 65; }

# ---------- session dir ----------
TS=""
if [ -f .agentdoc/LATEST ]; then
  TS="$(cat .agentdoc/LATEST)"
  MV="$(node -e 'try{process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).harness_version||""))}catch{}' ".agentdoc/$TS/meta.json" 2>/dev/null)"
  [ "$MV" = "$HV" ] || { echo "session $TS belongs to harness ${MV:-?}; opening a new $HV session"; TS=""; }
fi
if [ -z "$TS" ]; then
  TS="$(date +%Y-%m-%dT%H-%M-%S)"; mkdir -p ".agentdoc/$TS"; printf '%s\n' "$TS" > .agentdoc/LATEST
fi
S=".agentdoc/$TS"; mkdir -p "$S/prompts" "$S/sessions" "$S/plans" "$S/lanes" "$S/graph"
[ -f "$S/meta.json" ] || node -e '
const [ts,hv,lanes]=process.argv.slice(1);const v=(c)=>{try{return require("child_process").execSync(c,{stdio:["ignore","pipe","ignore"]}).toString().trim().split("\n")[0]}catch{return "n/a"}};
process.stdout.write(JSON.stringify({session:ts,harness_version:hv,runner:"ralph.sh",lanes:Number(lanes),claude_cli:v("claude --version"),codex_cli:v("codex --version"),rgt:v("rgt version"),graphify:v("graphify --version"),render_cli:v("render --version"),server_url:"",db_expires:"",started:new Date().toISOString(),ended:"",stages:["dev"],outcome:""},null,2)+"\n")' "$TS" "$HV" "$LANES" > "$S/meta.json"

export MAX_ITER LANES HV RUNNER=standalone NESTED_CLAUDE="${NESTED_CLAUDE:-1}"
echo "ralph v2: harness=$HV lanes=$LANES max_iter=$MAX_ITER session=$TS"
bash "$LOOP/iterate.sh" loop
rc=$?
case $rc in
  0) echo "CONVERGED" ;; 1) echo "ITERATION CAP reached — resume with: bash $LOOP/ralph.sh" ;;
  2) echo "BLOCKED ESCALATION — read the [!] task Notes" ;; 3) echo "CRASH ESCALATION — read $S/sessions/iter-*.log" ;;
  4) echo "DEADLOCK — open tasks remain but none is dispatchable (check Deps/[!])" ;;
esac
exit $rc
