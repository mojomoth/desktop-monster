#!/usr/bin/env node
// plan.mjs — IMPLEMENTATION_PLAN.md toolkit for harness v2 (node ESM, no deps).
// The orchestrator is the plan file's SINGLE writer; workers never edit it.
//
//   node plan.mjs ready      [--plan P]            READY=<ids> + INFO lines (dispatchable, pairwise file-disjoint)
//   node plan.mjs open       [--plan P]            headings of [ ] [~] [!] tasks
//   node plan.mjs block <id> [--plan P]            full task block
//   node plan.mjs info  <id> [--plan P]            shell-evalable STATUS= WORKER= TITLE= FILES= DEPS=
//   node plan.mjs set-status <id> <char|word>      char: ' ' ~ x ! s   word: todo inprogress done blocked split
//   node plan.mjs note <id> <text> [--label L]     appends "- Notes (L): text" to the task block
//   node plan.mjs log-row <markdown-row>           appends to the Iteration Log table
//   node plan.mjs children <id> <json-file>        inserts child tasks below the parent (Worker inherited)
import { readFileSync, writeFileSync } from 'node:fs';

const HEADING = /^### \[(.)\] (T\d+[a-z]?) [—–-] (.*)$/;
const IGNORED_FILES = new Set(['SPEC.md', 'IMPLEMENTATION_PLAN.md']);
const STATUS_WORDS = { todo: ' ', inprogress: '~', done: 'x', blocked: '!', split: 's' };

function args() {
  const a = process.argv.slice(2);
  const opts = { plan: 'IMPLEMENTATION_PLAN.md', label: '' };
  const rest = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--plan') opts.plan = a[++i];
    else if (a[i] === '--label') opts.label = a[++i];
    else rest.push(a[i]);
  }
  return { opts, rest };
}

function expandBraces(p) {
  const m = /^(.*)\{([^{}]*)\}(.*)$/.exec(p);
  if (!m) return [p];
  return m[2].split(',').flatMap((x) => expandBraces(m[1] + x.trim() + m[3]));
}

function parseFiles(s) {
  const out = [];
  for (const raw of s.split(',')) {
    let f = raw.replace(/\([^)]*\)/g, '').trim().replace(/^\.\//, '');
    if (!f || f === 'none') continue;
    for (const e of expandBraces(f)) {
      const g = e.trim();
      if (g && !IGNORED_FILES.has(g) && !g.startsWith('.agentdoc/')) out.push(g);
    }
  }
  return out;
}

function parsePlan(text) {
  const lines = text.split('\n');
  const tasks = [];
  let cur = null;
  for (let i = 0; i < lines.length; i++) {
    const h = HEADING.exec(lines[i]);
    if (h) {
      cur = { status: h[1], id: h[2], title: h[3], start: i, end: lines.length, fields: {} };
      tasks.push(cur);
      continue;
    }
    if (cur && /^## /.test(lines[i])) { cur.end = i; cur = null; continue; }
    if (cur) {
      const f = /^- (AC|Deps|Worker|Files|Notes)\b[^:]*:\s?(.*)$/.exec(lines[i]);
      if (f && !(f[1] in cur.fields)) cur.fields[f[1]] = f[2].trim();
    }
  }
  for (let k = 0; k + 1 < tasks.length; k++) {
    if (tasks[k].end > tasks[k + 1].start) tasks[k].end = tasks[k + 1].start;
  }
  for (const t of tasks) {
    t.deps = (t.fields.Deps ?? 'none').trim();
    t.depList = t.deps === '' || /^none$/i.test(t.deps) ? [] : t.deps.split(',').map((d) => d.trim()).filter(Boolean);
    t.files = parseFiles(t.fields.Files ?? '');
    t.worker = (t.fields.Worker ?? '').trim().toLowerCase();
  }
  // Split children inherit the parent's Worker when they carry none.
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) {
    if (!t.worker) {
      const parent = /^(T\d+)[a-z]$/.exec(t.id);
      const p = parent && byId.get(parent[1]);
      t.worker = p && p.worker ? p.worker : 'claude';
      if (!p || !p.worker) t.workerDefaulted = true;
    }
  }
  return { lines, tasks, byId };
}

function shq(s) { return `'${String(s).replace(/'/g, "'\\''")}'`; }

