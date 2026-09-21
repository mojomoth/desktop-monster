import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStatus, reviseTarget, critiqueVerdict, rejectionTargets, latestApprovalLine, topoOrder, stageTasks, renderTemplate, GATE_ID } from './loop.mjs';
import { parseApproval, SOURCE_GLOBS } from './raid-preview.mjs';
import { config } from './run.mjs';

test('status parsing unwraps the claude envelope, accepts raw codex output and crashes on garbage', () => {
  const raw = '{"task":"V12-05a","result":"DONE","gates":"pass","commit":"none","note":"drew  two\\n variants","children":[]}';
  assert.equal(parseStatus(raw).note, 'drew two variants');
  assert.equal(parseStatus(JSON.stringify({ type: 'result', result: 'text before\n' + raw })).result, 'DONE');
  assert.equal(parseStatus('nothing').result, 'CRASHED');
  assert.equal(parseStatus('{"task":"x","result":"WEIRD"}').result, 'CRASHED');
});
test('critic revision notes, critique verdicts and rejection lines are machine readable', () => {
  assert.equal(reviseTarget('REVISE V12-02: 1. targets fitted'), 'V12-02');
  assert.equal(reviseTarget('blocked by sandbox'), null);
  assert.deepEqual(critiqueVerdict('pick: B\nblocking: 2\n1. jaw'), { pick: 'B', blocking: 2 });
  assert.deepEqual(critiqueVerdict('pick: -\nblocking: none'), { pick: '-', blocking: 0 });
  assert.deepEqual(critiqueVerdict('no verdict'), { pick: null, blocking: null });
  assert.deepEqual(rejectionTargets('rejected: abc reason: too small lanes: V12-05a, V12-07b'), ['V12-05a', 'V12-07b']);
  assert.deepEqual(rejectionTargets('rejected: abc reason: everything'), config.tasks.filter(t => t.art).map(t => t.id));
  assert.equal(latestApprovalLine('x\napproved: a by me at t\nrejected: b reason: r\n'), 'rejected: b reason: r');
  const a = parseApproval('approved: ' + 'a'.repeat(64) + ' by lee at 2026-09-22T00:00:00Z');
  assert.deepEqual([a.kind, a.by, a.at, a.sha.length], ['approved', 'lee', '2026-09-22T00:00:00Z', 64]);
  assert.equal(parseApproval('nothing'), null);
});
test('task graph: stage A ends at the human gate, stage B spans everything, topological order respects dependencies', () => {
  assert.equal(GATE_ID, 'V12-08');
  const a = stageTasks(config, 'A').map(t => t.id);
  assert.ok(a.includes('V12-08') && !a.includes('V12-09'));
  assert.equal(stageTasks(config, 'B').length, config.tasks.length);
  const order = topoOrder(config.tasks);
  for (const t of config.tasks) for (const d of t.dependencies) assert.ok(order.indexOf(d) < order.indexOf(t.id), `${d} before ${t.id}`);
  assert.equal(order.at(-1), 'V12-18');
  assert.throws(() => topoOrder([{ id: 'a', dependencies: ['b'] }, { id: 'b', dependencies: ['a'] }]));
});
test('templates reject unfilled placeholders; preview source set covers the approved surfaces', () => {
  assert.equal(renderTemplate('x {{A}} y', { A: 1 }), 'x 1 y');
  assert.throws(() => renderTemplate('{{A}} {{B}}', { A: 1 }), /unfilled/);
  for (const path of ['src/renderer/raidScene.ts', 'src/menu/raid.ts', 'src/menu/popup.ts', 'static/style.css', 'static/menu.css']) assert.ok(SOURCE_GLOBS.includes(path), path);
});
