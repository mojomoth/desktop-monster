#!/usr/bin/env node
// Explicitly scoped live check: two fresh synthetic accounts, one own-target battle.
import { randomBytes } from 'node:crypto';
import { fork } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { ROOT, manifest, digestManifest, sha256 } from '../v7/loop/evidence.mjs';

export const ORIGIN = 'https://desmon-server-v3.onrender.com';
const SCRIPT = fileURLToPath(import.meta.url), TIMEOUT_MS = 30_000, REQUEST_INTERVAL_MS = 1550;
const HERO = { formId: 'h00', buffPercent: 0 };
const same = isDeepStrictEqual;
class CheckFailure extends Error {}
const requireThat = (condition, code) => { if (!condition) throw new CheckFailure(code); };
const failure = error => error instanceof CheckFailure ? error.message : 'UNEXPECTED_ERROR_REDACTED';
const stamp = () => new Date().toISOString();
const fileHash = path => sha256(readFileSync(path));
const sleep = milliseconds => new Promise(done => setTimeout(done, milliseconds));

export function snapshot(account, empty = false) {
  return { name: account.name, bestIndex: 0, rebirths: 0,
    companions: empty ? [] : [{ id: 'c1', speciesId: 'slime', bossIndex: 7, level: account.level, stars: 0 }],
    party: [], hero: { ...HERO } };
}

/** Pure authorization check. Only this invocation's credentials and known own IDs are accepted. */
export function guardRequest(input, init, scope) {
  const url = new URL(String(input)), method = init.method ?? 'GET', route = `${method} ${url.pathname}`;
  requireThat(url.origin === ORIGIN && !url.username && !url.password && !url.hash && !url.search, 'ORIGIN_OR_QUERY_GUARD');
  requireThat(['GET /healthz', 'POST /v1/players', 'PUT /v1/snapshot', 'POST /v1/pvp/match',
    'POST /v1/pvp', 'GET /v1/thefts', 'POST /v1/reclaim'].includes(route), 'ROUTE_GUARD');
  const headers = new Headers(init.headers);
  if (route === 'GET /healthz') {
    requireThat(!headers.has('authorization'), 'HEALTH_AUTH_GUARD');
    return { route };
  }
  requireThat(scope.healthPinned, 'HEALTH_PIN_GUARD');
  const body = init.body === undefined ? undefined : JSON.parse(init.body);
  if (route === 'POST /v1/players') {
    requireThat(!headers.has('authorization') && scope.registrations < 2 &&
      same(body, { nickname: scope.names[scope.registrations] }), 'FRESH_REGISTRATION_GUARD');
    return { route, body };
  }
  const owner = scope.accounts.find(account => headers.get('authorization') === `Bearer ${account.token}`);
  requireThat(owner, 'FRESH_CREDENTIAL_GUARD');
  if (route === 'PUT /v1/snapshot') {
    requireThat(scope.phase === 'initial' && same(body, snapshot(owner)) && !scope.uploaded.has(owner.playerId) ||
      scope.phase === 'cleanup' && same(body, snapshot(owner, true)), 'SNAPSHOT_PHASE_AND_SCORE_GUARD');
  } else if (route === 'POST /v1/pvp/match') {
    requireThat(body && Object.keys(body).length === 1 && scope.accounts.some(account =>
      account !== owner && account.playerId === body.opponentId), 'OWN_SPECIFIED_OPPONENT_GUARD');
  } else if (route === 'POST /v1/pvp') {
    const match = scope.matches.get(body?.matchId);
    requireThat(!scope.battleAttempted && scope.phase === 'battle' && owner.label === 'A' &&
      same(Object.keys(body ?? {}).sort(), ['matchId', 'party']) && same(body.party, []) && match?.ownerId === owner.playerId &&
      scope.accounts.some(account => account.label === 'B' && account.playerId === match.targetId) &&
      match.predictedWinAndSteal === true, 'OWN_PREDICTED_BATTLE_GUARD');
  } else if (route === 'POST /v1/reclaim') {
    const theft = scope.allowedThefts.get(body?.theftId);
    requireThat(body && Object.keys(body).length === 1 && theft?.ownerId === owner.playerId && owner.label === 'B' &&
      scope.accounts.some(account => account.label === 'A' && account.playerId === theft.thiefId), 'OWN_THEFT_GUARD');
  }
  return { route, owner, body };
}