function ready(plan) {
  const { tasks, byId } = plan;
  const claimed = new Set();
  for (const t of tasks) if (t.status === '~') t.files.forEach((f) => claimed.add(f));
  const out = [];
  for (const t of tasks) {
    if (t.status !== ' ') continue;
    let ok = true;
    for (const d of t.depList) {
      const dep = /^T\d+[a-z]?$/.test(d) ? byId.get(d) : undefined;
      if (!dep) { process.stderr.write(`plan.mjs: ${t.id}: unknown dep token "${d}" (treated as unsatisfied)\n`); ok = false; break; }
      if (dep.status !== 'x' && dep.status !== 's') { ok = false; break; }
    }
    if (!ok) continue;
    if (t.files.some((f) => claimed.has(f))) continue;
    if (t.workerDefaulted) process.stderr.write(`plan.mjs: ${t.id}: missing "- Worker:" (defaulting to claude)\n`);
    t.files.forEach((f) => claimed.add(f));
    out.push(t);
  }
  return out;
}

function blockText(plan, t) { return plan.lines.slice(t.start, t.end).join('\n').replace(/\n+$/, '') + '\n'; }

function main() {
  const { opts, rest } = args();
  const [cmd, ...rr] = rest;
  const text = readFileSync(opts.plan, 'utf8');
  const plan = parsePlan(text);
  const need = (id) => { const t = plan.byId.get(id); if (!t) { process.stderr.write(`plan.mjs: no task ${id}\n`); process.exit(2); } return t; };
  const save = (lines) => writeFileSync(opts.plan, lines.join('\n'));

  switch (cmd) {
    case 'ready': {
      const r = ready(plan);
      process.stdout.write(`READY=${r.map((t) => t.id).join(' ')}\n`);
      for (const t of r) process.stdout.write(`INFO ${t.id} ${t.worker} ${t.title}\n`);
      return;
    }
    case 'open':
      for (const t of plan.tasks) if (' ~!'.includes(t.status)) process.stdout.write(plan.lines[t.start] + '\n');
      return;
    case 'block':
      process.stdout.write(blockText(plan, need(rr[0])));
      return;
    case 'info': {
      const t = need(rr[0]);
      process.stdout.write(`STATUS=${shq(t.status)}\nWORKER=${shq(t.worker)}\nTITLE=${shq(t.title)}\nFILES=${shq(t.files.join(' '))}\nDEPS=${shq(t.depList.join(' '))}\n`);
      return;
    }
    case 'set-status': {
      const t = need(rr[0]);
      const c = STATUS_WORDS[rr[1]] ?? rr[1];
      if (![' ', '~', 'x', '!', 's'].includes(c)) { process.stderr.write('plan.mjs: bad status\n'); process.exit(2); }
      plan.lines[t.start] = `### [${c}] ${t.id} — ${t.title}`;
      save(plan.lines);
      return;
    }
    case 'note': {
      const t = need(rr[0]);
      const label = opts.label ? ` (${opts.label})` : '';
      const line = `- Notes${label}: ${(rr.slice(1).join(' ') || '').replace(/\s*\n\s*/g, ' ')}`;
      let at = t.end;
      while (at > t.start + 1 && plan.lines[at - 1].trim() === '') at--;
      plan.lines.splice(at, 0, line);
      save(plan.lines);
      return;
    }
    case 'log-row': {
      const row = rr.join(' ');
      let at = -1;
      for (let i = 0; i < plan.lines.length; i++) if (/^## Iteration Log/.test(plan.lines[i])) at = i;
      if (at < 0) { process.stderr.write('plan.mjs: no Iteration Log section\n'); process.exit(2); }
      let last = at;
      for (let i = at + 1; i < plan.lines.length; i++) if (plan.lines[i].startsWith('|')) last = i;
      plan.lines.splice(last + 1, 0, row);
      save(plan.lines);
      return;
    }
    case 'children': {
      const t = need(rr[0]);
      const kids = JSON.parse(readFileSync(rr[1], 'utf8'));
      const blocks = [];
      for (const k of kids) {
        blocks.push('', `### [ ] ${k.id} — ${k.title}`,
          `- AC: ${k.ac}`,
          `- Deps: ${(k.deps && k.deps.length) ? k.deps.join(', ') : 'none'}`,
          `- Worker: ${k.worker || t.worker}`,
          `- Files: ${(k.files || []).join(', ')}`,
          `- Notes: split from ${t.id}`);
      }
      let at = t.end;
      while (at > t.start + 1 && plan.lines[at - 1].trim() === '') at--;
      plan.lines.splice(at, 0, ...blocks);
      save(plan.lines);
      return;
    }
    default:
      process.stderr.write('usage: plan.mjs ready|open|block|info|set-status|note|log-row|children ... [--plan P] [--label L]\n');
      process.exit(2);
  }
}
main();
