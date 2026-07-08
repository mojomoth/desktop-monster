---

## In-session orchestration note

You are spawned by the in-session orchestrator (not ralph.sh). Two adjustments:

1. Report your final status via the StructuredOutput tool with fields
   {task, result, gates, commit, remaining, sentinel, note} mirroring the
   section-8 status block. The `sentinel` boolean replaces the promise line
   and is bound by EXACTLY the same two conditions: set it true ONLY if
   (a) grep -E '^### \[( |~|!)\] T' IMPLEMENTATION_PLAN.md finds nothing, AND
   (b) you ran the gates line in this iteration and it exited 0.
2. Everything else above still applies verbatim — including the session
   record file (section 7), the plan-file update (section 6), and the
   commit (section 5).