function bindings() {
  const files = { ...manifest(['src/core', 'dist/electron']) };
  for (const path of [relative(ROOT, SCRIPT), 'src/main/net.ts', 'src/main/identity.ts', 'src/shared/api.ts', 'package.json']) {
    files[path] = fileHash(resolve(ROOT, path));
  }
  return { files, sha256: digestManifest(files) };
}

async function health() {
  const response = await fetch(`${ORIGIN}/healthz`, { redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
  const result = await response.json();
  requireThat(response.status === 200 && result.ok === true && /^[0-9a-f]{40}$/.test(result.sha), 'HEALTH_UNAVAILABLE');
  return { origin: ORIGIN, sha: result.sha, observedAt: stamp() };
}

async function execute(expectedSha, output) {
  requireThat(/^[0-9a-f]{40}$/.test(expectedSha ?? ''), 'EXACT_DEPLOYED_SHA_REQUIRED');
  const out = resolve(output), allowedRoot = resolve(ROOT, '.agentdoc/v08-20260914T050544Z/online');
  requireThat(dirname(out) === allowedRoot && /^attempt\d+$/.test(out.split('/').at(-1)) && !existsSync(out), 'NEW_ATTEMPT_DIRECTORY_REQUIRED');
  const before = bindings();
  const { createNetClient, createNetSession } = await import(pathToFileURL(resolve(ROOT, 'dist/electron/main/net.js')).href);
  const core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
  mkdirSync(allowedRoot, { recursive: true, mode: 0o700 });
  mkdirSync(out, { mode: 0o700 });
  const originalUmask = process.umask(0o077), privateDir = resolve(out, 'private');
  mkdirSync(privateDir, { mode: 0o700 });
  const eventsPath = resolve(out, 'events.ndjson');
  writeFileSync(eventsPath, '', { flag: 'wx', mode: 0o600 });
  const report = { version: 8, kind: 'own-account-live-online-check', startedAt: stamp(), endedAt: null, status: 'RUNNING',
    origin: ORIGIN, expectedDeployedSha: expectedSha, bindingsBefore: before, checks: [], requests: [], accounts: [], cleanup: [],
    selection: { maximumOwnSeedPreviews: 40, actualSeedPreviews: 0, predictedWinningStealOnly: true, battleRequests: 0 },
    limits: { requestIntervalMs: REQUEST_INTERVAL_MS, timeoutMs: TIMEOUT_MS, noLeaderboardOrDirectory: true,
      noUploadsBetweenBattleAndReclaim: true, clientRecreation: 'Actual createNetSession in fresh Node child processes reading isolated identity.json. Guarded HTTP transport is proxied by parent; not native Electron or server restart.' },
    processRestarts: [],
    retention: { tokensInReportsOrLogs: false, temporaryIdentityTokens: 'Authorized0700 directories/0600 identity.json; deleted in finally.', accountRowsRemain: true, deleteApiAvailable: false,
      successfulBattleStatisticsRemain: 'One attacker win and victim loss on the two synthetic rows if the battle succeeds.',
      pendingUnfoughtMatches: 'Expire after120seconds with lazy pruning.', staleStolenIdMarkersMayRemainOnOwnAccounts: true }, failure: null };
  const scope = { healthPinned: false, registrations: 0, phase: 'initial', accounts: [],
    names: [`v8p-${randomBytes(4).toString('hex')}-a`, `v8p-${randomBytes(4).toString('hex')}-b`],
    uploaded: new Set(), matches: new Map(), allowedThefts: new Map(), battleAttempted: false };
  const event = value => appendFileSync(eventsPath, `${JSON.stringify({ at: stamp(), ...value })}\n`);
  const check = (id, passed, details = {}) => {
    const row = { id, passed, ...details }; report.checks.push(row); event({ check: row }); requireThat(passed, id);
  };
  let lastRequest = -Infinity, clientGeneration = 0;
  const guardedFetch = async (input, init = {}) => {
    const allowed = guardRequest(input, init, scope);
    if (allowed.route === 'POST /v1/players') scope.registrations++;
    if (allowed.route === 'POST /v1/pvp') { scope.battleAttempted = true; report.selection.battleRequests++; }
    if (allowed.route === 'PUT /v1/snapshot' && scope.phase === 'initial') scope.uploaded.add(allowed.owner.playerId);
    await sleep(Math.max(0, lastRequest + REQUEST_INTERVAL_MS - performance.now()));
    lastRequest = performance.now();
    const row = { route: allowed.route, owner: allowed.owner?.label ?? null, phase: scope.phase,
      clientGeneration, startedAt: stamp(), status: null };
    report.requests.push(row);
    try {
      const response = await fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(TIMEOUT_MS) });
      row.status = response.status; return response;
    } finally { row.endedAt = stamp(); event({ request: row }); }
  };
  const client = () => { clientGeneration++; return createNetClient({ baseUrl: ORIGIN, fetchFn: guardedFetch, timeoutMs: TIMEOUT_MS }); };
  let clients = { A: client(), B: client() };
  let sessions = {};
  const recreateSessions = () => {
    sessions = Object.fromEntries(scope.accounts.map(account => [account.label, createNetSession({
      client: client(), userDataDir: resolve(privateDir, account.label), online: true, randomUUID: () => 'unused-synthetic-fallback',
    })]));
  };
  const success = (result, id) => {
    check(id, result.ok, { error: result.ok ? null : result.error, status: result.status ?? null }); return result.value;
  };
  const preview = async (observer, target, expectedCompanions, id) => {
    const match = success(await sessions[observer.label].match(target.playerId), `${id}-client`);
    const expected = core.pvpParty(expectedCompanions, [], HERO);
    check(id, !match.bot && match.opponent.playerId === target.playerId && match.opponent.name === target.name &&
      match.opponent.bestIndex === 0 && match.opponent.rebirths === 0 && same(match.opponent.hero, HERO) &&
      same(match.opponent.party, expected), { observer: observer.label, target: target.label,
      expectedLevels: expected.map(c => c.level), expectedIds: expected.map(c => c.id) });
    return match;
  };
  const readOwnThefts = async (victim, thief, id) => {
    const value = success(await sessions[victim.label].thefts(), `${id}-client`);
    const owned = value.thefts.filter(theft => theft.thiefId === thief.playerId && theft.thiefName === thief.name &&
      same(theft.companion, snapshot(victim).companions[0]));
    check(id, owned.length === value.thefts.length, { count: value.thefts.length, allWithinOwnScope: owned.length === value.thefts.length });
    for (const theft of owned) scope.allowedThefts.set(theft.id, { ownerId: victim.playerId, thiefId: thief.playerId });
    return owned;
  };
  const restartProcess = async (phase, expectedRosters, expectedTheftId) => {
    const child = fork(SCRIPT, ['--session-child'], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], execArgv: [] });
    let stdoutBytes = 0, stderrBytes = 0, result;
    child.stdout.on('data', data => { stdoutBytes += data.length; });
    child.stderr.on('data', data => { stderrBytes += data.length; });
    const finished = new Promise((resolveChild, rejectChild) => {
      const watchdog = setTimeout(() => { child.kill(); rejectChild(new CheckFailure('CHILD_SESSION_TIMEOUT')); }, 120_000);
      child.on('error', () => { clearTimeout(watchdog); rejectChild(new CheckFailure('CHILD_PROCESS_START_FAILED')); });
      child.on('message', async message => {
        if (message.kind === 'http') {
          try {
            const route = `${message.init?.method ?? 'GET'} ${new URL(message.input).pathname}`;
            requireThat(['POST /v1/pvp/match', 'GET /v1/thefts'].includes(route), 'CHILD_READ_ONLY_ROUTE_GUARD');
            const response = await guardedFetch(message.input, message.init);
            const body = await response.text();
            if (child.connected) child.send({ kind: 'http-result', id: message.id, status: response.status, body });
          } catch { if (child.connected) child.send({ kind: 'http-result', id: message.id, failed: true }); }
        } else if (message.kind === 'result') result = message.result;
      });
      child.on('exit', code => {
        clearTimeout(watchdog);
        if (code === 0 && result?.ok === true) resolveChild(result);
        else rejectChild(new CheckFailure('CHILD_SESSION_RELOAD_FAILED'));
      });
    });
    child.send({ kind: 'start', privateDir, accounts: report.accounts, expectedRosters, expectedTheftId });
    try {
      const reloaded = await finished;
      check(`${phase}-process-reload`, reloaded.pid !== process.pid && reloaded.identities.length === 2 &&
        reloaded.identities.every(identity => identity.tokenReused && identity.playerId === scope.accounts.find(account => account.label === identity.label)?.playerId) &&
        same(reloaded.identities.find(identity => identity.label === 'A').history, { wins: 1, losses: 0 }) &&
        same(reloaded.identities.find(identity => identity.label === 'B').history, { wins: 0, losses: 0 }),
      { childPid: reloaded.pid, parentPid: process.pid });
      report.processRestarts.push({ phase, ...reloaded, stdoutBytes, stderrBytes });
    } finally { if (child.exitCode === null) child.kill(); }
  };
  let a, b;
  try {
    const response = await guardedFetch(`${ORIGIN}/healthz`), current = await response.json();
    check('health-exact-pinned-sha', response.status === 200 && current.ok === true && current.sha === expectedSha,
      { observedSha: /^[0-9a-f]{40}$/.test(current.sha ?? '') ? current.sha : null });
    scope.healthPinned = true;
    for (const [index, label] of ['A', 'B'].entries()) {
      const registered = success(await clients[label].register(scope.names[index]), `register-${label}`);
      check(`fresh-credential-shape-${label}`, /^[0-9a-f-]{36}$/.test(registered.playerId ?? '') && /^[0-9a-f]{32}$/.test(registered.token ?? '') &&
        !scope.accounts.some(account => account.playerId === registered.playerId || account.token === registered.token));
      const account = { ...registered, label, name: scope.names[index], level: label === 'A' ? 250 : 11 };
      scope.accounts.push(account);
      const userDataDir = resolve(privateDir, label);
      mkdirSync(userDataDir, { mode: 0o700 });
      writeFileSync(resolve(userDataDir, 'identity.json'), JSON.stringify({ name: account.name, playerId: account.playerId,
        token: account.token, notifiedTheftIds: [], pvpHistory: { wins: 0, losses: 0, matchIds: [] } }), { flag: 'wx', mode: 0o600 });
      report.accounts.push({ label, playerId: account.playerId, name: account.name, initialLevel: account.level });
      event({ account: report.accounts.at(-1) });
      const uploaded = success(await clients[label].upload(account.token, snapshot(account)), `initial-upload-${label}`);
      check(`initial-upload-clean-${label}`, uploaded.removed.length === 0 && uploaded.thefts.length === 0);
    }
    recreateSessions();
    [a, b] = scope.accounts;
    await preview(b, a, snapshot(a).companions, 'initial-A-server-preview');
    let selected, predicted;
    for (let attempt = 1; attempt <= 40; attempt++) {
      const match = await preview(a, b, snapshot(b).companions, `own-seed-preview-${attempt}`);
      report.selection.actualSeedPreviews++;
      const verdict = core.resolvePvp(core.pvpParty(snapshot(a).companions, [], HERO), match.opponent.party,
        core.mulberry32(match.seed), 1, { attacker: HERO, defender: match.opponent.hero });
      scope.matches.set(match.matchId, { ownerId: a.playerId, targetId: b.playerId,
        predictedWinAndSteal: verdict.attackerWon && verdict.moved?.id === 'c1' });
      if (verdict.attackerWon && verdict.moved?.id === 'c1') { selected = match; predicted = verdict; break; }
    }
    check('own-winning-steal-seed-found', !!selected, { previews: report.selection.actualSeedPreviews });
    scope.phase = 'battle';
    const battle = success(await sessions.A.pvp(selected.matchId, []), 'one-actual-own-battle-client');
    const expectedBlows = predicted.blows.map(blow => ({ ...blow, damage: String(blow.damage) }));
    check('actual-battle-equals-local-resolver', battle.bot === false && battle.win === true && battle.seed === selected.seed &&
      battle.opponent.playerId === b.playerId && same(battle.opponent.party, selected.opponent.party) &&
      same(battle.blows, expectedBlows) && battle.lost === null && !!battle.stolen &&
      /^s[a-z0-9]+$/.test(battle.stolen.id) && same({ ...battle.stolen, id: 'c1' }, snapshot(b).companions[0]),
    { seed: selected.seed, matchId: selected.matchId, blowCount: battle.blows.length, stolenId: battle.stolen?.id ?? null });
    const stolen = battle.stolen;
    const savedIdentity = JSON.parse(readFileSync(resolve(privateDir, 'A/identity.json'), 'utf8'));
    check('real-session-history-written', battle.historySaved !== false && savedIdentity.token === a.token &&
      savedIdentity.pvpHistory?.wins === 1 && savedIdentity.pvpHistory?.losses === 0 &&
      same(savedIdentity.pvpHistory?.matchIds, [selected.matchId]) &&
      (statSync(resolve(privateDir, 'A/identity.json')).mode & 0o777) === 0o600);
    scope.phase = 'post-battle';
    const attackerRoster = [...snapshot(a).companions, stolen];
    await preview(a, b, [], 'victim-empty-without-upload');
    await preview(b, a, attackerRoster, 'attacker-holds-stolen-without-upload');
    recreateSessions();
    await preview(a, b, [], 'new-client-victim-remains-empty');
    await preview(b, a, attackerRoster, 'new-client-attacker-retains-stolen');
    const thefts = await readOwnThefts(b, a, 'victim-own-theft-inbox');
    check('theft-matches-actual-transfer', thefts.length === 1 && thefts[0].transferredId === stolen.id &&
      thefts[0].reclaimUntil > Date.now(), { count: thefts.length });
    await restartProcess('post-battle', { A: attackerRoster, B: [] }, thefts[0].id);
    const reclaimed = success(await sessions.B.reclaim(thefts[0].id), 'victim-reclaims-own-theft-client').companion;
    check('reclaimed-companion-preserves-level', /^r[a-z0-9]+$/.test(reclaimed.id) &&
      same({ ...reclaimed, id: 'c1' }, snapshot(b).companions[0]), { reclaimedId: reclaimed.id, level: reclaimed.level });
    scope.phase = 'post-reclaim';
    await preview(b, a, snapshot(a).companions, 'attacker-transfer-removed-after-reclaim');
    await preview(a, b, [reclaimed], 'victim-reclaimed-roster-after-reclaim');
    recreateSessions();
    await preview(b, a, snapshot(a).companions, 'second-new-client-attacker-state');
    await preview(a, b, [reclaimed], 'second-new-client-victim-state');
    check('own-theft-inbox-empty-after-reclaim', (await readOwnThefts(b, a, 'post-reclaim-inbox')).length === 0);
    await restartProcess('post-reclaim', { A: snapshot(a).companions, B: [reclaimed] }, null);
    check('no-upload-masked-server-moves', report.requests.filter(request => request.route === 'PUT /v1/snapshot').length === 2);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.failure = failure(error); event({ failure: report.failure });
  } finally {
    scope.phase = 'cleanup';
    if (scope.accounts.length && Object.keys(sessions).length !== scope.accounts.length) recreateSessions();
    if (a && b) {
      try {
        // An ambiguous battle/reclaim response may still have committed. Resolve only this pair's records before emptying rosters.
        const remaining = await readOwnThefts(b, a, 'cleanup-own-thefts');
        for (const theft of remaining) {
          const result = await sessions.B.reclaim(theft.id);
          check('cleanup-owned-reclaim', result.ok || result.status === 409 || result.status === 410,
            { theftId: theft.id, result: result.ok ? 'reclaimed' : result.error });
        }
      } catch (error) { report.cleanup.push({ action: 'own-theft-cleanup', status: 'FAIL', failure: failure(error) }); report.status = 'FAIL'; }
    }
    for (const account of scope.accounts) {
      try {
        const value = success(await clients[account.label].upload(account.token, snapshot(account, true)), `cleanup-empty-${account.label}-client`);
        check(`cleanup-empty-${account.label}`, value.removed.length === 0 && value.thefts.length === 0);
        report.cleanup.push({ label: account.label, emptySnapshot: 'PASS' });
      } catch (error) { report.cleanup.push({ label: account.label, emptySnapshot: 'FAIL', failure: failure(error) }); report.status = 'FAIL'; }
    }
    if (scope.accounts.length === 2) {
      const [first, second] = scope.accounts;
      for (const [observer, target] of [[first, second], [second, first]]) {
        try { await preview(observer, target, [], `cleanup-server-empty-${target.label}`); report.cleanup.push({ label: target.label, emptyReadback: 'PASS' }); }
        catch (error) { report.cleanup.push({ label: target.label, emptyReadback: 'FAIL', failure: failure(error) }); report.status = 'FAIL'; }
      }
    }
    if (scope.healthPinned) {
      try {
        const response = await guardedFetch(`${ORIGIN}/healthz`), current = await response.json();
        check('health-end-same-sha', response.status === 200 && current.ok === true && current.sha === expectedSha);
      } catch (error) { report.status = 'FAIL'; event({ healthEndFailure: failure(error) }); }
    }
    try { report.bindingsAfter = bindings(); check('compiled-client-bindings-unchanged', same(before, report.bindingsAfter)); }
    catch (error) { report.status = 'FAIL'; event({ bindingFailure: failure(error) }); }
    try {
      requireThat(dirname(privateDir) === out, 'PRIVATE_CLEANUP_PATH_GUARD');
      rmSync(privateDir, { recursive: true });
      check('temporary-identity-directories-removed', !existsSync(privateDir));
      report.retention.temporaryIdentityDirectoriesRemoved = true;
    } catch (error) { report.status = 'FAIL'; report.retention.temporaryIdentityDirectoriesRemoved = false; event({ privateCleanupFailure: failure(error) }); }
    process.umask(originalUmask);
    report.createdAccounts = scope.accounts.length;
    report.possibleUnidentifiedAccounts = scope.registrations - scope.accounts.length;
    report.registrationRequests = scope.registrations;
    report.endedAt = stamp();
    event({ completion: { status: report.status, endedAt: report.endedAt } });
    report.eventsSha256 = fileHash(eventsPath);
    const reportPath = resolve(out, 'report.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    writeFileSync(resolve(out, 'SHA256SUMS'), `${fileHash(reportPath)}  report.json\n${report.eventsSha256}  events.ndjson\n`, { flag: 'wx', mode: 0o600 });
    scope.accounts.forEach(account => { account.token = ''; });
    console.log(JSON.stringify({ status: report.status, report: reportPath, sha256: fileHash(reportPath),
      checks: report.checks.length, requests: report.requests.length, createdAccounts: report.createdAccounts,
      temporaryIdentitiesRemoved: report.retention.temporaryIdentityDirectoriesRemoved, tokensInReportsOrLogs: false }));
  }
  return report.status === 'PASS' ? 0 : 1;
}

