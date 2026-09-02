# User original requirements (verbatim, as received in this session)

<요구사항 원문: "지금 만들어진 게임을 더 디벨롭해야해. ..." 전체>

Run the Desktop Monster harness v2 end to end without asking me anything:
invoke skill desmon-1-plan with the requirements above (new session), then
desmon-2-dev with LANES=3, then desmon-3-eval. Do not stop between stages.
Whatever exit code the dev loop returns (0–4), still run desmon-3-eval so a
handoff is written.

---
Orchestrator note: the requirements text reached this session only as the
placeholder line above (the full Korean text was not transmitted and no earlier
message contains it). The normative requirements source for this run is the
harness v2 reference set: `.harness/v2/reference/GAME_DESIGN_V2.md` and
`.harness/v2/reference/SERVER_ARCHITECTURE.md`, as summarised in AGENTS.md
§"What this project is" (bosses → companions, fever, A–Z big numbers, per-species
effects, Collection & Battle window, leaderboard/PvP server with companion stealing).
