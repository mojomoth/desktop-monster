"use strict";
// Deploy probe (SPEC F50 + `## Deployment`): `node dist/electron/server/probe.js <url>`
// proves a live deployment end to end — register, upload an empty snapshot,
// read the ranked row back — by reusing the real client (src/main/net.ts), so
// it exercises the same wire format the app does. electron-free.
//
// SOURCE GUARD: the probe NEVER battles another player. A verification command
// must not mutate real players' rosters; PvP correctness is proven hermetically
// by tests/server/pvp.test.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROBE_TIMEOUT_MS = void 0;
exports.probeName = probeName;
exports.runProbe = runProbe;
const node_crypto_1 = require("node:crypto");
const api_js_1 = require("../shared/api.js");
const net_js_1 = require("../main/net.js");
/** Generous: Render's free dyno cold-starts in ~60 s, far past NET_TIMEOUT_MS. */
exports.PROBE_TIMEOUT_MS = 90_000;
/** A throwaway nickname `probe-<4hex>` (matches NICK_RE). */
function probeName(randomHex) {
    return `probe-${randomHex(2)}`;
}
/**
 * register → upload `{ bestIndex: 0, rebirths: 0, companions: [] }` (ranks
 * last, disturbs nobody) → leaderboard, asserting the probe got a rank.
 * Rejects with the first failing step; never plays a battle.
 */
async function runProbe(client, name) {
    const registered = await client.register(name);
    if (!registered.ok)
        throw new Error(`register failed: ${registered.error}`);
    const { playerId, token } = registered.value;
    const snapshot = (0, net_js_1.toSnapshot)(name, { bestIndex: 0, rebirths: 0, companions: [] });
    const uploaded = await client.upload(token, snapshot);
    if (!uploaded.ok)
        throw new Error(`upload failed: ${uploaded.error}`);
    const board = await client.leaderboard(token, api_js_1.LEADERBOARD_DEFAULT);
    if (!board.ok)
        throw new Error(`leaderboard failed: ${board.error}`);
    const me = board.value.me;
    if (me === null)
        throw new Error(`leaderboard returned no row for ${name}`);
    if (me.rank < 1)
        throw new Error(`leaderboard rank ${me.rank} < 1 for ${name}`);
    return { playerId, rank: me.rank };
}
async function main(baseUrl) {
    if (baseUrl === '') {
        console.error('usage: node dist/electron/server/probe.js <url>');
        process.exitCode = 1;
        return;
    }
    const client = (0, net_js_1.createNetClient)({ baseUrl, timeoutMs: exports.PROBE_TIMEOUT_MS });
    try {
        console.log(JSON.stringify(await runProbe(client, probeName((n) => (0, node_crypto_1.randomBytes)(n).toString('hex')))));
    }
    catch (err) {
        console.error(`[probe] ${String(err)}`);
        process.exitCode = 1;
    }
}
// ponytail: CommonJS output, so `require.main` is the entry-point check that
// keeps `import`ing this module from a test side-effect free.
if (require.main === module)
    void main(process.argv[2] ?? '');
