import test from 'node:test';
import assert from 'node:assert/strict';
import { pointer, validateReview } from './audit.mjs';
test('ordered review rejects wrong agents, requests and unsupported evidence', () => {
  const request = { role: 'Designer', agentId: '/root/designer', requestId: 'one' };
  const evidence = { '0': { passed: true, checks: [{ passed: true }] } };
  const review = { ...request, verdict: 'pass', findings: ['Observed the field'], pending: ['Human play'], evidence: [{ report: '0', pointer: '/checks/0/passed' }] };
  validateReview(review, request, evidence);
  for (const patch of [{ agentId: '/root' }, { role: 'Critic' }, { requestId: 'old' }, { findings: [] },
    { verdict: 'done' }, { evidence: [{ report: '0', pointer: '/checks/2' }] }, { evidence: [{ report: 'missing', pointer: '' }] }]) {
    assert.throws(() => validateReview({ ...review, ...patch }, request, evidence));
  }
  assert.equal(pointer({ 'a/b': { '~': 1 } }, '/a~1b/~0'), 1);
});
