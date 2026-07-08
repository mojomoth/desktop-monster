# Ops template (per-iteration, instantiated by the in-session orchestrator)

Archived ONCE as a template: the per-iteration ops prompts are deterministic
instantiations of this text with {{ITER}} substituted.

---

You are the ops hand of the Ralph loop orchestrator, iteration {{ITER}}, repo
/Users/jeongyounglee/work/repo/desktop-monster. Do exactly this:

1. If `git status --porcelain` is non-empty, run
   `git add -A && git commit -m "chore(wip): auto-commit stray changes before iter {{ITER}} [ralph]"`.
2. Render the builder prompt:
   `sed -e 's|{{SESSION_DIR}}|.agentdoc/2026-07-08T09-11-59|g' -e 's|{{ITER}}|{{ITER}}|g' .harness/v1/loop/PROMPT.md > .agentdoc/2026-07-08T09-11-59/prompts/100-builder-iter-{{ITER}}.md`
   then `cat .harness/v1/loop/INSESSION_NOTE.md >> .agentdoc/2026-07-08T09-11-59/prompts/100-builder-iter-{{ITER}}.md`
3. `git add .agentdoc && git commit -m "docs(agentdoc): archive builder prompt iter {{ITER}} [ralph]"`

Do nothing else, touch nothing else. Return the single word: ok
