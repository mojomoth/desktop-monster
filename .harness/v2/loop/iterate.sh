#!/usr/bin/env bash
# iterate.sh — harness v2 parallel-lane loop core (see reference: loop contract in HARNESS.md §4).
#
#   iterate.sh dispatch          fill free lanes with ready tasks (worktree + worker per task)
#   iterate.sh collect <id>      merge a finished lane into main, verify, write the plan, export logs
#   iterate.sh loop              dispatch/collect until converged/cap/escalation (exit 0/1/2/3/4)
#   iterate.sh verdict           final verdict only (no dispatch): converged 0 · blocked 2 · cap 1 · deadlock/red 4
#   iterate.sh status            list lanes
#   iterate.sh selftest          fixture-driven checks of scheduling, parsing, rendering, worktrees
#
# The orchestrator (this script) is the plan file's SINGLE writer. Workers never
# edit IMPLEMENTATION_PLAN.md; they report through the status JSON.
set -uo pipefail

LOOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HV="$(basename "$(dirname "$LOOP_DIR")")"
ROOT="$(git -C "$LOOP_DIR" rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 65
PLAN="${PLAN:-IMPLEMENTATION_PLAN.md}"
LANES="${LANES:-3}"; MAX_ITER="${MAX_ITER:-50}"
RUNNER="${RUNNER:-standalone}"; NESTED_CLAUDE="${NESTED_CLAUDE:-1}"
CLAUDE_TIMEOUT="${CLAUDE_TIMEOUT:-3600}"; CODEX_TIMEOUT="${CODEX_TIMEOUT:-2400}"
CODEX_MODEL="${CODEX_MODEL:-gpt-5.6-sol}"; CLAUDE_MODEL="${CLAUDE_MODEL:-}"
POLL_SECONDS="${POLL_SECONDS:-15}"
GATES_LINE='npm test && npm run lint && npm run typecheck'
WT_ROOT="$ROOT/.worktrees"
SMOKE_PATHS='^(src/main/|src/preload/|src/renderer/|static/|package\.json$|tsconfig)'
CLAUDE_UNSET=(-u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_BRIDGE_SESSION_ID -u CLAUDE_PID -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PLUGIN_DATA)

