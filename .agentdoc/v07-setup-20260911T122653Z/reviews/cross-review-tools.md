# v7 setup cross-review: configuration and review/task tools

Reviewer: `/root/ui_pvp_review`. Scope: root-owned config/evidence/setup-check/docs and another agent's develop/fun/audit. Read-only review; only this report was written. The review deliberately excludes measure.mjs (still being implemented) and all E2E/package tools written by this reviewer. This is an implementation cross-review of the setup, not a formal four-role game audit.

## Findings

### TOOLS-01 — major: the design-review queue is not an executable prerequisite

At review time, `.harness/v7/config.json` registers only `config.mjs validate-candidate` as V07-01's AC. The development journal therefore accepts V07-01 with the protocol validator and ordinary gates, even if `fun.mjs` has never run or a Critic veto is unresolved. All subsequent game tasks can then become eligible. The start prompt and development contract require Designer → Critic → Balance → Playtester design review before implementation.

Evidence: `config.json` V07-01 AC; `develop.mjs` registeredCommand and transition verify; `fun.mjs` status is otherwise unused by the development journal. A pure in-memory reproduction completed the state-machine path and printed `{"synthetic":true,"case":"V07-01 without design review","status":"verified","registeredAC":["protocol"]}`. This used explicitly synthetic check payloads and produced no task journal or purported game evidence.

Recommended fix: add a read-only `fun verify` command that checks a completed latest review round, four distinct role IDs, no unresolved veto, current relevant fingerprints, and immutable evidence. Register that command as a V07-01 AC. Test that missing/incomplete/rejected/stale review cannot verify V07-01. Keep this future design AC separate from setup H07-01 so setup does not require a game audit.

### TOOLS-02 — major: changing the protocol during a revision makes the revision queue unusable

`fun.mjs` acceptReport (line 57 at review) and readSession (line 135) require the current evaluation digest to equal the session's initial digest. `evidence.mjs` includes `docs/v0.7/EVALUATION_PROTOCOL.json` in that digest. After a Critic requests parameter/milestone changes, editing the actual protocol makes the next Designer response stale, even though fun already moved the session to round 2 and requires the old findings to be resolved. Starting a fresh session drops that enforced revision chain. The documentation currently promises revision → new round → Critic verification.

Evidence: pure in-memory reproduction of Designer proposal, Critic `revise`, and the next Designer submission with a changed evaluation digest printed `{"synthetic":true,"case":"Protocol changes after critique","round":2,"error":"Stale source or evaluation evidence; start a fresh design review."}`. No files or actual protocol were modified to reproduce it.

Recommended fix: explicitly support a revision boundary which preserves prior reports/open findings and binds the next round to the changed protocol, while refusing game-source/runner changes. Alternatively, document and implement a draft-design artifact reviewed through all rounds, then verify that the final frozen protocol exactly matches that approved artifact. Do not silently relax all source/evaluation binding. Add a test that a real protocol revision can be reviewed without losing a veto, and unrelated engine/runner edits remain stale.

### TOOLS-03 — major: V07-03's owned files omit tests that necessarily conflict with the new codex rule

The registered V07-03 files include only new `tests/progressV7.test.ts` and `tests/codexV7.test.ts`. Existing `tests/menu.test.ts` (tests starting around 899 and 946) explicitly expect adding seenHeroes/seenMonsters alone to reveal art. Existing `tests/progressV6.test.ts` expects a fresh spawn to create an unread discovery and seen-only legacy entries to remain acknowledged. Both are incompatible with the confirmed actual-selection/first-kill rule and strict legacy ACK pruning. Adding v7 tests cannot make these existing gates green; the assigned implementer would have to violate ownership or preserve the rejected behavior.

Recommended fix: add `tests/menu.test.ts` and `tests/progressV6.test.ts` to V07-03 ownership (plus any directly affected discovered tests found during implementation). Preserve the useful invariants—art masking, DOM identity/focus, acknowledgement races and restart behavior—by updating fixtures and documented version semantics. Do not delete, skip or weaken tests simply to pass gates. Record the deliberate old→new product contract in the handoff.

## Confirmed sound boundaries

- Setup/candidate/release advancement is explicit; setup preserves the baseline source, and pending game tasks remain locked.
- Task checks use registered commands, canonical gates, start/end source/evaluation/owned-file fingerprints and immutable log hashes. Declared mandatory tasks cannot be excluded.
- Phase changes recheck recorded AC/log bytes and the terminal task's source/evaluation fingerprint.
- Result audit separates analysis completion from technical release approval, refuses baseline measurement as candidate evidence, and requires the full native matrix plus measured validation targets at release verification.
- Human enjoyment/attention remains PENDING. No actual Electron journey, long measurement or four-role game audit was performed by this review.

## Limits

The measurement implementation and its CLI/schema correctness were intentionally excluded. No claims about its current behavior or baseline execution are made here. Findings describe the reviewed state; fixes by the owning agents need a separate recheck.
