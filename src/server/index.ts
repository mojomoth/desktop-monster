// T22 — server entry point (SPEC F43, SERVER_ARCHITECTURE §1). Render runs it
// via `npm run start:server`; electron-builder excludes it from the .app.
// ponytail: the 404 stub is the whole application until T39 supplies createApp.

import { createServer } from 'node:http';
import { createRequestListener } from './http.js';
import type { ApiHandler } from './http.js';

const handle: ApiHandler = async () => ({ status: 404, body: { error: 'not_found' } });

const port = Number(process.env.PORT ?? 10000);

createServer(createRequestListener(handle)).listen(port, '0.0.0.0', () => {
  const sha = process.env.RENDER_GIT_COMMIT ?? 'dev';
  console.log(`[desmon-server] listening on :${port} store=memory sha=${sha}`);
});