# ---------- helpers ----------
session() {
  [ -f .agentdoc/LATEST ] || { echo "FATAL: .agentdoc/LATEST missing (run desmon-1-plan)" >&2; exit 65; }
  TS="$(cat .agentdoc/LATEST)"; S=".agentdoc/$TS"
  [ -f "$S/meta.json" ] || { echo "FATAL: $S/meta.json missing (run desmon-1-plan)" >&2; exit 65; }
  local mv; mv="$(node -e 'try{process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).harness_version||""))}catch{}' "$S/meta.json")"
  [ "$mv" = "$HV" ] || { echo "FATAL: session $TS was created by harness $mv, not $HV (one session ↔ one harness version — run desmon-1-plan to open a new session)" >&2; exit 65; }
  mkdir -p "$S/prompts" "$S/sessions" "$S/plans" "$S/lanes" "$S/graph"
  RUNLOG="$S/sessions/ralph-run.log"
  [ -f "$S/sessions/dev-loop.md" ] || printf '| iter | worker | task | result | gates | smoke | commit | decision |\n|---|---|---|---|---|---|---|---|\n' > "$S/sessions/dev-loop.md"
}
note() { printf '%s %s\n' "$(date +%H:%M:%S)" "$*" | tee -a "${RUNLOG:-/dev/null}" >&2; }
plan() { node "$LOOP_DIR/plan.mjs" "$@" --plan "$PLAN"; }
reap_dead_lanes() {  # a lane whose worker pid is gone without an .rc file is treated as crashed (rc 999)
  local f pid; for f in "$S"/lanes/*.iter; do [ -e "$f" ] || continue; [ -e "${f%.iter}.rc" ] && continue
    pid="$(cat "${f%.iter}.pid" 2>/dev/null)"; [ -n "$pid" ] || continue
    kill -0 "$pid" 2>/dev/null || { echo 999 > "${f%.iter}.rc"; note "lane $(basename "${f%.iter}"): worker pid $pid vanished without .rc → CRASHED"; }
  done
}
lanes_running() { reap_dead_lanes; local n=0 f; for f in "$S"/lanes/*.iter; do [ -e "$f" ] || continue; [ -e "${f%.iter}.rc" ] || n=$((n+1)); done; echo "$n"; }
lanes_finished() { local f; for f in "$S"/lanes/*.iter; do [ -e "$f" ] || continue; [ -e "${f%.iter}.rc" ] && basename "${f%.iter}"; done; }
dispatched_total() { cat "$S/sessions/.iter" 2>/dev/null || echo 0; }
ready_ids() { plan ready 2>>"${RUNLOG:-/dev/null}" | sed -n '1s/^READY=//p'; }
verify_gates() {  # $1 = logfile ; one retry for flake allowance
  local log="$1" try
  for try in 1 2; do
    if bash -c "$GATES_LINE" >> "$log" 2>&1; then return 0; fi
    echo "--- gate attempt $try failed ---" >> "$log"
  done
  return 1
}
spec_rows() {  # $1 = task block text → matching SPEC.md feature rows
  local ids; ids="$(printf '%s' "$1" | grep -oE '\bF[0-9]{2,3}\b' | sort -u)"
  [ -n "$ids" ] && [ -f SPEC.md ] || return 0
  local id; for id in $ids; do grep -E "^\| $id \|" SPEC.md; done
}
# parse_status <log> <children-out> → prints shell-evalable TASK= RESULT= WGATES= COMMIT= NOTE= (WGATES = worker-claimed gates, never trusted)
parse_status() {
  node -e '
const fs=require("fs"); const [log,childOut]=process.argv.slice(1);
const q=(s)=>"'"'"'"+String(s??"").replace(/'"'"'/g,"'"'"'\\'"'"''"'"'")+"'"'"'";
let st=null;
const tryObj=(o)=>{ if(o&&typeof o==="object"&&typeof o.task==="string"&&typeof o.result==="string") st=o; };
const scan=(text)=>{ for(const line of text.split("\n")){ const t=line.trim(); if(!t.startsWith("{")) continue;
  try{ const o=JSON.parse(t); if(o&&o.type==="result"&&typeof o.result==="string"){ scan(o.result); if(st) return; } tryObj(o); if(st) return; }catch{} } };
try{ scan(fs.readFileSync(log,"utf8")); }catch{}
if(!st){ process.stdout.write("RESULT="+q("CRASHED")+"\nTASK=\"\"\nWGATES=\"\"\nCOMMIT=\"\"\nNOTE="+q("no status JSON in "+log)+"\n"); process.exit(0); }
const ok=["DONE","SPLIT","BLOCKED","NOTHING_TO_DO","MISMATCH"];
const res=ok.includes(st.result)?st.result:"CRASHED";
if(Array.isArray(st.children)&&st.children.length) fs.writeFileSync(childOut,JSON.stringify(st.children));
process.stdout.write("TASK="+q(st.task)+"\nRESULT="+q(res)+"\nWGATES="+q(st.gates||"")+"\nCOMMIT="+q(st.commit||"none")+"\nNOTE="+q(String(st.note||"").replace(/\s+/g," ").slice(0,600))+"\n");
' "$1" "$2"
}
# extract_claude_result <claude.json> <out.log>: the -p envelope's result text (JSON status first line) → out.log
extract_claude_result() {
  node -e '
const fs=require("fs"); const [src,dst]=process.argv.slice(1); let text="";
try{ text=fs.readFileSync(src,"utf8"); }catch{ process.exit(0); }
let out=text;
for(const line of text.split("\n")){ const t=line.trim(); if(!t.startsWith("{")) continue;
  try{ const o=JSON.parse(t); if(o&&o.type==="result"&&typeof o.result==="string"){ out=o.result; break; } }catch{} }
fs.writeFileSync(dst,out);
' "$1" "$2"
}
commit_stray() {  # <context>: live lane output under .agentdoc is expected (collect commits it); anything else on main is a stray change
  if [ -n "$(git status --porcelain -- . ':!.agentdoc' ':!.worktrees')" ]; then
    git add -A && git commit -qm "chore(wip): auto-commit stray changes before $1 [ralph]" && note "auto-committed stray changes before $1"
  fi
}
streak() {  # streak <id> <KIND> → prints new count (resets other kinds/tasks untouched)
  local f="$S/sessions/.streak" id="$1" kind="$2" n
  touch "$f"; n="$(awk -v i="$id" -v k="$kind" '$1==i && $2==k {print $3}' "$f")"; n=$(( ${n:-0} + 1 ))
  { grep -v -E "^$id $kind " "$f"; echo "$id $kind $n"; } > "$f.tmp" && mv "$f.tmp" "$f"; echo "$n"
}
archive_replan_prompt() {  # <id> <iter> → $S/prompts/12x-replanner-iter-NN.md + $S/lanes/REPLAN-<id> (its content = that path)
  local id="$1" p="$S/prompts/12x-replanner-iter-$2.md"
  { cat "$LOOP_DIR/../agents/10-planner.md"; printf '\n\n---\nActive session dir: %s\nRE-SCOPE ONLY task %s: read its Notes (the blocker evidence from two BLOCKED attempts), then split it into children or design around the blocker by editing ONLY that task block. Touch nothing else in the plan; implement no code. Commit as: docs(plan): re-scope %s [ralph]\n' "$S" "$id" "$id"; } > "$p"
  echo "$p" > "$S/lanes/REPLAN-$id"
}
streak_reset() { local f="$S/sessions/.streak"; [ -f "$f" ] && { grep -v -E "^$1 " "$f" > "$f.tmp"; mv "$f.tmp" "$f"; } || true; }
render_prompt() {  # render_prompt <template> <out> (env: R_*)
  node -e '
const e=process.env; process.stdout.write(JSON.stringify({SESSION_DIR:e.R_SESSION_DIR,ITER:e.R_ITER,TASK:e.R_TASK,TITLE:e.R_TITLE,WORKER:e.R_WORKER,LANE_DIR:e.R_LANE_DIR,TASK_BLOCK:e.R_TASK_BLOCK,OPEN_TASKS:e.R_OPEN_TASKS,SPEC_ROWS:e.R_SPEC_ROWS,HV:e.R_HV}))' > "$2.json"
  node "$LOOP_DIR/render.mjs" "$1" "$2.json" > "$2" && rm -f "$2.json"
}
spawn_claude() {  # <id> <iter> <lane> <prompt>
  local id="$1" iter="$2" lane="$3" prompt="$4"
  ( cd "$lane" && env "${CLAUDE_UNSET[@]}" gtimeout --signal=INT --kill-after=120 "$CLAUDE_TIMEOUT" \
      claude -p "$(cat "$ROOT/$prompt")" --dangerously-skip-permissions --output-format json ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} \
      > "$ROOT/$S/sessions/iter-$iter.claude.json" 2> "$ROOT/$S/sessions/iter-$iter.claude.err"
    echo $? > "$ROOT/$S/lanes/$id.rc" ) &
  echo $! > "$S/lanes/$id.pid"
}
spawn_codex() {  # <id> <iter> <lane> <prompt>
  local id="$1" iter="$2" lane="$3" prompt="$4"
  ( gtimeout --signal=INT --kill-after=120 "$CODEX_TIMEOUT" \
      codex exec -C "$lane" -s workspace-write --dangerously-bypass-hook-trust \
        -c 'mcp_servers={}' -c 'model_reasoning_effort="high"' -m "$CODEX_MODEL" --color never --json \
        --output-schema "$LOOP_DIR/status.schema.json" -o "$ROOT/$S/sessions/iter-$iter.log" - \
        < "$ROOT/$prompt" > "$ROOT/$S/sessions/iter-$iter.codex.jsonl" 2>&1
    echo $? > "$ROOT/$S/lanes/$id.rc" ) &
  echo $! > "$S/lanes/$id.pid"
}

# ---------- dispatch ----------
dispatch() {
  session
  local running free total out="" id
  running="$(lanes_running)"; free=$(( LANES - running )); total="$(dispatched_total)"
  if [ "$total" -ge "$MAX_ITER" ]; then echo "DISPATCHED="; return 0; fi
  commit_stray dispatch
  for id in $(ready_ids); do
    [ "$free" -le 0 ] && break
    [ "$total" -ge "$MAX_ITER" ] && break
    eval "$(plan info "$id")"; [ "$STATUS" = " " ] || continue
    case " ${SKIP_WORKERS:-} " in *" $WORKER "*) continue ;; esac
    total=$(( total + 1 )); local ITER; ITER="$(printf '%02d' "$total")"; echo "$total" > "$S/sessions/.iter"
    plan set-status "$id" '~'
    local lane="$WT_ROOT/$id" tpl prompt
    if [ "$WORKER" = codex ]; then tpl="$LOOP_DIR/CODEX_PROMPT.md"; prompt="$S/prompts/110-codex-iter-$ITER.md"
    else tpl="$LOOP_DIR/PROMPT.md"; prompt="$S/prompts/100-builder-iter-$ITER.md"; fi
    local block; block="$(plan block "$id")"
    R_SESSION_DIR="$S" R_ITER="$ITER" R_TASK="$id" R_TITLE="$TITLE" R_WORKER="$WORKER" R_LANE_DIR="$lane" \
      R_TASK_BLOCK="$block" R_OPEN_TASKS="$(plan open)" R_SPEC_ROWS="$(spec_rows "$block")" R_HV="$HV" \
      render_prompt "$tpl" "$prompt" || { note "render failed for $id"; plan set-status "$id" ' '; continue; }
    if [ "$RUNNER" = in-session ] && [ "$NESTED_CLAUDE" = 0 ] && [ "$WORKER" = claude ]; then
      cat "$LOOP_DIR/INSESSION_NOTE.md" | sed -e "s|{{LANE_DIR}}|$lane|g" -e "s|{{HV}}|$HV|g" >> "$prompt"
    fi
    echo "$ITER" > "$S/lanes/$id.iter"; echo "$WORKER" > "$S/lanes/$id.worker"; date -u +%FT%TZ > "$S/lanes/$id.started"
    rm -f "$S/lanes/$id.rc" "$S/lanes/$id.pid"
    git add "$PLAN" "$S" && git commit -qm "docs(agentdoc): dispatch iter $ITER $id ($WORKER) [ralph]"
    git worktree remove --force "$lane" >/dev/null 2>&1; git branch -D "lane/$id" >/dev/null 2>&1
    git worktree add -q -b "lane/$id" "$lane" main || { note "worktree add failed for $id"; plan set-status "$id" ' '; git add "$PLAN"; git commit -qm "docs(agentdoc): undispatch $id [ralph]"; rm -f "$S/lanes/$id".*; continue; }
    [ -e "$lane/node_modules" ] || ln -s "$ROOT/node_modules" "$lane/node_modules"
    [ -e "$lane/graphify-out" ] || [ ! -d "$ROOT/graphify-out" ] || ln -s "$ROOT/graphify-out" "$lane/graphify-out"
    if [ "$WORKER" = codex ]; then spawn_codex "$id" "$ITER" "$lane" "$prompt"
    elif [ "$RUNNER" = in-session ] && [ "$NESTED_CLAUDE" = 0 ]; then echo "PENDING $id $prompt $lane"
    else spawn_claude "$id" "$ITER" "$lane" "$prompt"; fi
    note "dispatch iter $ITER: $id ($WORKER) → $lane"
    free=$(( free - 1 )); out="$out $id"
  done
  echo "DISPATCHED=${out# }"
}

# ---------- collect ----------
collect() {
  session
  local id="$1"; [ -f "$S/lanes/$id.iter" ] || { echo "no such lane: $id" >&2; return 2; }
  local ITER WORKER RC lane LOG CHILDREN MERGE=skipped GATES_R=skipped SMOKE=skipped SHA=none DECISION=continue kept=""
  ITER="$(cat "$S/lanes/$id.iter")"; WORKER="$(cat "$S/lanes/$id.worker")"; RC="$(cat "$S/lanes/$id.rc" 2>/dev/null || echo 999)"
  lane="$WT_ROOT/$id"; LOG="$S/sessions/iter-$ITER.log"; CHILDREN="$S/lanes/$id.children.json"
  eval "$(plan info "$id")"
  [ "$WORKER" = claude ] && [ ! -s "$LOG" ] && [ -f "$S/sessions/iter-$ITER.claude.json" ] && extract_claude_result "$S/sessions/iter-$ITER.claude.json" "$LOG"
  eval "$(parse_status "$LOG" "$CHILDREN")"
  case "$RC" in 124|137) RESULT=CRASHED; NOTE="worker timed out (rc $RC); $NOTE" ;; esac
  [ "$RESULT" != CRASHED ] && [ -n "$TASK" ] && [ "$TASK" != "$id" ] && { RESULT=MISMATCH; NOTE="reported task $TASK for lane $id; $NOTE"; }
  note "collect iter $ITER: $id ($WORKER) rc=$RC result=$RESULT worker-gates=$WGATES"

  # commit worker leftovers inside the lane (codex never commits; claude may forget)
  if [ -d "$lane" ] && [ -n "$(git -C "$lane" status --porcelain)" ]; then
    local type; case "$RESULT" in DONE) type=feat ;; SPLIT|BLOCKED) type=docs ;; *) type=chore ;; esac
    git -C "$lane" add -A && git -C "$lane" commit -qm "$type($id): $TITLE [$WORKER]" && note "committed lane leftovers for $id"
  fi

  # merge into main for reportable results
  commit_stray "collect $ITER"
  case "$RESULT" in
    DONE|SPLIT|BLOCKED|NOTHING_TO_DO)
      if git show-ref --verify --quiet "refs/heads/lane/$id" && [ "$(git rev-parse "lane/$id")" != "$(git merge-base main "lane/$id")" ]; then
        if git merge --no-ff -q -m "merge($id): $TITLE [$WORKER iter $ITER]" "lane/$id" >> "$S/sessions/iter-$ITER.merge.log" 2>&1; then
          MERGE=merged; SHA="$(git rev-parse --short HEAD)"
          if verify_gates "$S/sessions/iter-$ITER.gates.log"; then GATES_R=pass; else GATES_R=fail; fi
          if [ "$GATES_R" = pass ]; then
            if git diff --name-only HEAD^1 HEAD | grep -qE "$SMOKE_PATHS"; then
              if npm run smoke > "$S/sessions/iter-$ITER.smoke.log" 2>&1 && grep -q SMOKE_OK "$S/sessions/iter-$ITER.smoke.log"; then SMOKE=pass; else SMOKE=fail; fi
            fi
          fi
          if [ "$GATES_R" = fail ] || [ "$SMOKE" = fail ]; then
            if git revert --no-edit -m 1 HEAD >> "$S/sessions/iter-$ITER.merge.log" 2>&1; then
              RESULT=MERGE_RED; NOTE="merge reverted (gates=$GATES_R smoke=$SMOKE); $NOTE"
            else
              git revert --abort >/dev/null 2>&1; git reset --hard "$SHA" >/dev/null 2>&1
              RESULT=MERGE_RED; NOTE="MERGE LEFT ON MAIN: revert failed (gates=$GATES_R smoke=$SMOKE) — fix main by hand; $NOTE"; note "revert of merge $SHA FAILED"
            fi
            kept="lane/$id-red-$ITER"
          fi
        else
          git merge --abort >/dev/null 2>&1; RESULT=CONFLICT; NOTE="merge conflict with main; $NOTE"; kept="lane/$id-conflict-$ITER"
        fi
      else
        MERGE=empty
      fi ;;
    CRASHED) kept="lane/$id-crash-$ITER" ;;
  esac

  # apply to the plan (single writer)
  local label="iter $ITER, $WORKER" count
  case "$RESULT" in
    DONE)   plan set-status "$id" x; streak_reset "$id" ;;
    SPLIT)  plan set-status "$id" s; [ -s "$CHILDREN" ] && plan children "$id" "$CHILDREN"; streak_reset "$id" ;;
    BLOCKED)
      count="$(streak "$id" BLOCKED)"
      if [ "$count" -ge 3 ]; then plan set-status "$id" '!'; DECISION=escalate-blocked; NOTE="BLOCKED x3 → escalated; $NOTE"
      elif [ "$count" -eq 2 ]; then plan set-status "$id" ' '; NOTE="BLOCKED x2 → re-scope requested; $NOTE"; archive_replan_prompt "$id" "$ITER"
      else plan set-status "$id" ' '; fi ;;
    CRASHED)
      count="$(streak "$id" CRASHED)"; plan set-status "$id" ' '
      [ "$count" -ge 3 ] && { DECISION=escalate-crash; NOTE="CRASHED x3 → escalation; $NOTE"; } ;;
    NOTHING_TO_DO) plan set-status "$id" x; streak_reset "$id"; NOTE="AC already satisfied on a clean tree; $NOTE" ;;
    *) plan set-status "$id" ' ' ;;
  esac
  plan note "$id" --label "$label" "$RESULT: $NOTE"
  local short; short="$(printf '%s' "$NOTE" | tr '|' '/' | cut -c1-80)"
  plan log-row "| $ITER | $(date -u +%FT%H:%M) | $WORKER | $id | $RESULT | $GATES_R | $SHA | $short |"
  cp "$PLAN" "$S/plans/IMPLEMENTATION_PLAN.iter-$ITER.md"
  printf '| %s | %s | %s | %s | %s | %s | %s | %s |\n' "$ITER" "$WORKER" "$id" "$RESULT" "$GATES_R" "$SMOKE" "$SHA" "$DECISION" >> "$S/sessions/dev-loop.md"

  # observability exports (best effort)
  rgt log --json -n 1000 > "$S/sessions/iter-$ITER.rgt.json" 2>/dev/null || note "rgt export skipped"
  if graphify update . >/dev/null 2>&1 && [ -f graphify-out/GRAPH_REPORT.md ]; then cp graphify-out/GRAPH_REPORT.md "$S/graph/iter-$ITER.GRAPH_REPORT.md"; else note "graphify update skipped"; fi

  # cleanup lane
  [ -d "$lane" ] && git worktree remove --force "$lane" >/dev/null 2>&1
  if [ -n "$kept" ]; then git branch -m "lane/$id" "$kept" >/dev/null 2>&1 || true; else git branch -D "lane/$id" >/dev/null 2>&1 || true; fi
  rm -f "$S/lanes/$id.iter" "$S/lanes/$id.worker" "$S/lanes/$id.rc" "$S/lanes/$id.pid" "$S/lanes/$id.started" "$CHILDREN"
  git add -A "$PLAN" "$S" && git commit -qm "docs(agentdoc): collect iter $ITER $id ($RESULT) [ralph]"
  echo "TASK=$id ITER=$ITER WORKER=$WORKER RESULT=$RESULT MERGE=$MERGE GATES=$GATES_R SMOKE=$SMOKE COMMIT=$SHA DECISION=$DECISION"
}

# ---------- replan (BLOCKED x2) ----------
replan() {  # <id> — services $S/lanes/REPLAN-<id> (content = archived re-planner prompt path) with claude -p; fallback path leaves it to the skill
  local id="$1" req="$S/lanes/REPLAN-$id"; [ -f "$req" ] || return 0
  if [ "$NESTED_CLAUDE" != 1 ]; then note "REPLAN $id pending (in-session fallback handles it)"; return 0; fi
  local p; p="$(cat "$req")"
  env "${CLAUDE_UNSET[@]}" gtimeout --signal=INT --kill-after=60 1800 claude -p "$(cat "$p")" --dangerously-skip-permissions --output-format text ${CLAUDE_MODEL:+--model "$CLAUDE_MODEL"} > "$S/sessions/replan-$id.log" 2>&1
  [ -n "$(git status --porcelain -- . ':!.worktrees')" ] && git add -A && git commit -qm "docs(plan): re-scope $id [ralph]"
  rm -f "$req"; git add -A "$S" >/dev/null 2>&1 && git commit -qm "docs(agentdoc): replan $id done [ralph]" >/dev/null 2>&1; note "REPLAN $id done"
}

# ---------- verdict (no lanes running, nothing ready) ----------
verdict() {  # exit 0 converged · 2 blocked escalation · 1 cap · 4 deadlock / final gates red
  session
  local open; open="$(plan open)"
  if [ -z "$open" ]; then
    if verify_gates "$S/sessions/final.gates.log" && npm run smoke > "$S/sessions/final.smoke.log" 2>&1 && grep -q SMOKE_OK "$S/sessions/final.smoke.log"; then
      note "CONVERGED after $(dispatched_total) iterations"; git add -A "$S" >/dev/null 2>&1; git commit -qm "docs(agentdoc): final gates [ralph]" >/dev/null 2>&1; return 0
    fi
    note "final gates/smoke RED on main"; return 4
  fi
  printf '%s\n' "$open" | grep -q '^### \[!\]' && { note "BLOCKED ESCALATION"; return 2; }
  [ "$(dispatched_total)" -ge "$MAX_ITER" ] && { note "ITERATION CAP $MAX_ITER"; return 1; }
  note "DEADLOCK: open tasks but none dispatchable"; return 4
}

# ---------- loop ----------
loop() {
  session
  [ "$RUNNER" = in-session ] && [ "$NESTED_CLAUDE" = 0 ] && { echo "loop needs NESTED_CLAUDE=1; use dispatch/collect/verdict from the skill" >&2; return 64; }
  [ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "FATAL: not on main" >&2; return 65; }
  note "loop start: lanes=$LANES max_iter=$MAX_ITER runner=$RUNNER hv=$HV"
  local stop=0 id
  while true; do
    for id in $(ls "$S"/lanes 2>/dev/null | sed -n 's/^REPLAN-//p'); do replan "$id"; done   # re-scope BEFORE any retry is dispatched
    [ "$stop" = 0 ] && dispatch > /dev/null
    if [ "$(lanes_running)" -eq 0 ]; then
      local finished; finished="$(lanes_finished)"
      if [ -z "$finished" ]; then
        [ "$stop" = 1 ] && { note "CRASH ESCALATION"; return 3; }
        local ready; ready="$(ready_ids)"
        if [ -z "$ready" ]; then verdict; return $?; fi
        [ "$(dispatched_total)" -ge "$MAX_ITER" ] && { note "ITERATION CAP $MAX_ITER"; return 1; }
      fi
    fi
    sleep "$POLL_SECONDS"
    for id in $(lanes_finished); do
      local line; line="$(collect "$id")"; echo "$line"
      case "$line" in *DECISION=escalate-crash*) stop=1 ;; esac
    done
  done
}

status_cmd() {
  session; reap_dead_lanes
  local f id
  for f in "$S"/lanes/*.iter; do [ -e "$f" ] || continue; id="$(basename "${f%.iter}")"
    printf '%s iter=%s worker=%s state=%s\n' "$id" "$(cat "$f")" "$(cat "$S/lanes/$id.worker")" "$([ -e "$S/lanes/$id.rc" ] && echo "finished(rc=$(cat "$S/lanes/$id.rc"))" || echo running)"
  done
  echo "dispatched=$(dispatched_total) running=$(lanes_running)"
}

# ---------- selftest ----------
selftest() {
  local tmp fail=0; tmp="$(mktemp -d)"; cp "$LOOP_DIR/fixtures/plan.sample.md" "$tmp/plan.md"
  local P="$tmp/plan.md"
  check() { if [ "$1" = "$2" ]; then echo "ok   $3"; else echo "FAIL $3: got [$1] want [$2]"; fail=1; fi; }
  local r; r="$(node "$LOOP_DIR/plan.mjs" ready --plan "$P" 2>/dev/null | sed -n '1s/^READY=//p')"; check "$r" "T03 T05 T08a" "ready set is dep-satisfied and file-disjoint (T04 overlaps T03, T09 blocked by [~] T10, T06 range dep, T07 unknown dep)"
  r="$(node "$LOOP_DIR/plan.mjs" ready --plan "$P" 2>/dev/null | grep '^INFO T08a' | awk '{print $3}')"; check "$r" "codex" "split child inherits parent worker"
  r="$(node "$LOOP_DIR/plan.mjs" ready --plan "$P" 2>&1 >/dev/null | grep -c 'unknown dep token')"; check "$r" "2" "range and unknown deps warn"
  node "$LOOP_DIR/plan.mjs" set-status T03 '~' --plan "$P"; r="$(node "$LOOP_DIR/plan.mjs" ready --plan "$P" 2>/dev/null | sed -n '1s/^READY=//p')"; check "$r" "T05 T08a" "in-progress task claims its files"
  node "$LOOP_DIR/plan.mjs" set-status T03 done --plan "$P"; r="$(grep -c '^### \[x\] T03' "$P")"; check "$r" "1" "set-status by word"
  node "$LOOP_DIR/plan.mjs" note T05 --label "iter 02, claude" "did a thing | with pipe" --plan "$P"; r="$(grep -c '^- Notes (iter 02, claude): did a thing | with pipe$' "$P")"; check "$r" "1" "note appended"
  node "$LOOP_DIR/plan.mjs" log-row "| 02 | t | claude | T05 | DONE | pass | abc | n |" --plan "$P"; r="$(tail -1 "$P")"; check "$r" "| 02 | t | claude | T05 | DONE | pass | abc | n |" "log row appended at table end"
  printf '[{"id":"T05a","title":"child a","worker":"claude","files":["src/a.ts"],"deps":["T02"],"ac":"true"},{"id":"T05b","title":"child b","files":[],"deps":["T05a"],"ac":"true"}]' > "$tmp/kids.json"
  node "$LOOP_DIR/plan.mjs" set-status T05 s --plan "$P"; node "$LOOP_DIR/plan.mjs" children T05 "$tmp/kids.json" --plan "$P"
  r="$(node "$LOOP_DIR/plan.mjs" ready --plan "$P" 2>/dev/null | sed -n '1s/^READY=//p')"; check "$r" "T04 T05a T08a" "children inserted; T05b waits for T05a; T04 freed once T03 is done"
  eval "$(node "$LOOP_DIR/plan.mjs" info T02 --plan "$P")"; check "$TITLE" "Title with & ampersand | pipe — dash" "info quoting survives & | —"
  r="$(node "$LOOP_DIR/render.mjs" "$LOOP_DIR/PROMPT.md" "{\"TASK\":\"T02\",\"TITLE\":\"$TITLE\",\"ITER\":\"09\",\"LANE_DIR\":\"/l\",\"SESSION_DIR\":\"s\",\"HV\":\"v2\",\"TASK_BLOCK\":\"b\",\"OPEN_TASKS\":\"o\",\"SPEC_ROWS\":\"\"}" | grep -c 'Title with & ampersand | pipe — dash')"; [ "$r" -ge 1 ] && r=ok; check "$r" "ok" "render keeps & | — in titles"
  r="$(node "$LOOP_DIR/render.mjs" "$LOOP_DIR/CODEX_PROMPT.md" '{"TASK":"T1"}' 2>&1 >/dev/null | grep -c unfilled)"; check "$r" "1" "render rejects unfilled placeholders"
  for f in json json-trailer claude-json bad; do
    eval "$(parse_status "$LOOP_DIR/fixtures/status.$f.log" "$tmp/kids-$f.json")"
    case "$f" in bad) check "$RESULT" "CRASHED" "status.$f → CRASHED" ;; *) check "$RESULT" "DONE" "status.$f → DONE" ;; esac
  done
  eval "$(parse_status "$LOOP_DIR/fixtures/status.claude-json.log" "$tmp/k.json")"; check "$COMMIT" "deadbee" "claude envelope result is unwrapped"
  # worktree + symlinked node_modules run vitest
  local wt="$WT_ROOT/selftest-$$"; git worktree add -q -b "lane/selftest-$$" "$wt" HEAD 2>/dev/null && ln -s "$ROOT/node_modules" "$wt/node_modules"
  if [ -d "$wt" ] && (cd "$wt" && npx vitest run tests/scaffold.test.ts >/dev/null 2>&1); then r=ok; else r=fail; fi
  git worktree remove --force "$wt" >/dev/null 2>&1; git branch -D "lane/selftest-$$" >/dev/null 2>&1
  check "$r" "ok" "worktree with symlinked node_modules runs vitest"
  rm -rf "$tmp"; [ "$fail" = 0 ] && echo "selftest: all checks passed" || { echo "selftest: FAILED"; return 1; }
}

case "${1:-}" in
  dispatch) dispatch ;; collect) collect "$2" ;; loop) loop ;; verdict) verdict ;; status) status_cmd ;; selftest) selftest ;;
  *) echo "usage: iterate.sh dispatch|collect <id>|loop|verdict|status|selftest" >&2; exit 64 ;;
esac
