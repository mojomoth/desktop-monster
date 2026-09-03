#!/usr/bin/env bash
# render-bootstrap.sh — idempotent Render provisioning for the DesMon server.
# Looks resources up BY NAME first; creates only what is missing. Prints
# shell-evalable facts. Run by the loop's deploy task (needs network + the
# Render login), never by the harness bump. See reference/TOOLING.md §6.
#
#   bash .harness/v2/loop/render-bootstrap.sh            → SERVER_URL=… SRV_ID=… DB_ID=… DB_CREATED=… DB_EXPIRES=…
set -uo pipefail
WS="${RENDER_WORKSPACE:-tea-d0fqcok9c44c73bj1ehg}"
DB_NAME="${DESMON_DB_NAME:-desmon-db}"; SRV_NAME="${DESMON_SRV_NAME:-desmon-server}"
REGION="${RENDER_REGION:-oregon}"; REPO="${DESMON_REPO:-https://github.com/mojomoth/desktop-monster}"; BRANCH="${DESMON_BRANCH:-main}"
FILTERS=(src/server/** src/core/** src/shared/** package.json package-lock.json tsconfig.main.json .node-version)

command -v render >/dev/null || { echo "FATAL: render CLI missing" >&2; exit 69; }
render workspace set "$WS" --confirm >/dev/null 2>&1 || { echo "FATAL: render workspace set failed" >&2; exit 70; }

# jq-free JSON helpers (the CLI's exact field names are verified on first run;
# every helper searches the whole document so shape drift degrades gracefully).
jfind() { node -e '
const want=process.argv[1], name=process.argv[2]; let doc=""; process.stdin.on("data",d=>doc+=d).on("end",()=>{
let j; try{ j=JSON.parse(doc) }catch{ process.exit(0) }
const seen=[]; const walk=(o)=>{ if(!o||typeof o!=="object")return; if(Array.isArray(o)){o.forEach(walk);return}
 if(o.name===name && typeof o.id==="string") seen.push(o); for(const v of Object.values(o)) walk(v) };
walk(j); const hit=seen[0]; if(!hit)return;
if(want==="id") process.stdout.write(hit.id);
else if(want==="url") process.stdout.write((hit.serviceDetails&&hit.serviceDetails.url)||hit.url||"");
else if(want==="created") process.stdout.write(hit.createdAt||"");
})' "$@"; }
jkey() { node -e '
const key=process.argv[1]; let doc=""; process.stdin.on("data",d=>doc+=d).on("end",()=>{
let j; try{ j=JSON.parse(doc) }catch{ process.exit(0) }
let out=""; const walk=(o)=>{ if(out||!o||typeof o!=="object")return; if(Array.isArray(o)){o.forEach(walk);return}
 if(typeof o[key]==="string"){out=o[key];return} for(const v of Object.values(o)) walk(v) };
walk(j); process.stdout.write(out) })' "$@"; }

# ---------- Postgres (free: 1 per workspace, expires 30 days after creation) ----------
DB_JSON="$(render postgres list -o json 2>/dev/null)"
DB_ID="$(printf '%s' "$DB_JSON" | jfind id "$DB_NAME")"
if [ -z "$DB_ID" ]; then
  echo "creating postgres $DB_NAME (free, $REGION)" >&2
  DB_JSON="$(render postgres create --name "$DB_NAME" --plan free --region "$REGION" --confirm -o json)" || { echo "FATAL: postgres create failed" >&2; exit 71; }
  DB_ID="$(printf '%s' "$DB_JSON" | jfind id "$DB_NAME")"
  [ -n "$DB_ID" ] || DB_ID="$(printf '%s' "$DB_JSON" | jkey id)"
fi
[ -n "$DB_ID" ] || { echo "FATAL: could not resolve postgres id (inspect: render postgres list -o json)" >&2; exit 72; }
DB_DETAIL="$(render postgres get "$DB_ID" --include-sensitive-connection-info -o json 2>/dev/null)"
DB_URL="$(printf '%s' "$DB_DETAIL" | jkey internalConnectionString)"
[ -n "$DB_URL" ] || DB_URL="$(printf '%s' "$DB_DETAIL" | jkey externalConnectionString)"
DB_CREATED="$(printf '%s' "$DB_DETAIL" | jkey createdAt)"
DB_EXPIRES="$(node -e 'const c=process.argv[1];const d=c?new Date(c):new Date();d.setDate(d.getDate()+30);process.stdout.write(d.toISOString().slice(0,10))' "$DB_CREATED")"

# ---------- Web service (free) ----------
SRV_JSON="$(render services -o json 2>/dev/null)"
SRV_ID="$(printf '%s' "$SRV_JSON" | jfind id "$SRV_NAME")"
SERVER_URL="$(printf '%s' "$SRV_JSON" | jfind url "$SRV_NAME")"
if [ -z "$SRV_ID" ]; then
  [ -n "$DB_URL" ] || { echo "FATAL: no DATABASE_URL to inject (inspect: render postgres get $DB_ID --include-sensitive-connection-info -o json)" >&2; exit 73; }
  echo "creating web service $SRV_NAME (free, $REGION)" >&2
  args=(--name "$SRV_NAME" --type web_service --runtime node --plan free --region "$REGION"
        --repo "$REPO" --branch "$BRANCH" --root-directory .
        --build-command 'npm ci --include=dev --ignore-scripts && npm run build'
        --start-command 'npm run start:server' --health-check-path /healthz
        --env-var "DATABASE_URL=$DB_URL")
  for f in "${FILTERS[@]}"; do args+=(--build-filter-path "$f"); done
  SRV_JSON="$(render services create "${args[@]}" --confirm -o json)" || { echo "FATAL: services create failed" >&2; exit 74; }
  SRV_ID="$(printf '%s' "$SRV_JSON" | jfind id "$SRV_NAME")"; [ -n "$SRV_ID" ] || SRV_ID="$(printf '%s' "$SRV_JSON" | jkey id)"
  SERVER_URL="$(printf '%s' "$SRV_JSON" | jfind url "$SRV_NAME")"; [ -n "$SERVER_URL" ] || SERVER_URL="$(printf '%s' "$SRV_JSON" | jkey url)"
fi
[ -n "$SRV_ID" ] || { echo "FATAL: could not resolve service id" >&2; exit 75; }
[ -n "$SERVER_URL" ] || SERVER_URL="https://$SRV_NAME.onrender.com"

printf 'SERVER_URL=%s\nSRV_ID=%s\nDB_ID=%s\nDB_CREATED=%s\nDB_EXPIRES=%s\n' "$SERVER_URL" "$SRV_ID" "$DB_ID" "$DB_CREATED" "$DB_EXPIRES"
