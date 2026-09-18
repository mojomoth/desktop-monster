import { describe, expect, it } from 'vitest';

const modulePath = '../.harness/v8/online-check.mjs';
const online: { ORIGIN: string; guardRequest: (input: string, init: Record<string, unknown>, scope: Record<string, unknown>) => unknown;
  snapshot: (account: Record<string, unknown>, empty?: boolean) => unknown } = await import(modulePath);
const a = { label: 'A', playerId: 'own-a', token: 'fixture-token-a', name: 'v8-fixture-a', level: 250 };
const b = { label: 'B', playerId: 'own-b', token: 'fixture-token-b', name: 'v8-fixture-b', level: 11 };
const scope = () => ({ healthPinned: true, registrations: 0, phase: 'initial', accounts: [a, b], names: [a.name, b.name],
  uploaded: new Set(), matches: new Map([['known-own-match', { ownerId: a.playerId, targetId: b.playerId, predictedWinAndSteal: true }]]),
  allowedThefts: new Map([['known-own-theft', { ownerId: b.playerId, thiefId: a.playerId }]]), battleAttempted: false });
const request = (path: string, body?: unknown, owner = a) => ({ url: `${online.ORIGIN}${path}`, init: {
  method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${owner.token}` },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
} });

describe('v0.8 own-account live probe authorization', () => {
  it('rejects other origins, broad player data, foreign credentials, and unspecified opponents before transport', () => {
    const match = request('/v1/pvp/match', { opponentId: b.playerId });
    expect(() => online.guardRequest(match.url, match.init, scope())).not.toThrow();
    expect(() => online.guardRequest('https://example.com/v1/pvp/match', match.init, scope())).toThrow('ORIGIN');
    expect(() => online.guardRequest(`${online.ORIGIN}/v1/pvp/opponents`, { method: 'GET' }, scope())).toThrow('ROUTE');
    expect(() => online.guardRequest(match.url, { ...match.init, headers: { authorization: 'Bearer foreign' } }, scope())).toThrow('CREDENTIAL');
    expect(() => online.guardRequest(match.url, { ...match.init, body: '{}' }, scope())).toThrow('OPPONENT');
    expect(() => online.guardRequest(match.url, { ...match.init, body: '{"opponentId":"someone-else"}' }, scope())).toThrow('OPPONENT');
  });

  it('allows one predicted own battle and only the victim own-theft reclaim', () => {
    const battle = request('/v1/pvp', { matchId: 'known-own-match', party: [] });
    expect(() => online.guardRequest(battle.url, battle.init, { ...scope(), phase: 'battle' })).not.toThrow();
    expect(() => online.guardRequest(battle.url, battle.init, { ...scope(), phase: 'battle', battleAttempted: true })).toThrow('BATTLE');
    expect(() => online.guardRequest(battle.url, { ...battle.init, body: '{"matchId":"unknown","party":[]}' }, { ...scope(), phase: 'battle' })).toThrow('BATTLE');
    const reclaim = request('/v1/reclaim', { theftId: 'known-own-theft' }, b);
    expect(() => online.guardRequest(reclaim.url, reclaim.init, scope())).not.toThrow();
    expect(() => online.guardRequest(reclaim.url, { ...reclaim.init, headers: { authorization: `Bearer ${a.token}` } }, scope())).toThrow('THEFT');
    expect(() => online.guardRequest(reclaim.url, { ...reclaim.init, body: '{"theftId":"foreign"}' }, scope())).toThrow('THEFT');
  });

  it('forbids snapshot uploads during server-move verification and permits only empty cleanup at score zero', () => {
    const upload = request('/v1/snapshot', online.snapshot(a));
    upload.init.method = 'PUT';
    expect(() => online.guardRequest(upload.url, upload.init, scope())).not.toThrow();
    expect(() => online.guardRequest(upload.url, upload.init, { ...scope(), phase: 'post-battle' })).toThrow('SNAPSHOT');
    expect(() => online.guardRequest(upload.url, upload.init, { ...scope(), phase: 'cleanup' })).toThrow('SNAPSHOT');
    expect(() => online.guardRequest(upload.url, { ...upload.init, body: JSON.stringify(online.snapshot(a, true)) }, { ...scope(), phase: 'cleanup' })).not.toThrow();
    expect(() => online.guardRequest(upload.url, { ...upload.init, body: '{"name":"v8-fixture-a","bestIndex":1}' }, scope())).toThrow('SNAPSHOT');
  });
});
