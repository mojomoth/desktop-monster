// T22/T39 — server entry point (SPEC F43/F44, SERVER_ARCHITECTURE §1). Render
// runs it via `npm run start:server`; electron-builder excludes it from the
// .app. This is the ONLY file that reads the wall clock: app.ts takes now()
// from here. ponytail: MemoryStore until T41 brings PgStore + DATABASE_URL.

import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { createRequestListener } from './http.js';
import { MemoryStore } from './store.js';

const app = createApp({
  store: new MemoryStore(),
  now: Date.now,
  randomUUID,
  randomBytesHex: (n) => randomBytes(n).toString('hex'),
  randomSeed: () => randomBytes(4).readUInt32BE(0),
});

const port = Number(process.env.PORT ?? 10000);

createServer(createRequestListener(app.handle)).listen(port, '0.0.0.0', () => {
  const sha = process.env.RENDER_GIT_COMMIT ?? 'dev';
  console.log(`[desmon-server] listening on :${port} store=memory sha=${sha}`);
});
