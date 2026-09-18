"use strict";
// T22/T39/T41 — server entry point (SPEC F43/F44/F46, SERVER_ARCHITECTURE §1).
// Render runs it via `npm run start:server`; electron-builder excludes it from
// the .app. This is the ONLY file that reads the wall clock: app.ts takes
// now() from here.
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_http_1 = require("node:http");
const app_js_1 = require("./app.js");
const http_js_1 = require("./http.js");
const pgStore_js_1 = require("./pgStore.js");
const store_js_1 = require("./store.js");
// ponytail: CommonJS output has no top-level await, so boot is one async fn.
async function main() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('[desmon-server] DATABASE_URL unset — using MemoryStore (data is lost on restart)');
    }
    const store = url ? await pgStore_js_1.PgStore.connect(url) : new store_js_1.MemoryStore();
    const app = (0, app_js_1.createApp)({
        store,
        now: Date.now,
        randomUUID: node_crypto_1.randomUUID,
        randomBytesHex: (n) => (0, node_crypto_1.randomBytes)(n).toString('hex'),
        randomSeed: () => (0, node_crypto_1.randomBytes)(4).readUInt32BE(0),
    });
    const port = Number(process.env.PORT ?? 10000);
    (0, node_http_1.createServer)((0, http_js_1.createRequestListener)(app.handle)).listen(port, '0.0.0.0', () => {
        const sha = process.env.RENDER_GIT_COMMIT ?? 'dev';
        console.log(`[desmon-server] listening on :${port} store=${url ? 'pg' : 'memory'} sha=${sha}`);
    });
}
void main();
