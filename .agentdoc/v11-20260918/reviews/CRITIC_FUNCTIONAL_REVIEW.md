# Bounded functional regression review

Reviewer: /root/skills_harness. Source: 848ab4f6c9323392dd1e3acf9d8ef132471dea0eb35d03b9b2cc78df71fac296. Exact reviewed hashes are in CRITIC_FUNCTIONAL_REVIEW.json.

**No new release-blocking functional regression found in this scope.** This does not approve balance or the overall release.

Reviewed menu pending/rejected request handling, main and renderer ACTION_RESULT routing, manual equipment, and additive save migration. Matching negative responses clear the pending guard for retry; unrelated responses do not. Main cancellation/blocked paths send explicit rejection, and paused renderer actions report rejection. The renderer snapshots each core action error before subsequent actions can overwrite it. Applied feedback remains separate from the dispatch acknowledgment and save-status warning.

Manual equipment swaps retain physical item IDs even with a full bag or temporary storage. Stale/invalid actions fail before committing the cloned draft. Startup and compatible hero changes retain valid manual slots; unrelated transactions fill vacancies, and acquisition/upgrade/unlock checks use only the newly relevant candidates. Save v4 accepts validated additive curve metadata, preserves a legacy current encounter on its old curve and HP, round-trips the chosen loadout, and adopts the current curve on the next spawn/reset. Existing open hero choices are preserved.

Reused prior targeted tests and native evidence after checking all 15 app files bound by the pilot01 review: none changed. Inspected existing regression assertions for rejection/retry, duplicate protection, manual preservation, stale atomicity and legacy metadata. No new test run, Electron process or source edit was performed. The corrected native observer still needs its new real execution; balance evaluation remains incomplete.
