# IMPLEMENTATION_PLAN — selftest fixture
<!-- plan-format: v2 -->

## Tasks

### [x] T01 — Scaffold
- AC: true
- Deps: none
- Worker: claude
- Files: package.json
- Notes:

### [x] T02 — Title with & ampersand | pipe — dash
- AC: true
- Deps: T01
- Worker: claude
- Files: src/a.ts
- Notes:

### [ ] T03 — Font glyphs A–Z
- AC: npx vitest run tests/sprites.test.ts
- Deps: T01
- Worker: codex
- Files: src/renderer/sprites/font.ts, tests/sprites.test.ts
- Notes:

### [ ] T04 — Overlaps T03 on the sprites test
- AC: true
- Deps: T02
- Worker: claude
- Files: src/core/x.ts, tests/sprites.test.ts
- Notes:

### [ ] T05 — Independent core task
- AC: true
- Deps: T02
- Worker: claude
- Files: src/core/y.ts, tests/y.test.ts
- Notes:

### [ ] T06 — Range dep is unsatisfied
- AC: true
- Deps: T01–T02
- Worker: claude
- Files: src/core/z.ts
- Notes:

### [ ] T07 — Unknown dep is unsatisfied
- AC: true
- Deps: T99
- Worker: claude
- Files: src/core/w.ts
- Notes:

### [s] T08 — Split parent (codex)
- AC: true
- Deps: T01
- Worker: codex
- Files: src/renderer/effects.ts
- Notes:

### [ ] T08a — Child inherits worker
- AC: true
- Deps: none
- Files: src/renderer/effects.ts, tests/effects.test.ts
- Notes: split from T08

### [ ] T09 — Blocked by in-progress files
- AC: true
- Deps: none
- Worker: claude
- Files: src/main/index.ts
- Notes:

### [~] T10 — In progress, claims src/main/index.ts
- AC: true
- Deps: none
- Worker: claude
- Files: src/main/index.ts, src/main/ipc.ts
- Notes:

## Iteration Log (append-only)

| iter | ts | worker | task | result | gates | commit | note |
|---|---|---|---|---|---|---|---|
| 01 | 2026-01-01T00:00 | claude | T01 | DONE | pass | abc1234 | scaffold |
