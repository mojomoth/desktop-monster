# TOOLING.md — external tools the v2 loop relies on (verified 2026-09-02)

Facts here are what the loop scripts assume. Re-verify after upgrading any tool.
Setup outcomes (H07) are recorded in §7.

## 1. Host

- macOS (Darwin 25.2.0), 12 CPU cores. `node_modules` is 433 MB → lanes SYMLINK
  it from the main checkout (`ln -s ../../node_modules`), never `npm ci` per lane.
- Node **20.12.2** (binding constraint for the pinned toolchain; see
  `GAME_ARCHITECTURE.md §0.2`). `npm run build` ≈ 2 s, `npx vitest run` ≈ 2 s,
  `npm run smoke` ≈ 10–20 s (Electron launch). Iteration time is agent
  reasoning, not tooling.
- `gtimeout` (coreutils) is available; used for every worker wall-clock cap.
- Repo: https://github.com/mojomoth/desktop-monster (PUBLIC), `gh` logged in as
  `mojomoth`, `main` tracks `origin/main`.

## 2. Claude Code CLI (Claude builder + orchestrator)

- `claude` 2.1.258 at `~/.local/bin/claude`; `CLAUDE_CONFIG_DIR=~/.claude-mojomoth-account`
  (user settings: `permissions.defaultMode: auto`, `model: opus[1m]`).
- Lane invocation (standalone or in-session when `NESTED_CLAUDE=1`):
  `cd <lane> && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_BRIDGE_SESSION_ID -u CLAUDE_PID -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PLUGIN_DATA gtimeout --signal=INT --kill-after=120 $CLAUDE_TIMEOUT claude -p "$(cat prompt)" --dangerously-skip-permissions --output-format json [--model $CLAUDE_MODEL]`.
  The JSON envelope's `result` string holds the worker's final message; the
  status object is its first `{` line.
