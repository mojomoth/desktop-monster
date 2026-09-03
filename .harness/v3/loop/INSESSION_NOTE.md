
---

## In-session lane note (appended by the orchestrator on the fallback path)

You are spawned by the in-session orchestrator as a subagent, not as
`claude -p`. Two adjustments:

1. Your working directory for EVERY command and file path is {{LANE_DIR}}.
   Run `cd {{LANE_DIR}}` before anything else and never use a path outside
   it — the repository root you may see in tool defaults is the MAIN
   checkout and is off limits.
2. Report your final status via the StructuredOutput tool with exactly the
   fields of `.harness/{{HV}}/loop/status.schema.json` (task, result, gates,
   commit, note, children?) AND print the same JSON object as the first line
   of your final text message. Everything else above still applies verbatim.
