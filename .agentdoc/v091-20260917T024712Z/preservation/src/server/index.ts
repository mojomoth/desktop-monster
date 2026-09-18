// T22/T39/T41 — server entry point (SPEC F43/F44/F46, SERVER_ARCHITECTURE §1).
// Render runs it via `npm run start:server`; electron-builder excludes it from
// the .app. This is the ONLY file that reads the wall clock: app.ts takes
// now() from here.

import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createRequestListener } from './http.js';
import { PgStore } from './pgStore.js';
import { MemoryStore } from './store.js';

// ponytail: CommonJS output has no top-level await, so boot is one async fn.
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      '[desmon-server] DATABASE_URL unset — using MemoryStore (data is lost on restart)',
    );
  }
  const store = url ? await PgStore.connect(url) : new MemoryStore();

  const app = createApp({
    store,
    now: Date.now,
    randomUUID,
    randomBytesHex: (n) => randomBytes(n).toString('hex'),
    randomSeed: () => randomBytes(4).readUInt32BE(0),
  });

  const port = Number(process.env.PORT ?? 10000);

  createServer(createRequestListener(app.handle)).listen(port, '0.0.0.0', () => {
    const sha = process.env.RENDER_GIT_COMMIT ?? 'dev';
    console.log(
      `[desmon-server] listening on :${port} store=${url ? 'pg' : 'memory'} sha=${sha}`,
    );
  });
}

void main();