- Inside a Claude Code session the env carries `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`,
  `CLAUDE_CODE_SESSION_ID`, … — a nested `claude -p` must unset the full
  nine-variable list `iterate.sh` keeps in `CLAUDE_UNSET`: `CLAUDECODE`,
  `CLAUDE_CODE_ENTRYPOINT`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION`,
  `CLAUDE_CODE_BRIDGE_SESSION_ID`, `CLAUDE_PID`, `CLAUDE_CODE_MESSAGING_SOCKET`,
  `CLAUDE_CODE_MESSAGING_TOKEN`, `CLAUDE_PLUGIN_DATA` (the stage-1 / stage-2
  probes use the same list). Whether nesting works on this host is probed in
  setup (§7) and recorded as `NESTED_CLAUDE`.
- In-session fallback (`NESTED_CLAUDE=0`): `iterate.sh dispatch` prints
  `PENDING <id> <prompt> <lane-dir>`; the desmon-2-dev skill spawns an Agent
  subagent with the exact contents of `<prompt>` (dispatch already appended
  the rendered `loop/INSESSION_NOTE.md` to it) and writes `$S/lanes/<id>.rc`
  when it returns; the final verdict comes from `iterate.sh verdict`.

## 3. Codex CLI (graphics worker)

- `codex` 0.150.1 (`~/.nvm/versions/node/v20.12.2/bin/codex`), logged in via ChatGPT.
- User config `~/.codex/config.toml`: `model = "gpt-5.6-sol"`,
  `model_reasoning_effort = "xhigh"`, MCP servers context7 / playwright /
  sequential-thinking / node_repl / slack, project trust entries incl.
  `/Users/jeongyounglee/work/repo` (the repo dir itself is NOT listed; see §7).
- Lane invocation:
  `gtimeout --signal=INT --kill-after=120 $CODEX_TIMEOUT codex exec -C <lane> -s workspace-write --dangerously-bypass-hook-trust -c 'mcp_servers={}' -c 'model_reasoning_effort="high"' -m $CODEX_MODEL --color never --json --output-schema .harness/$HV/loop/status.schema.json -o <iter-NN.log> - < prompt > <iter-NN.codex.jsonl> 2>&1`
  - `-s workspace-write`: repo writes + npm/vitest/tsc allowed; network blocked;
    Electron launch and `.git` writes are assumed blocked → the worker never
    runs smoke and never commits (the orchestrator commits `[codex]`).
  - `--output-schema`: the final message is a schema-enforced JSON object
    (`loop/status.schema.json`; no `maxLength`/`minLength` keywords).
  - `-c 'mcp_servers={}'`: no MCP servers for graphics work (no `npx -y` startups).
  - `--dangerously-bypass-hook-trust`: lets the project `.codex/config.toml`
    hooks written by `rgt init` run non-interactively.
  - No `--full-auto` flag exists in 0.150.1. `--ephemeral` is NOT used so
    `codex exec resume --last` works for post-mortems.
- Codex reads the repo `AGENTS.md` automatically (ponytail section included).

## 4. re_gent (`rgt`) — agent activity VCS

- `~/.local/bin/rgt` (version "dev"). `rgt init --agent both --skip-skills`
  creates `.regent/` (own `.gitignore`; also listed in the repo `.gitignore`),
  merges hooks into the PROJECT `.claude/settings.json`
  (UserPromptSubmit → `rgt message-hook user`, Stop → `rgt message-hook assistant`,
  PostToolBatch → `rgt tool-batch-hook`) and the PROJECT `.codex/config.toml`
  (SessionStart/UserPromptSubmit/PostToolUse/Stop → `rgt codex-hook`). Both
  files are COMMITTED so every lane (worktrees share the project files) is captured.
- Used by the loop: `rgt log --json -n 1000` (per collect →
  `$S/sessions/iter-NN.rgt.json`), `rgt sessions`, `rgt log --json -n 5000`
  (stage 3), `rgt blame <file>[:line]` (stage 3 test-integrity check),
  `rgt status`. Capture is best-effort: never an AC, failures are logged only.
- `--skip-skills` keeps third-party skills out of `.claude/skills/` (HARNESS §9
  requires that dir to mirror `.harness/<v>/skills/`).

## 5. graphify — code knowledge graph

- `graphify` 0.8.40 (pipx, `~/.local/bin/graphify`). `graphify update .` runs the
  tree-sitter extractor only (no LLM, no API key) and writes
  `graphify-out/{graph.json,GRAPH_REPORT.md,graph.html,cache/}`. Accepted
  options: `--force`, `--no-cluster` ONLY (`--no-viz` belongs to `cluster-only`).
- Offline queries over `graphify-out/graph.json`: `graphify query "<question>"`,
  `graphify affected "<symbol>" --depth 2`, `graphify path "A" "B"`,
  `graphify explain "X"`.
- `.graphifyignore` excludes `.agentdoc/`, `.harness/`, `.worktrees/`,
  `release/`, `dist/`, `node_modules/`, `.regent/`, `graphify-out/` so the graph
  is about `src/`, `tests/`, `static/`, docs.
- `graphify-out/` is gitignored (regenerable in seconds); the audit artifact is
  the `GRAPH_REPORT.md` snapshot copied into `$S/graph/`. Because it is
  gitignored it does NOT exist in a fresh worktree: `iterate.sh dispatch`
  symlinks `graphify-out/` from the main checkout into each lane (next to
  `node_modules`); workers treat it as read-only and run `graphify update .`
  in the lane only if it is missing.
- NOT used: `graphify hook install` (async post-commit rebuild would dirty the
  tree between collects), `graphify claude install` / `codex install` (they edit
  CLAUDE.md / `.claude/skills` / `.codex/skills`).

## 6. Render CLI — server hosting

- `render` 2.26.0, logged in as mojomoth (`render whoami`). Workspace
  "My Workspace" = `tea-d0fqcok9c44c73bj1ehg`; `render workspace set <id> --confirm`
  writes `~/.render/cli.yaml` (one-time, idempotent).
- Provisioning (in `loop/render-bootstrap.sh`, idempotent by name):
  `render postgres list -o json` / `render services -o json` to look up
  `desmon-db` / `desmon-server`; create only when absent:
  `render postgres create --name desmon-db --plan free --region oregon --confirm -o json`,
  `render postgres get <dpg-id> --include-sensitive-connection-info -o json`
  (internal connection string),
  `render services create --name desmon-server --type web_service --runtime node --plan free --region oregon --repo https://github.com/mojomoth/desktop-monster --branch main --root-directory . --build-command 'npm ci --include=dev --ignore-scripts && npm run build' --start-command 'npm run start:server' --health-check-path /healthz --env-var DATABASE_URL=<internal-url> --build-filter-path 'src/server/**' --build-filter-path 'src/core/**' --build-filter-path 'src/shared/**' --build-filter-path package.json --build-filter-path package-lock.json --build-filter-path tsconfig.main.json --build-filter-path .node-version --confirm -o json`.
