import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifySchedule } from './balance-verify.mjs';

const protocol = JSON.parse(readFileSync(new URL('../../docs/v0.11/EVALUATION_PROTOCOL.json', import.meta.url), 'utf8'));
function censoredRows() {
  const rows = [];
  for (const profile of [...protocol.ordinaryProfiles, ...protocol.stressProfiles]) {
    const ordinary = protocol.ordinaryProfiles.includes(profile), count = ordinary ? 100 : 20;
    for (let index = 0; index < count; index++) {
      const cyclesWanted = ordinary && index < 20 ? 10 : 3;
      rows.push({ profile, seed: protocol.heldOutSeeds.first + index, cyclesWanted, cycles: [], nonarrival: cyclesWanted,
        durationMs: 18 * 3600000, final: { coins: profile === 'wealthy' ? '1000000' : '0', income: '0', sales: '0', spent: '0' } });
    }
  }
  return rows;
}
test('censored ordinary and stress trajectories must finish their registered exposure', () => {
  const rows = censoredRows();
  assert.equal(verifySchedule(rows, protocol), true);
  rows.find(row => row.profile === 'idle').durationMs = 1;
  assert.throws(() => verifySchedule(rows, protocol), /scheduled exposure/);
});
test('ten-cycle continuations may stop at18h only when first three cycles failed', () => {
  const rows = censoredRows(), row = rows[0];
  row.cycles = [1, 2, 3].map(number => ({ number, readyAtMs: number * 4 * 3600000, acceptedAtMs: number * 4 * 3600000, intervalMs: 4 * 3600000 }));
  row.nonarrival = 7;
  assert.throws(() => verifySchedule(rows, protocol), /scheduled exposure/);
  row.durationMs = 60 * 3600000;
  assert.equal(verifySchedule(rows, protocol), true);
});
