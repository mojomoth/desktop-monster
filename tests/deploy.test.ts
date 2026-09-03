// T44 — Render deploy (SPEC F50 + `## Deployment`). The live half (bootstrap,
// push, `render deploys create`, /healthz) is proven by the task/stage-3 AC run
// against the real service; these tests pin the parts the gates CAN prove
// offline: the probe's own logic and the deployment facts recorded in the
// source and the operator docs — so a later edit that breaks either fails
// `npm test`, not just the one-off deploy run.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type {
  LeaderboardResponse,
  NetResult,
  RegisterResponse,
  Snapshot,
  SnapshotResponse,
} from '../src/shared/api.js';
import { SERVER_URL } from '../src/shared/serverUrl.js';
import type { NetClient } from '../src/main/net.js';
import { probeName, runProbe } from '../src/server/probe.js';

const read = (rel: string): string => readFileSync(join(process.cwd(), rel), 'utf8');

/** A NetClient recording what the probe sent; `pvp` fails the test if called. */
function fakeClient(me: LeaderboardResponse['me']): NetClient & { uploads: Snapshot[] } {
  const uploads: Snapshot[] = [];
  return {
    uploads,
    register: (name: string): Promise<NetResult<RegisterResponse>> =>
      Promise.resolve({ ok: true, value: { playerId: `p-${name}`, token: `t-${name}` } }),
    upload: (_token: string, snapshot: Snapshot): Promise<NetResult<SnapshotResponse>> => {
      uploads.push(snapshot);
      return Promise.resolve({ ok: true, value: { rank: 7, removed: [], thefts: [] } });
    },
    leaderboard: (): Promise<NetResult<LeaderboardResponse>> =>
      Promise.resolve({ ok: true, value: { top: [], me } }),
    pvp: () => {
      throw new Error('the probe must never battle another player');
    },
  };
}

describe('deploy probe (F50)', () => {
  it('registers, uploads an empty snapshot and returns the ranked row', async () => {
    const client = fakeClient({ rank: 3, name: 'probe-ab12', bestIndex: 0, rebirths: 0 });

    await expect(runProbe(client, 'probe-ab12')).resolves.toEqual({
      playerId: 'p-probe-ab12',
      rank: 3,
    });
    expect(client.uploads).toEqual([
      { name: 'probe-ab12', bestIndex: 0, rebirths: 0, companions: [], party: [] },
    ]);
  });

  it('fails when the leaderboard returns no row for the probe', async () => {
    await expect(runProbe(fakeClient(null), 'probe-ab12')).rejects.toThrow('no row');
  });

  it('fails when the reported rank is below 1', async () => {
    const client = fakeClient({ rank: 0, name: 'probe-ab12', bestIndex: 0, rebirths: 0 });

    await expect(runProbe(client, 'probe-ab12')).rejects.toThrow('rank 0');
  });

  it('names itself probe-<4hex> and never mentions a battle call', () => {
    expect(probeName((n) => 'ab12'.slice(0, n * 2))).toBe('probe-ab12');
    expect(read('src/server/probe.ts')).not.toContain('pvp(');
  });
});

describe('deployment facts (F50, `## Deployment`)', () => {
  const agents = read('AGENTS.md');

  it('pins the deployed https URL in the shared source', () => {
    expect(SERVER_URL).toMatch(/^https:\/\/\S+$/);
  });

  it('records service, database, expiry and deployed sha in AGENTS.md §Server', () => {
    expect(agents).toContain(`SERVER_URL=${SERVER_URL}`);
    expect(agents).toMatch(/^RENDER_SERVICE_ID=srv-\S+$/m);
    expect(agents).toMatch(/^RENDER_POSTGRES_ID=dpg-\S+$/m);
    expect(agents).toMatch(/^DB_CREATED=\S+$/m);
    expect(agents).toMatch(/^DB_EXPIRES=\d{4}-\d{2}-\d{2}$/m);
    expect(agents).toMatch(/^DEPLOYED_SHA=/m);
  });

  it('documents the server section in the README (F27 sections stay untouched)', () => {
    const readme = read('README.md');

    expect(readme).toContain('## Server / Leaderboard & PvP');
    expect(readme).toContain('npm run start:server');
    expect(readme).toContain('Knight-xxxx');
    expect(readme).toContain('DESMON_SERVER_URL');
    expect(readme).toContain('self-reported');
    expect(readme).toContain('sleeps after 15 minutes idle');
    expect(readme).toContain('expires 30 days after it was created');
  });
});
