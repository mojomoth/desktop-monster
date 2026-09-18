// Ordered review of v0.9.1 evidence; Host writes this journal, each role writes its own response.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { digest } from './run.mjs';
const roles = ['Designer', 'Critic', 'Balance', 'Playtester'];
const agents = ['/root/designer', '/root/critic', '/root/balance', '/root'];
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
export function pointer(value, path) {
  if (path === '') return value;
  assert(typeof path === 'string' && path.startsWith('/'), 'JSON Pointer required');
  for (const key of path.slice(1).split('/').map(x => x.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    assert(value !== null && typeof value === 'object' && Object.hasOwn(value, key), 'Missing evidence pointer');
    value = value[key];
  }
  return value;
}
export function validateReview(review, request, evidence) {
  assert(review.role === request.role && review.agentId === request.agentId && review.requestId === request.requestId, 'Role, agent or request mismatch');
  assert(['pass', 'blocked'].includes(review.verdict), 'Explicit verdict required');
  assert(Array.isArray(review.findings) && review.findings.length > 0 && review.findings.every(x => typeof x === 'string' && x.length > 0), 'Findings required');
  assert(Array.isArray(review.pending) && review.pending.every(x => typeof x === 'string'), 'Pending boundaries required');
  assert(Array.isArray(review.evidence) && review.evidence.length > 0, 'Evidence references required');
  for (const ref of review.evidence) { assert(Object.hasOwn(evidence, ref.report), 'Unknown evidence report'); pointer(evidence[ref.report], ref.pointer); }
}
function main() {
  const [action, directory, ...args] = process.argv.slice(2), dir = resolve(directory ?? '.');
  assert(directory, 'Usage: audit.mjs init DIR REPORT... | next DIR | submit DIR RESPONSE | report DIR');
  const path = join(dir, 'audit.json');
  const write = value => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
  if (action === 'init') {
    assert(args.length >= 2 && !existsSync(path), 'New audit and native/balance evidence required');
    const reports = Object.fromEntries(args.map((p, i) => [String(i), { path: resolve(p), hash: hash(p) }]));
    for (const [id, report] of Object.entries(reports)) {
      const value = read(report.path);
      assert(typeof value.passed === 'boolean', 'Explicit evidence status required');
      if (Number(id) < 2) assert(value.passed, 'Native and balance evidence must pass');
    }
    mkdirSync(dir, { recursive: true });
    write({ version: 91, source: digest(), reports, responses: [], request: null }); return;
  }
  const state = read(path);
  assert(state.source === digest(), 'Source changed after audit began');
  for (const report of Object.values(state.reports)) assert(hash(report.path) === report.hash, 'Evidence changed');
  for (const response of state.responses) assert(hash(response.path) === response.hash, 'Role response changed');
  if (action === 'next') {
    assert(state.responses.length < 4, 'Review already complete');
    state.request ??= { role: roles[state.responses.length], agentId: agents[state.responses.length], requestId: randomUUID() };
    write(state);
    console.log(JSON.stringify({ ...state.request, reports: state.reports,
      priorReviews: state.responses.map(r => read(r.path)),
      template: { ...state.request, verdict: 'pass|blocked', findings: [], pending: [], evidence: [{ report: '0', pointer: '/passed' }] } }, null, 2)); return;
  }
  if (action === 'submit') {
    assert(state.request && args[0], 'Request and response required');
    const responsePath = resolve(args[0]), response = read(responsePath);
    validateReview(response, state.request, Object.fromEntries(Object.entries(state.reports).map(([id, report]) => [id, read(report.path)])));
    state.responses.push({ path: responsePath, hash: hash(responsePath) }); state.request = null; write(state); return;
  }
  assert(action === 'report' && state.responses.length === 4, 'All four ordered reviews required');
  const reviews = state.responses.map(r => read(r.path));
  const summary = { version: 91, passed: reviews.every(r => r.verdict === 'pass'), source: state.source,
    reviewOrder: reviews.map(r => ({ role: r.role, agentId: r.agentId, verdict: r.verdict })),
    pending: [...new Set(reviews.flatMap(r => r.pending))], reports: state.reports, responses: state.responses };
  writeFileSync(join(dir, 'report.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2)); if (!summary.passed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) try { main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
