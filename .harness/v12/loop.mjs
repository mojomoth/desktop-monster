#!/usr/bin/env node
// loop.mjs — uninterrupted orchestrator for harness v12 (plan §8/§11). Host only.
//   node .harness/v12/loop.mjs RUN --stage A|B [--lanes N] [--max-iter N]
// Stage A dispatches every stage-A task (Codex art lanes with vision-critique rounds included), renders the
// expected screens and stops at the human preview gate (exit 10 until docs/v0.12/RAID_ART.md carries a matching
// `approved:` line). Stage B requires that gate, then runs every remaining task, freezes the source, re-checks
// every AC + the gates and verifies the whole graph. Nothing here asks a human anything.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, rmSync, symlinkSync, readdirSync, cpSync } from 'node:fs';
import { resolve, join, basename, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOT, config, sha } from './run.mjs';

const HARNESS = fileURLToPath(new URL('.', import.meta.url));
const RUN_MJS = join(HARNESS, 'run.mjs'), PREVIEW_MJS = join(HARNESS, 'raid-preview.mjs');
export const HUMAN_EXIT = 10, POLL_MS = 15_000, MAX_ATTEMPTS = 3, MAX_ROUNDS = 3, MAX_FREEZES = 3;
export const GATE_ID = config.tasks.find(t => t.human)?.id ?? 'V12-08';
const CLAUDE_UNSET = ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_SESSION_ID', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_BRIDGE_SESSION_ID',
  'CLAUDE_PID', 'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_PLUGIN_DATA'];
const BRIEFS = { boss: 'BOSS_BRIEF.md', items: 'ITEM_BRIEF.md', scene: 'SCENE_BRIEF.md', menu: 'MENU_BRIEF.md' };

// ---------- pure helpers (unit-tested) ----------
export const stageTasks = (cfg, stage) => cfg.tasks.filter(t => stage === 'B' || t.stage === stage);
export function topoOrder(tasks) {
  const done = new Set(), out = [];
  while (out.length < tasks.length) {
    const next = tasks.find(t => !done.has(t.id) && t.dependencies.every(d => done.has(d) || !tasks.some(x => x.id === d)));
    if (!next) throw Error('Cyclic or unknown dependencies');
    done.add(next.id); out.push(next.id);
  }
  return out;
}
export function renderTemplate(template, values) {
  let text = template;
  for (const [k, v] of Object.entries(values)) text = text.split(`{{${k}}}`).join(String(v ?? ''));
  const left = text.match(/\{\{[A-Z_]+\}\}/g);
  if (left) throw Error('unfilled placeholders: ' + [...new Set(left)].join(' '));
  return text;
}
const RESULTS = ['DONE', 'SPLIT', 'BLOCKED', 'NOTHING_TO_DO', 'MISMATCH'];
/** Last status object in a worker log (claude -p JSON envelope or raw codex final message); CRASHED when absent. */
export function parseStatus(text) {
  let status = null;
  const consider = value => { if (value && typeof value === 'object' && typeof value.task === 'string' && typeof value.result === 'string') status = value; };
  const scan = source => { for (const line of String(source).split('\n')) { const t = line.trim(); if (!t.startsWith('{')) continue;
    try { const o = JSON.parse(t); if (o && o.type === 'result' && typeof o.result === 'string') scan(o.result); consider(o); } catch { /* not json */ } } };
  scan(text);
  if (!status) return { result: 'CRASHED', task: '', gates: '', commit: 'none', note: 'no status JSON', children: [] };
  return { ...status, result: RESULTS.includes(status.result) ? status.result : 'CRASHED', note: String(status.note ?? '').replace(/\s+/g, ' ').slice(0, 600),
    children: Array.isArray(status.children) ? status.children : [] };
}
export const reviseTarget = note => (/^REVISE (V12-[0-9a-z]+):/i.exec(String(note ?? '').trim()) ?? [])[1] ?? null;
export function critiqueVerdict(text) {
  const pick = (/^pick:\s*([AB-])/im.exec(text) ?? [])[1] ?? null;
  const raw = (/^blocking:\s*(none|\d+)/im.exec(text) ?? [])[1];
  return { pick, blocking: raw === undefined ? null : raw === 'none' ? 0 : Number(raw) };
}
/** `rejected: <sha> reason: … lanes: V12-05a,V12-07b` → lanes to redo (all art lanes when none listed). */
export function rejectionTargets(line, cfg = config) {
  const art = cfg.tasks.filter(t => t.art).map(t => t.id);
  const listed = (/lanes:\s*([A-Za-z0-9,\- ]+)/.exec(line) ?? [])[1];
  if (!listed) return art;
  return listed.split(/[,\s]+/).filter(id => art.includes(id));
}
export function latestApprovalLine(text) {
  return String(text).split('\n').map(l => l.trim()).filter(l => /^(approved|rejected):/.test(l)).at(-1) ?? null;
}

