# Session record — <stage name or iter NN>

- agent role: <spec-clarifier | planner | builder | gfx-worker | validator-packer>
- worker: <claude | codex>
- lane: <.worktrees/T<NN> (branch lane/T<NN>) — this exact form for lane workers | main (stage agents) | re-plan: main>
- harness version: <vN>
- task: <T<NN> or stage name>
- result: <DONE | SPLIT | BLOCKED | NOTHING_TO_DO | MISMATCH | stage outcome>
- commit: <sha or none — codex: always the literal `none`, the orchestrator commits>
- graphify affected used: <symbols queried or none>

## What I did

- <≤10 bullets>

## Files touched

- <paths>

## Gate results

```
<pasted tail of gate output / exit lines>
```

## Attempts & dead ends (what future iterations must NOT retry)

- <approach> → <why it failed>