- Deploy: `git push origin main` then `render deploys create <srv-id> --wait --confirm`
  (the public repo builds without the GitHub app, but push webhooks are not
  guaranteed → always trigger explicitly). Logs: `render logs`.
- Limits: `render services update` has NO `--env-var` (rotating `DATABASE_URL`
  after the free Postgres expires = dashboard edit or service recreation with the
  same name); `render blueprints` only validates `render.yaml`.
- Free tier: web service sleeps after 15 min idle (~1 min cold start),
  750 h/month; free Postgres 1 per workspace, 1 GB, no backups, EXPIRES 30 days
  after creation (14-day grace). Node default on Render is 24.x → pinned by
  `.node-version` = `20.12.2`.
- `render skills install --dry-run` reports 21 skills; not installed (would add
  to `.claude/skills/`).

## 7. Setup outcomes (recorded by the harness bump, 2026-09-02)

- rgt init: `rgt init --agent both --skip-skills` created `.regent/` but could NOT
  configure hooks non-interactively ("could not open a new TTY"). The two hook
  files were therefore written by hand from rgt's own manual-config output and
  are COMMITTED: `.claude/settings.json` (UserPromptSubmit → `rgt message-hook user`,
  Stop → `rgt message-hook assistant`, PostToolBatch → `rgt tool-batch-hook`) and
  `.codex/config.toml` (`[features] hooks = true`; SessionStart/UserPromptSubmit/
  PostToolUse/Stop → `rgt codex-hook`). Verified: `rgt sessions` lists the
  bump session (claude_code) and the codex probe (codex_cli:probe).
- graphify baseline: `graphify update .` → 510 nodes, 998 edges, 27 communities
  in 2.4 s (68 files); `graphify-out/` gitignored.
- render workspace: set to My Workspace (tea-d0fqcok9c44c73bj1ehg). Existing
  service in the workspace: `mono-npc-server` (another project) — no name
  collision with `desmon-server`; no Postgres exists yet (free slot available).
  No DesMon resources were created by the bump (the deploy task creates them).
- codex probe: `codex exec -C "$PWD" -s read-only --dangerously-bypass-hook-trust -c 'mcp_servers={}' -c 'model_reasoning_effort="low"' -o out.txt 'Reply PROBE_OK' < /dev/null`
  → PROBE_OK in ~7 s, project hooks fired, rgt captured the session; no project
  trust entry was needed. GOTCHA: when stdin is an open pipe, codex waits on it
  ("Reading additional input from stdin…") until EOF — always pass the prompt
  via `- < prompt-file` (as iterate.sh does) or close stdin with `< /dev/null`.
  Noise: the user-level Slack MCP server still logs an AuthRequired error even
  with `-c 'mcp_servers={}'`; harmless.
- nested `claude -p` probe: works from inside a Claude Code session with
  `env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT …` (result "PROBE_OK", model
  claude-opus-5[1m]) → `NESTED_CLAUDE=1` is the default; the in-session skill
  runs `iterate.sh loop` directly.
- Tool versions: claude 2.1.258, codex 0.150.1, rgt dev, graphify 0.8.40, render 2.26.0, node 20.12.2.
- Loop dry run (throwaway clone, 2026-09-02): Claude lane (`claude -p`, opus[1m]) took 70 s / $0.47 for a trivial task incl. reading AGENTS.md + charter and writing the session record; Codex lane (gpt-5.6-sol, effort high, workspace-write) took ~60 s / 319k input tokens (285k cached) and returned the schema-enforced JSON; merge → gates → conditional smoke (SMOKE_OK) → plan write → cleanup all passed. Bugs found and fixed by the dry run: OpenAI strict schemas require every property in `required` (so `children` is mandatory for Codex); a worker's `gates: pass` must not be eval'ed into the gates-command variable; `git revert` has no `-q`; a lane must not re-symlink `node_modules` when it already exists.
  After the fixes the same clone converged end to end (`CONVERGED after 4 iterations`, exit 0): second Claude lane 52 s / $0.32, final gates + smoke on main green, no worktrees left, kept branches `lane/T98-crash-01` and `lane/T99-red-02` as evidence.
