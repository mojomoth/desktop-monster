// Prepared by /root/balance. Writes only two fresh synthetic server accounts.
// No request is made unless the Host invokes --execute with an exact deployed SHA.
import console from 'node:console';
import process from 'node:process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const SCRIPT = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT), '../../..');
const RUN = resolve(dirname(SCRIPT), '..');
const ORIGIN = 'https://desmon-server-v3.onrender.com';
const TIMEOUT_MS = 30_000;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileSha = (path) => sha(readFileSync(path));
const stamp = () => new Date().toISOString();
const levels = [11, 250, Number.MAX_SAFE_INTEGER];

class ProbeFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}
const requireThat = (ok, code) => { if (!ok) throw new ProbeFailure(code); };
function bindings() {
  const files = [SCRIPT, ...['src/server/app.ts', 'src/server/pgStore.ts', 'src/server/probe.ts',
    'src/shared/api.ts', 'src/main/net.ts', 'package.json'].map((p) => resolve(ROOT, p))];
  function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, e.name);
      if (e.isDirectory()) walk(path);
      else if (e.isFile() && e.name.endsWith('.js')) files.push(path);
    }
  }
  walk(resolve(ROOT, 'dist/electron'));
  return files.sort().map((p) => ({ path: relative(ROOT, p), sha256: fileSha(p) }));
}
const safeFailure = (e) => e instanceof ProbeFailure ? e.code : 'UNEXPECTED_ERROR_REDACTED';
function snapshot(name, empty = false) {
  const companions = empty ? [] : levels.map((level, i) => ({
    id: `c${i + 1}`, speciesId: ['slime', 'bat', 'ghost'][i], bossIndex: 7, level, stars: 0,
  }));
  return { name, bestIndex: 0, rebirths: 0, companions,
    party: companions.map((c) => c.id), hero: { formId: 'h00', buffPercent: 0 } };
}
function sameOpponent(opponent, account, expected) {
  return opponent.playerId === account.playerId && opponent.name === expected.name &&
    opponent.bestIndex === 0 && opponent.rebirths === 0 &&
    isDeepStrictEqual(opponent.hero, expected.hero) &&
    isDeepStrictEqual(opponent.party, expected.companions);
}

