# Reported deployed commit: bounded static contract review

Reviewer: `/root/critic`. Status: concrete source-level incompatibilities found; preliminary inference, not a live compatibility AC or release audit.

The immutable `observed.json` records the sole authorized health GET returning HTTP 200, `ok: true`, and commit `28270992518dc5bfc9c1f89f700c0491eaf8d1ed`. That commit exists locally. This follow-up used only `git show <commit>:<path>` and current local source reads/hashes. No additional network, fetch, application execution, test, build, measurement, register, upload, PvP, reclaim, or DB operation occurred. No partial release/validation report was read.

## Concrete differences

1. **Lv11+ snapshot rejection is explicit in the reported commit.** Its `src/shared/api.ts:103–104` defines `LEVEL_MIN = 1`, `LEVEL_MAX = 10`. Its `src/server/app.ts:82–83, 126–131` accepts a companion level only when it is an integer within those bounds. For any otherwise valid snapshot, changing one companion from Lv10 to Lv11, Lv250, or MAX_SAFE makes `parseSnapshot` return null. The authenticated upload path returns `400 bad_request` at `app.ts:197–205`, before `store.putSnapshot` at line 215. This rejects the entire upload; it does not truncate a level or partially replace the stored roster along this branch. This is a static counterexample, not an executed HTTP request.

   Current `src/shared/api.ts:119–121` instead permits positive levels through `Number.MAX_SAFE_INTEGER`, with `Number.isSafeInteger` in `src/server/app.ts:86–87` and the same bounded field validation at lines 130–135. Therefore the observed commit's mismatch includes a concrete V07-02 incompatibility, independent of unrelated mapped-file changes. Current client session operations abort on upload failure (`src/main/net.ts:327–346`); they cannot make high-level rosters compatible with the old server by silently proceeding to match/PvP.

2. **The directory and specified-opponent contract is absent.** The reported commit's route table (`src/server/app.ts:458–480`) has no `GET /v1/pvp/opponents` branch and otherwise returns `404 not_found` after rate handling. Its match function (`app.ts:358–394`) never reads `req.body.opponentId`: it chooses an up/down neighbor using the seed. Although it stores the chosen opponent ID internally at line 386, its match response at lines 374–393 omits that ID. Its PvP response opponent at lines 302–307 also omits it. This would prevent proving that a requested directory row is the actual opponent.

   Current server code reads and validates the requested ID, loads exactly that player, rejects a missing target, and returns `opponent.playerId` (`src/server/app.ts:415–436`); the directory route is at lines 530–531. Current `src/main/net.ts:218–224, 336–350` rejects a selected match or its later result when the returned opponent ID differs or is absent. This is deliberate failure preservation; removing that check would conceal the incompatible selection contract.

3. **Nested party data exists in the old wire shape; hero and selected identity do not.** The reported commit's `src/shared/api.ts:18–25, 32–58` includes companion arrays in snapshots and opponent parties, plus nested `stolen`/`lost`; lines 60–75 define nested theft/reclaim companions. It has no snapshot/opponent hero or opponent player ID. Its snapshot parser returns only `{name, bestIndex, rebirths, companions, party}` (`app.ts:142`), dropping any uploaded hero; match/PvP construct the same hero-less opponent shape. Thus a generic claim that it has no companion party would be incorrect, but it cannot supply the current directory's hero-plus-ID rows.

   Current ordinary `PvpOpponent` keeps `playerId` and `hero` optional for legacy/bot compatibility (`src/shared/api.ts:37–40`), whereas directory `OpponentSummary` requires both (`42–49`). Accordingly, the client does not categorically reject every old generic match merely for omitting hero/ID. It validates all nested companion fields, party size and uniqueness, optional hero/ID shapes, thefts, transfer results, and decimal replay damage (`src/main/net.ts:94–161, 216–228`); directory rows require hero/ID, and an explicitly selected match additionally requires exact ID equality. Valid Lv1–10 legacy response shapes may therefore remain acceptable while the requested v0.7 directory/selection and high-level upload contracts fail.

## Scope of the inference

These conclusions describe source at the commit reported by health. They do not establish that a production process was built from those exact blobs, that every instance reports the same SHA, or that its actual authenticated HTTP/DB behavior was exercised. Health has no DB proof. The earlier helper stopped at the first mapped source mismatch (`src/core/battle.ts`); this follow-up inspected the two specified blobs directly and did not claim a full 35-file deployed mapping audit. Final local high-level checks and the live compatible-SHA proof remain separate required evidence. No deployment or release approval follows from this report.

## Immutable references and SHA-256

- `observed.json`: `90d4abca1b64a514717148e2d71d0806bc9bd536d75468a988ca91f83a39a953`
- `observed.log`: `6a3ba885c5809130167a0541ac073b86d5011924d45a673ef9e18dacff8e45e2`
- Git blob bytes at reported commit, `src/server/app.ts`: `9e29aeff3a30d99b395b60cb93ab39743b86ad56f74f18531ba2383541f373a4`
- Git blob bytes at reported commit, `src/shared/api.ts`: `6c402e82cb2ec83f9affc454ca234ffdcf43ddcc59665ef7fa7c48e040f6d110`
- Current `src/server/app.ts`: `a0327efb4b135a395cd929f8cbfd5c8badfdd49755b0ddc4e35fd2b63e08349a`
- Current `src/shared/api.ts`: `02147c8063801acecac8c19d1d0db8502de6f9f2e6f4126970f60a931bc67736`
- Current `src/main/net.ts`: `10ff700c6b4415467ed305c40222532799cfe3ee5815cc6f13f69c8cd31787fa`

Line numbers labeled “reported commit” refer to that Git blob, not the working-tree file. This new report is the only file written in this follow-up.