/** Fresh Node process: credentials come only from this attempt's isolated identity files. */
async function sessionChild() {
  requireThat(typeof process.send === 'function', 'CHILD_REQUIRES_PARENT_IPC');
  process.umask(0o077);
  const pending = new Map();
  let nextId = 0;
  process.on('message', message => {
    if (message.kind !== 'http-result') return;
    const resolveReply = pending.get(message.id);
    if (!resolveReply) return;
    pending.delete(message.id); resolveReply(message);
  });
  const configuration = await new Promise(done => {
    const start = message => { if (message.kind === 'start') { process.off('message', start); done(message); } };
    process.on('message', start);
  });
  try {
    const allowedRoot = resolve(ROOT, '.agentdoc/v08-20260914T050544Z/online');
    requireThat(configuration.privateDir === resolve(configuration.privateDir) && dirname(dirname(configuration.privateDir)) === allowedRoot &&
      /^attempt\d+$/.test(dirname(configuration.privateDir).split('/').at(-1)) &&
      configuration.privateDir.endsWith('/private') && configuration.accounts.length === 2 &&
      same(configuration.accounts.map(account => account.label).sort(), ['A', 'B']), 'CHILD_PRIVATE_SCOPE_GUARD');
    const { createNetClient, createNetSession } = await import(pathToFileURL(resolve(ROOT, 'dist/electron/main/net.js')).href);
    const core = await import(pathToFileURL(resolve(ROOT, 'dist/electron/core/index.js')).href);
    const identities = [], sessions = {};
    const fetchProxy = async (input, init = {}) => {
      const id = ++nextId;
      requireThat(id <= 3, 'CHILD_REQUEST_BUDGET');
      const reply = new Promise(done => pending.set(id, done));
      process.send({ kind: 'http', id, input: String(input), init: { method: init.method,
        headers: Object.fromEntries(new Headers(init.headers)), body: init.body } });
      const response = await reply;
      requireThat(!response.failed, 'CHILD_GUARDED_TRANSPORT_FAILED');
      return new Response(response.body, { status: response.status, headers: { 'content-type': 'application/json' } });
    };
    for (const account of configuration.accounts) {
      requireThat(['A', 'B'].includes(account.label), 'CHILD_ACCOUNT_LABEL_GUARD');
      const userDataDir = resolve(configuration.privateDir, account.label), identityPath = resolve(userDataDir, 'identity.json');
      const stored = JSON.parse(readFileSync(identityPath, 'utf8'));
      requireThat(stored.playerId === account.playerId && stored.name === account.name && /^[0-9a-f]{32}$/.test(stored.token ?? '') &&
        (statSync(userDataDir).mode & 0o777) === 0o700 && (statSync(identityPath).mode & 0o777) === 0o600, 'CHILD_IDENTITY_BINDING_GUARD');
      const session = createNetSession({ client: createNetClient({ baseUrl: ORIGIN, fetchFn: fetchProxy, timeoutMs: TIMEOUT_MS }),
        userDataDir, online: true, randomUUID: () => 'unused-child-fallback' });
      sessions[account.label] = session;
      const payload = session.identity();
      requireThat(payload.playerId === account.playerId && payload.name === account.name, 'CHILD_SESSION_IDENTITY_RELOAD');
      identities.push({ label: account.label, playerId: payload.playerId, name: payload.name, history: session.pvpHistory(), tokenReused: false });
    }
    for (const [observerLabel, targetLabel] of [['A', 'B'], ['B', 'A']]) {
      const target = configuration.accounts.find(account => account.label === targetLabel);
      const result = await sessions[observerLabel].match(target.playerId);
      requireThat(result.ok && !result.value.bot && result.value.opponent.playerId === target.playerId &&
        result.value.opponent.name === target.name && result.value.opponent.bestIndex === 0 && result.value.opponent.rebirths === 0 &&
        same(result.value.opponent.hero, HERO) && same(result.value.opponent.party, core.pvpParty(configuration.expectedRosters[targetLabel], [], HERO)),
      'CHILD_OWN_PREVIEW_STATE');
      identities.find(identity => identity.label === observerLabel).tokenReused = true;
    }
    const inbox = await sessions.B.thefts();
    requireThat(inbox.ok, 'CHILD_OWN_THEFT_READ');
    const attacker = configuration.accounts.find(account => account.label === 'A');
    requireThat(configuration.expectedTheftId === null ? inbox.value.thefts.length === 0 :
      inbox.value.thefts.length === 1 && inbox.value.thefts[0].id === configuration.expectedTheftId &&
      inbox.value.thefts[0].thiefId === attacker.playerId && inbox.value.thefts[0].thiefName === attacker.name, 'CHILD_OWN_THEFT_STATE');
    process.send({ kind: 'result', result: { ok: true, pid: process.pid, identities, previewsVerified: 2,
      theftCount: inbox.value.thefts.length, registrationRequests: 0, uploadRequests: 0 } });
    process.disconnect();
    return 0;
  } catch {
    process.send({ kind: 'result', result: { ok: false, failure: 'CHILD_SESSION_CHECK_FAILED_REDACTED' } });
    process.disconnect(); return 1;
  }
}

async function main(args) {
  const { values } = parseArgs({ args, options: { execute: { type: 'boolean' }, health: { type: 'boolean' }, 'session-child': { type: 'boolean' },
    'expected-sha': { type: 'string' }, out: { type: 'string' } } });
  if (values['session-child']) return sessionChild();
  if (values.health && !values.execute) { console.log(JSON.stringify(await health())); return 0; }
  if (!values.execute || !values['expected-sha'] || !values.out) {
    console.log('PREPARED_NOT_EXECUTED. Use --health; then --execute --expected-sha <40hex> --out <new online/attemptNN directory>.'); return 2;
  }
  return execute(values['expected-sha'], values.out);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(() => {
    console.error('ONLINE_PRECHECK_OR_REPORT_FAILURE_REDACTED'); process.exitCode = 1;
  });
}