async function execute(expectedSha, outputDir) {
  requireThat(/^[0-9a-f]{40}$/.test(expectedSha), 'EXPECTED_DEPLOY_SHA_REQUIRED');
  const out = resolve(outputDir);
  requireThat(out.startsWith(`${resolve(RUN, 'evidence')}/`), 'OUTPUT_MUST_BE_NEW_RUN_EVIDENCE_DIRECTORY');
  const before = bindings(); // Bind actual compiled client before any network request.
  mkdirSync(out, { recursive: false, mode: 0o700 }); // Refuse an existing output.
  const eventsPath = resolve(out, 'events.ndjson');
  writeFileSync(eventsPath, '', { flag: 'wx', mode: 0o600 });
  const report = {
    schemaVersion: 1, agentId: '/root/balance', startedAt: stamp(), endedAt: null,
    status: 'RUNNING', origin: ORIGIN, expectedDeployedSha: expectedSha, timeoutMs: TIMEOUT_MS,
    scriptSha256: fileSha(SCRIPT), bindingsBefore: before, checks: [], requests: [], accounts: [],
    scope: 'Two fresh synthetic accounts; API/DB-through-server reads, not direct SQL inspection.',
    exclusions: ['battle execution', 'theft', 'reclaim', 'existing credentials', 'personal saves', 'real-user payload logging'],
    retention: { tokens: 'Memory only; never logged or persisted.', deleteApi: false,
      accountRowsRemain: true, interruptedRegistrationMayLeaveUnknownAccount: true,
      cleanup: 'Empty own snapshots at score 0; verify via the other owned account preview.',
      previewCache: 'Unfought match entries expire after 120 seconds; pruning is lazy.' },
    cleanup: [], failure: null,
  };
  const event = (entry) => appendFileSync(eventsPath, `${JSON.stringify({ at: stamp(), ...entry })}\n`);
  const check = (id, passed, detail = {}) => {
    const entry = { id, passed, ...detail };
    report.checks.push(entry); event({ check: entry });
    requireThat(passed, id);
  };
  const accounts = []; // Only credentials returned by this invocation may authorize requests.
  const names = [`v7p-${randomBytes(4).toString('hex')}-a`, `v7p-${randomBytes(4).toString('hex')}-b`];
  let registrations = 0;
  let healthPinned = false;
  let client;
  const guardedFetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? 'GET';
    requireThat(url.origin === ORIGIN && !url.username && !url.password && !url.hash, 'REQUEST_ORIGIN_GUARD');
    const route = `${method} ${url.pathname}`;
    const allowed = ['GET /healthz', 'POST /v1/players', 'PUT /v1/snapshot',
      'GET /v1/leaderboard', 'GET /v1/pvp/opponents', 'POST /v1/pvp/match'];
    requireThat(allowed.includes(route), 'REQUEST_ROUTE_GUARD');
    requireThat(url.search === '' || (route === 'GET /v1/leaderboard' && url.search === '?n=1'), 'REQUEST_QUERY_GUARD');
    const headers = new globalThis.Headers(init.headers);
    let owner;
    if (route === 'GET /healthz') {
      requireThat(!headers.has('authorization'), 'HEALTH_AUTH_GUARD');
    } else {
      requireThat(healthPinned, 'HEALTH_PIN_GUARD');
      if (route === 'POST /v1/players') {
        requireThat(!headers.has('authorization') && registrations < 2, 'REGISTER_LIMIT_GUARD');
        const body = JSON.parse(init.body);
        requireThat(Object.keys(body).length === 1 && body.nickname === names[registrations], 'REGISTER_NAME_GUARD');
        registrations += 1; // Never retry an ambiguous registration.
      } else {
        owner = accounts.find((a) => headers.get('authorization') === `Bearer ${a.token}`);
        requireThat(!!owner, 'FRESH_CREDENTIAL_GUARD');
        if (route === 'POST /v1/pvp/match') {
          const body = JSON.parse(init.body);
          requireThat(Object.keys(body).length === 1 && accounts.some((a) =>
            a !== owner && a.playerId === body.opponentId), 'OWNED_SPECIFIED_OPPONENT_GUARD');
        }
      }
    }
    const entry = { route, owner: owner?.label ?? null, startedAt: stamp(), status: null };
    report.requests.push(entry);
    try {
      // Disallow redirects so an Authorization header cannot escape the fixed origin.
      const response = await globalThis.fetch(url, { ...init, redirect: 'error',
        signal: globalThis.AbortSignal.timeout(TIMEOUT_MS) });
      entry.status = response.status;
      return response;
    } finally {
      entry.endedAt = stamp(); event({ request: entry }); // Never body, headers, or error strings.
    }
  };
  function success(result, id) {
    check(id, result.ok, { error: result.ok ? null : result.error, status: result.status ?? null });
    return result.value;
  }
  async function preview(observer, target, expected, id) {
    const value = success(await client.match(observer.token, target.playerId), `${id}-client`);
    check(id, !value.bot && sameOpponent(value.opponent, target, expected), {
      targetPlayerId: target.playerId, bot: value.bot,
      levels: value.opponent.party.map((c) => c.level),
      exactCompanionsHeroNameScores: sameOpponent(value.opponent, target, expected),
    });
  }
  async function upload(account, value, id) {
    const reply = success(await client.upload(account.token, value), `${id}-client`);
    check(id, reply.removed.length === 0 && reply.thefts.length === 0, {
      removedCount: reply.removed.length, theftCount: reply.thefts.length,
    });
  }
  try {
    event({ start: { expectedDeployedSha: expectedSha, scriptSha256: report.scriptSha256 } });
    const response = await guardedFetch(`${ORIGIN}/healthz`);
    const health = await response.json();
    check('health-exact-deployed-sha', response.status === 200 && health.ok === true && health.sha === expectedSha,
      { observedSha: typeof health.sha === 'string' && /^[0-9a-f]{40}$/.test(health.sha) ? health.sha : null });
    healthPinned = true;
    const { createNetClient } = await import(pathToFileURL(resolve(ROOT, 'dist/electron/main/net.js')).href);
    client = createNetClient({ baseUrl: ORIGIN, fetchFn: guardedFetch, timeoutMs: TIMEOUT_MS });
    for (let i = 0; i < 2; i += 1) {
      const registered = success(await client.register(names[i]), `register-${i + 1}`);
      check(`credential-shape-${i + 1}`, typeof registered.playerId === 'string' &&
        /^[0-9a-f-]{36}$/.test(registered.playerId) && typeof registered.token === 'string' &&
        /^[0-9a-f]{32}$/.test(registered.token) && !accounts.some((a) =>
          a.playerId === registered.playerId || a.token === registered.token));
      const account = { ...registered, label: `synthetic-${i + 1}`, name: names[i] };
      accounts.push(account);
      const publicAccount = { label: account.label, playerId: account.playerId, name: account.name };
      report.accounts.push(publicAccount); event({ account: publicAccount });
      await upload(account, snapshot(account.name), `upload-levels-${i + 1}`);
    }
    const [a, b] = accounts;
    await preview(a, b, snapshot(b.name), 'b-high-level-db-roundtrip');
    await preview(b, a, snapshot(a.name), 'a-high-level-db-roundtrip');
    for (const observer of accounts) {
      const directory = success(await client.opponents(observer.token), `${observer.label}-directory-client`);
      const target = accounts.find((a) => a !== observer);
      const ownRow = directory.opponents.find((row) => row.playerId === target.playerId);
      check(`${observer.label}-directory`, !ownRow || sameOpponent(ownRow, target, snapshot(target.name)), {
        validatedRowCount: directory.opponents.length, ownedTargetVisible: !!ownRow,
        ownedTargetPlayerId: target.playerId, ownedTargetHighLevelsVerified: !!ownRow,
        limit: 'Top 50 only; score-0 synthetic visibility is not guaranteed; no ranking boost.',
      });
    }
    const invalid = [
      ['unsafe-integer', Number.MAX_SAFE_INTEGER + 1], ['fraction', 1.5], ['zero', 0],
      ['negative', -1], ['string', '11'], ['null', null],
    ];
    for (const [label, value] of invalid) {
      const bad = snapshot(b.name);
      bad.companions[0].level = value;
      const rejected = await client.upload(b.token, bad);
      check(`reject-${label}`, !rejected.ok && rejected.status === 400, { status: rejected.status ?? null });
      await preview(a, b, snapshot(b.name), `no-loss-after-${label}`);
    }
    const overflow = snapshot(b.name);
    overflow.companions[0].level = '__NUMBER_LITERAL__';
    const responseOverflow = await guardedFetch(`${ORIGIN}/v1/snapshot`, {
      method: 'PUT', headers: { 'content-type': 'application/json', authorization: `Bearer ${b.token}` },
      body: JSON.stringify(overflow).replace('"__NUMBER_LITERAL__"', '1e400'),
    });
    await responseOverflow.arrayBuffer(); // Discard body; no token/error payload retained.
    check('reject-positive-infinity-json-literal', responseOverflow.status === 400, { status: responseOverflow.status });
    await preview(a, b, snapshot(b.name), 'no-loss-after-positive-infinity');
    report.status = 'PASS';
  } catch (e) {
    report.status = 'FAIL'; report.failure = safeFailure(e);
    event({ failure: report.failure });
  } finally {
    // Independent cleanup for each known credential even when a prior check failed.
    for (const account of accounts) {
      try {
        await upload(account, snapshot(account.name, true), `${account.label}-cleanup-upload`);
        report.cleanup.push({ playerId: account.playerId, emptySnapshotUpload: 'PASS' });
      } catch (e) {
        report.cleanup.push({ playerId: account.playerId, emptySnapshotUpload: 'FAIL', error: safeFailure(e) });
        report.status = 'FAIL';
      }
    }
    if (accounts.length === 2) {
      for (const target of accounts) {
        try {
          const observer = accounts.find((a) => a !== target);
          await preview(observer, target, snapshot(target.name, true), `${target.label}-cleanup-db-empty`);
          report.cleanup.find((c) => c.playerId === target.playerId).dbEmptyReadback = 'PASS';
        } catch (e) {
          report.cleanup.find((c) => c.playerId === target.playerId).dbEmptyReadback = 'FAIL';
          event({ cleanupReadbackFailure: safeFailure(e), playerId: target.playerId }); report.status = 'FAIL';
        }
      }
    } else {
      report.retention.dbCleanupReadback = 'NOT_COMPLETED_REQUIRES_TWO_REGISTERED_ACCOUNTS';
    }
    if (healthPinned) {
      try {
        const response = await guardedFetch(`${ORIGIN}/healthz`);
        const health = await response.json();
        check('health-end-same-sha', response.status === 200 && health.ok === true && health.sha === expectedSha);
      } catch (e) { report.status = 'FAIL'; event({ endHealthFailure: safeFailure(e) }); }
    }
    const after = bindings();
    report.bindingsAfter = after;
    report.localBindingsUnchanged = isDeepStrictEqual(before, after);
    if (!report.localBindingsUnchanged) report.status = 'FAIL';
    report.createdAccountCount = accounts.length;
    report.registrationRequests = registrations;
    report.possibleUnidentifiedAccountCount = registrations - accounts.length;
    report.endedAt = stamp();
    event({ complete: { status: report.status, endedAt: report.endedAt } });
    report.eventsSha256 = fileSha(eventsPath);
    const reportPath = resolve(out, 'report.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    writeFileSync(resolve(out, 'SHA256SUMS'), `${fileSha(reportPath)}  report.json\n${report.eventsSha256}  events.ndjson\n`,
      { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ status: report.status, report: reportPath, sha256: fileSha(reportPath),
      createdAccounts: accounts.length, tokensPersisted: false }));
    accounts.forEach((a) => { a.token = ''; });
  }
  return report.status === 'PASS' ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 5 || args[0] !== '--execute' || args[1] !== '--expected-sha' || args[3] !== '--out') {
    console.log('PREPARED_NOT_EXECUTED. Host invocation: node <script> --execute --expected-sha <40hex deployed SHA> --out <new run evidence dir>');
    return 2;
  }
  return execute(args[2], args[4]);
}
main().then((code) => { process.exitCode = code; }).catch(() => {
  console.error('PROBE_PRECHECK_OR_REPORT_FAILURE_REDACTED; inspect sanitized output if present.');
  process.exitCode = 1;
});