// ---------- runtime ----------
const argv = process.argv.slice(2);
const flag = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
function main() {
  const RUN = resolve(argv[0] ?? ''), STAGE = flag('--stage', ''), LANES = Number(flag('--lanes', config.lanes ?? 3)), MAX_ITER = Number(flag('--max-iter', 60));
  if (!argv[0] || !['A', 'B'].includes(STAGE)) { console.error('usage: loop.mjs RUN --stage A|B [--lanes N] [--max-iter N]'); process.exit(64); }
  mkdirSync(join(RUN, 'sessions'), { recursive: true }); mkdirSync(join(RUN, 'codex'), { recursive: true }); mkdirSync(join(RUN, 'lanes'), { recursive: true });
  const logFile = join(RUN, 'loop.log');
  const log = msg => { const line = `${new Date().toISOString()} ${msg}`; appendFileSync(logFile, line + '\n'); console.error(line); };
  const stateFile = join(RUN, 'loop-state.json');
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : { attempts: {}, revisions: {}, dispatched: 0, freezes: 0, notes: {} };
  const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
  const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const runMjs = (...args) => { const r = spawnSync('node', [RUN_MJS, args[0], RUN, ...args.slice(1)], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) log(`run.mjs ${args.join(' ')} → ${r.stderr.trim() || r.stdout.trim()}`); return r; };
  const journal = () => JSON.parse(readFileSync(join(RUN, 'loop.json'), 'utf8'));
  const taskOf = id => config.tasks.find(t => t.id === id);
  const commitRun = why => { if (git(['status', '--porcelain', '--', relative(ROOT, RUN), 'docs/v0.12/RAID_ART.md']).trim())
    git(['add', '-A', '--', relative(ROOT, RUN), 'docs/v0.12/RAID_ART.md']), git(['commit', '-qm', `docs(agentdoc): ${why} [loop]`]); };

  if (!existsSync(join(RUN, 'loop.json'))) { const r = runMjs('init'); if (r.status !== 0) process.exit(65); }
  for (const [owner, id] of Object.entries(config.agents)) if (journal().agents[owner] !== id) runMjs('register', owner, id);
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']).trim() !== 'v3') { log('FATAL: integration branch must be v3'); process.exit(65); }
  if (git(['status', '--porcelain', '--', '.', ':!.agentdoc', ':!.worktrees']).trim()) { git(['add', '-A']); git(['commit', '-qm', 'chore(wip): auto-commit stray changes before loop [loop]']); log('auto-committed stray changes'); }

  const lanes = new Map(); // id → { task, dir, round, attempt, child, out, timer, kind }
  const laneDir = id => join(ROOT, '.worktrees', id);
  const runRel = relative(ROOT, RUN);

  function readyIds() {
    const r = runMjs('next'); if (r.status !== 0) return [];
    const ids = JSON.parse(r.stdout).map(t => t.id);
    const allowed = new Set(stageTasks(config, STAGE).map(t => t.id));
    return config.tasks.map(t => t.id).filter(id => ids.includes(id) && allowed.has(id) && !lanes.has(id));
  }
  function makeWorktree(id) {
    const dir = laneDir(id);
    try { git(['worktree', 'remove', '--force', dir]); } catch { /* none */ }
    try { git(['branch', '-D', `lane/${id}`]); } catch { /* none */ }
    git(['worktree', 'add', '-q', '-b', `lane/${id}`, dir, 'HEAD']);
    if (!existsSync(join(dir, 'node_modules'))) symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'));
    if (existsSync(join(ROOT, 'graphify-out')) && !existsSync(join(dir, 'graphify-out'))) symlinkSync(join(ROOT, 'graphify-out'), join(dir, 'graphify-out'));
    mkdirSync(join(dir, runRel, 'sessions'), { recursive: true });
    return dir;
  }
  function history(id) {
    const t = journal().tasks.find(x => x.id === id);
    return [...(t?.invalidations ?? []).map(i => i.reason), ...(state.notes[id] ?? [])].slice(-6).join(' | ') || 'none';
  }
  function spawnWorker(lane, prompt) {
    const { task, dir, attempt, round } = lane, id = task.id;
    const codex = task.owner === 'Codex';
    const tag = codex ? `${id}-r${round}` : `${id}-a${attempt}`;
    lane.out = join(RUN, codex ? 'codex' : 'lanes', tag + (codex ? '.log' : '.claude.json'));
    writeFileSync(join(RUN, codex ? 'codex' : 'lanes', tag + '.prompt.md'), prompt);
    const stdio = codex ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'];
    const env = { ...process.env }; for (const k of CLAUDE_UNSET) delete env[k];
    const child = codex
      ? spawn('codex', ['exec', '-C', dir, '-s', 'workspace-write', '--dangerously-bypass-hook-trust', '-c', 'mcp_servers={}', '-c', 'model_reasoning_effort="high"',
          '-m', process.env.CODEX_MODEL ?? config.codexModel, '--color', 'never', '--json', '--output-schema', join(HARNESS, 'codex/status.schema.json'), '-o', lane.out, '-'], { cwd: dir, env, stdio })
      : spawn('claude', ['-p', prompt, '--dangerously-skip-permissions', '--output-format', 'json', ...(process.env.CLAUDE_MODEL ? ['--model', process.env.CLAUDE_MODEL] : [])], { cwd: dir, env, stdio });
    const capture = join(RUN, codex ? 'codex' : 'lanes', tag + (codex ? '.jsonl' : '.stdout'));
    const chunks = []; child.stdout.on('data', d => chunks.push(d)); child.stderr.on('data', d => chunks.push(d));
    if (codex) { child.stdin.end(prompt); }
    lane.child = child; lane.done = false; lane.exitCode = null;
    child.on('close', code => { lane.done = true; lane.exitCode = code; writeFileSync(capture, Buffer.concat(chunks)); if (!codex) writeFileSync(lane.out, Buffer.concat(chunks)); });
    const limit = Number(process.env[codex ? 'CODEX_TIMEOUT' : 'CLAUDE_TIMEOUT'] ?? (codex ? 2400 : 3600)) * 1000;
    lane.timer = setTimeout(() => { log(`${id}: worker timeout → SIGINT`); child.kill('SIGINT'); setTimeout(() => child.kill('SIGKILL'), 120_000).unref(); }, limit); lane.timer.unref();
    log(`dispatch ${tag} (${task.owner}) → ${dir}`);
  }
  function codexPrompt(lane) {
    const { task, round, dir } = lane;
    const brief = renderTemplate(readFileSync(join(HARNESS, 'codex', BRIEFS[task.art] ?? 'SCENE_BRIEF.md'), 'utf8'), { ELEMENT: task.element ?? '' });
    const critique = lane.critique ?? (state.notes[task.id]?.at(-1) ?? 'none');
    return renderTemplate(readFileSync(join(HARNESS, 'codex/PROMPT.md'), 'utf8'), { TASK: task.id, TITLE: task.title, ROUND: round, LANE_DIR: dir,
      FILES: task.files.join(', '), AC: task.ac.replaceAll('{runDir}', RUN), BRIEF: brief, CRITIQUE: critique, SESSION_DIR: runRel });
  }
  function claudePrompt(lane) {
    const { task, dir, attempt } = lane;
    const charter = readFileSync(join(HARNESS, 'agents', task.owner.toLowerCase() + '.md'), 'utf8');
    return renderTemplate(readFileSync(join(HARNESS, 'agents/PROMPT.md'), 'utf8'), { TASK: task.id, TITLE: task.title, OWNER: task.owner, STAGE, ATTEMPT: attempt,
      LANE_DIR: dir, RUN, PLAN: 'docs/v0.12/PLAN.md', FILES: task.files.join(', '), AC: task.ac.replaceAll('{runDir}', RUN), NOTES: task.notes ?? 'none',
      HISTORY: history(task.id), CHARTER: charter });
  }
  function dispatch(id) {
    const task = taskOf(id);
    if (runMjs('start', id).status !== 0) return false;
    if (task.precheck) {  // scaffolding tasks done by hand before the loop: accept them when AC + gates already pass on the clean tree
      if (runMjs('check', id, 'ac').status === 0 && runMjs('check', id, 'gates').status === 0) { log(`${id}: precheck passed, no worker needed`); commitRun(`precheck ${id}`); return true; }
      runMjs('invalidate', id, 'precheck failed; dispatching a worker');
      if (runMjs('start', id).status !== 0) return false;
    }
    state.attempts[id] = (state.attempts[id] ?? 0) + 1; state.dispatched += 1; save();
    const lane = { task, dir: makeWorktree(id), attempt: state.attempts[id], round: 1, kind: task.owner === 'Codex' ? 'codex' : 'claude' };
    lanes.set(id, lane);
    spawnWorker(lane, lane.kind === 'codex' ? codexPrompt(lane) : claudePrompt(lane));
    return true;
  }
  function critique(lane) {  // art rounds: board PNGs → Claude vision → critique text
    const { task, round, dir } = lane, out = join(RUN, 'codex', `${task.id}-r${round}`);
    mkdirSync(out, { recursive: true });
    const board = spawnSync('node', [PREVIEW_MJS, 'board', '--lane', dir, '--out', out], { cwd: ROOT, encoding: 'utf8' });
    writeFileSync(join(out, 'board.log'), board.stdout + board.stderr);
    const pngs = board.status === 0 ? readdirSync(out).filter(f => f.endsWith('.png')).map(f => join(out, f)) : [];
    if (!pngs.length) { log(`${task.id} r${round}: board failed`); return { text: `blocking: 1\n1. board render failed:\n${(board.stderr || board.stdout).slice(-1500)}`, verdict: { pick: null, blocking: 1 } }; }
    const prompt = readFileSync(join(HARNESS, 'agents/art-critic.md'), 'utf8') + `\n\nLane ${task.id} "${task.title}", round ${round}. Boards (open each with Read):\n` +
      pngs.map(p => '- ' + p).join('\n') + '\n\nWrite the verdict now.';
    const env = { ...process.env }; for (const k of CLAUDE_UNSET) delete env[k];
    const r = spawnSync('claude', ['-p', prompt, '--dangerously-skip-permissions', '--output-format', 'text', ...(process.env.CLAUDE_MODEL ? ['--model', process.env.CLAUDE_MODEL] : [])],
      { cwd: ROOT, env, encoding: 'utf8', timeout: 1_200_000, maxBuffer: 16 * 1024 * 1024 });
    const text = (r.stdout || '') + (r.status === 0 ? '' : `\n(critic exit ${r.status}: ${(r.stderr || '').slice(-500)})`);
    writeFileSync(join(out, 'critique.md'), text);
    const verdict = critiqueVerdict(text);
    appendFileSync(join(ROOT, 'docs/v0.12/RAID_ART.md'), `| ${task.id} | ${round} | ${verdict.pick ?? '-'} | ${relative(ROOT, join(out, 'critique.md'))} | ${relative(ROOT, out)} |\n`);
    return { text, verdict };
  }
  function laneAcPasses(lane) {
    const r = spawnSync(lane.task.ac.replaceAll('{runDir}', RUN), { cwd: lane.dir, shell: '/bin/zsh', encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(join(RUN, 'codex', `${lane.task.id}-r${lane.round}.ac.log`), (r.stdout ?? '') + (r.stderr ?? ''));
    return r.status === 0;
  }
  function noteFailure(id, note) { (state.notes[id] ??= []).push(note); save(); }
  function retryOrBlock(id, reason) {
    const attempts = state.attempts[id] ?? 0;
    if (attempts >= MAX_ATTEMPTS) {
      const evidence = join(RUN, 'lanes', `${id}.blocked.json`);
      writeFileSync(evidence, JSON.stringify({ environmental: true, attempts: (state.notes[id] ?? []).slice(-MAX_ATTEMPTS).map((note, i) => ({ attempt: i + 1, note })), reason }, null, 2));
      runMjs('block', id, evidence); log(`${id}: BLOCKED after ${attempts} attempts`);
    } else runMjs('invalidate', id, reason);
  }
  function collect(lane) {
    const { task, dir, attempt, round } = lane, id = task.id; clearTimeout(lane.timer);
    const status = parseStatus(existsSync(lane.out) ? readFileSync(lane.out, 'utf8') : '');
    if ([null, 124, 137].includes(lane.exitCode) && lane.exitCode !== 0 && status.result === 'CRASHED') status.note = `worker exit ${lane.exitCode}; ${status.note}`;
    if (status.task && status.task !== id) { status.result = 'MISMATCH'; status.note = `reported ${status.task}; ${status.note}`; }
    log(`collect ${id} a${attempt} r${round}: ${status.result} — ${status.note.slice(0, 160)}`);
    let keep = '';
    if (status.result === 'DONE' && task.art) {
      if (!laneAcPasses(lane)) { status.result = 'CRASHED'; status.note = `lane AC failed in round ${round}; ${status.note}`; }
      else {
        const { text, verdict } = critique(lane);
        const needsRound = (round === 1 && task.art === 'boss') || (verdict.blocking ?? 1) > 0;
        if (needsRound && round < MAX_ROUNDS) { lane.round += 1; lane.critique = text; spawnWorker(lane, codexPrompt(lane)); return; }
        if ((verdict.blocking ?? 0) > 0) noteFailure(id, `round ${round} still blocking: ${text.slice(0, 300)}`);
      }
    }
    if (['DONE', 'NOTHING_TO_DO'].includes(status.result)) {
      if (git(['status', '--porcelain'], dir).trim()) { git(['add', '-A'], dir); git(['commit', '-qm', `${task.art ? 'art' : 'feat'}(${id}): ${task.title} [${lane.kind}]`], dir); }
      const merged = (() => { try { git(['merge', '--no-ff', '-q', '-m', `merge(${id}): ${task.title} [loop a${attempt}]`, `lane/${id}`]); return true; }
        catch (e) { try { git(['merge', '--abort']); } catch { /* clean */ } noteFailure(id, `merge conflict: ${String(e.stderr || e.message).slice(0, 300)}`); return false; } })();
      if (!merged) { keep = `lane/${id}-conflict-a${attempt}`; retryOrBlock(id, 'merge conflict'); }
      else {
        const ac = runMjs('check', id, 'ac'); const gates = ac.status === 0 ? runMjs('check', id, 'gates') : ac;
        if (ac.status !== 0 || gates.status !== 0) {
          const which = ac.status !== 0 ? 'AC' : 'gates';
          try { git(['revert', '--no-edit', '-m', '1', 'HEAD']); } catch { git(['revert', '--abort']); log(`${id}: revert failed — fix v3 by hand`); }
          keep = `lane/${id}-red-a${attempt}`; noteFailure(id, `${which} failed at integration (see ${runRel}/evidence)`); retryOrBlock(id, `${which} failed at integration`);
        } else log(`${id}: implemented at ${git(['rev-parse', '--short', 'HEAD']).trim()}`);
      }
    } else if (status.result === 'BLOCKED' && reviseTarget(status.note)) {
      const target = reviseTarget(status.note); state.revisions[target] = (state.revisions[target] ?? 0) + 1; save();
      noteFailure(target, status.note); runMjs('invalidate', target, status.note); runMjs('invalidate', id, `waiting for ${target} revision`);
      state.attempts[target] = Math.max(0, (state.attempts[target] ?? 1) - 1); save();
      log(`${id} requests revision of ${target} (${state.revisions[target]})`);
    } else if (status.result === 'SPLIT') { noteFailure(id, `SPLIT requested (not supported by loop.mjs): ${JSON.stringify(status.children).slice(0, 300)}`); retryOrBlock(id, 'worker asked to split'); }
    else { noteFailure(id, `${status.result}: ${status.note}`); retryOrBlock(id, `${status.result}: ${status.note.slice(0, 120)}`); keep = status.result === 'CRASHED' ? `lane/${id}-crash-a${attempt}` : ''; }
    try { git(['worktree', 'remove', '--force', dir]); } catch { /* gone */ }
    if (keep) { try { git(['branch', '-m', `lane/${id}`, keep]); } catch { /* fine */ } } else { try { git(['branch', '-D', `lane/${id}`]); } catch { /* fine */ } }
    appendFileSync(join(RUN, 'loop.md'), `| ${new Date().toISOString()} | ${id} | a${attempt} r${round} | ${status.result} | ${status.note.slice(0, 100).replaceAll('|', '/')} |\n`);
    lanes.delete(id); commitRun(`collect ${id} ${status.result}`);
  }
  function handleRejection() {  // a `rejected:` line after the last approval reopens the listed art lanes with the reason as critique
    const line = latestApprovalLine(readFileSync(join(ROOT, 'docs/v0.12/RAID_ART.md'), 'utf8'));
    if (!line?.startsWith('rejected:') || state.lastRejection === line) return;
    state.lastRejection = line; save();
    for (const id of rejectionTargets(line)) { noteFailure(id, `USER REJECTION: ${line}`); runMjs('invalidate', id, line); state.attempts[id] = 0; }
    runMjs('invalidate', GATE_ID, line); save(); log(`rejection reopened: ${rejectionTargets(line).join(' ')}`);
  }
  function runGate() {  // renders the expected screens, then requires the human approval line (never written by the loop)
    const attemptDir = join(RUN, 'preview', `attempt-${String((state.previewAttempts = (state.previewAttempts ?? 0) + 1)).padStart(2, '0')}`); save();
    for (const args of [['html'], ['capture', attemptDir]]) {
      const r = spawnSync('node', [PREVIEW_MJS, ...args], { cwd: ROOT, encoding: 'utf8' });
      appendFileSync(join(RUN, 'loop.log'), r.stdout + r.stderr);
      if (r.status !== 0) { log(`preview ${args[0]} failed: ${(r.stderr || r.stdout).slice(-800)}`); return false; }
    }
    writeFileSync(join(RUN, 'preview', 'final.json'), JSON.stringify({ version: 12, attempt: attemptDir, indexSha: sha(readFileSync(join(attemptDir, 'index.json'))), at: new Date().toISOString() }, null, 2) + '\n');
    const t = journal().tasks.find(x => x.id === GATE_ID);
    if (t.status === 'pending') runMjs('start', GATE_ID);
    const check = runMjs('check', GATE_ID, 'ac');
    commitRun('preview gate');
    if (check.status === 0) { log('preview gate APPROVED'); return true; }
    runMjs('invalidate', GATE_ID, 'awaiting human approval');
    console.log(`\n=== 사용자 확인 필요 ===\n${attemptDir}/*.png 를 열어 보고 docs/v0.12/RAID_ART.md 에\n  approved: ${sha(readFileSync(join(attemptDir, 'index.json')))} by <이름> at ${new Date().toISOString()}\n또는 rejected: <같은 sha> reason: <이유> lanes: <V12-05a,...> 를 추가한 뒤 다시 실행하세요.\n`);
    return false;
  }
  function freeze() {  // stage B end: every AC + one gates receipt at the frozen source, then verify the whole graph
    state.freezes += 1; save(); log(`freeze ${state.freezes}: re-checking every AC at ${git(['rev-parse', '--short', 'HEAD']).trim()}`);
    const order = topoOrder(config.tasks), last = order.at(-1), failed = [];
    for (const id of order.filter(i => i !== last)) if (runMjs('check', id, 'ac').status !== 0) failed.push(id);
    if (!failed.length && runMjs('check', order[0], 'gates').status !== 0) failed.push('gates');
    if (failed.length) { for (const id of failed.filter(i => i !== 'gates')) runMjs('invalidate', id, `freeze ${state.freezes}: AC failed`); log(`freeze failed: ${failed.join(' ')}`); return false; }
    for (const id of order.filter(i => i !== last)) if (runMjs('verify', id).status !== 0) { failed.push(id); break; }
    if (failed.length) { log(`verify failed: ${failed.join(' ')}`); return false; }
    if (runMjs('check', last, 'ac').status !== 0 || runMjs('check', last, 'gates').status !== 0 || runMjs('verify', last).status !== 0) { runMjs('invalidate', last, `freeze ${state.freezes}: final check failed`); return false; }
    return true;
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  (async () => {
    if (STAGE === 'B') {
      const gate = journal().tasks.find(t => t.id === GATE_ID);
      if (!['implemented', 'verified'].includes(gate.status) && !runGate()) process.exit(HUMAN_EXIT);
    }
    handleRejection();
    for (;;) {
      for (const lane of [...lanes.values()]) if (lane.done) collect(lane);
      const j = journal(), stageIds = stageTasks(config, STAGE).map(t => t.id);
      const ready = readyIds().filter(id => !taskOf(id).human);
      const gateReady = readyIds().includes(GATE_ID);
      if (gateReady && !lanes.size) { if (!runGate()) { if (!ready.length) process.exit(HUMAN_EXIT); } }
      for (const id of ready) { if (lanes.size >= LANES) break; if (state.dispatched >= MAX_ITER) break; dispatch(id); }
      if (!lanes.size && !ready.length) {
        const open = stageIds.filter(id => !['implemented', 'verified'].includes(j.tasks.find(t => t.id === id).status));
        if (!open.length || (STAGE === 'A' && open.every(id => id === GATE_ID))) {
          if (STAGE === 'A') { const g = journal().tasks.find(t => t.id === GATE_ID); process.exit(['implemented', 'verified'].includes(g.status) ? 0 : (runGate() ? 0 : HUMAN_EXIT)); }
          if (freeze()) { commitRun('freeze verified'); log('CONVERGED: every task verified at the frozen source'); process.exit(0); }
          if (state.freezes >= MAX_FREEZES) { log('freeze cap reached'); process.exit(4); }
          continue;
        }
        if (state.dispatched >= MAX_ITER) { log('iteration cap'); process.exit(1); }
        const blocked = j.tasks.filter(t => t.status === 'blocked').map(t => t.id);
        log(`no dispatchable task; open=${open.join(' ')} blocked=${blocked.join(' ') || 'none'}`); commitRun('loop stopped'); process.exit(blocked.length ? 2 : 4);
      }
      await sleep(Number(process.env.POLL_MS ?? POLL_MS));
    }
  })().catch(error => { log('FATAL ' + (error.stack || error)); process.exit(70); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
