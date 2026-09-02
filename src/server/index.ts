// Server entry (SPEC F43): boots the node:http adapter on Render's PORT.
// The handler is a 404 stub until T39 swaps in createApp().

import { createServer } from 'node:http';
import { createRequestListener } from './http.js';
import type { ApiHandler } from './http.js';

const port = Number(process.env.PORT ?? 10000);
const handle: ApiHandler = async () => ({ status: 404, body: { error: 'not_found' } });

createServer(createRequestListener(handle)).listen(port, '0.0.0.0', () => {
  const sha = process.env.RENDER_GIT_COMMIT ?? 'dev';
  process.stdout.write(`[desmon-server] listening on :${port} store=memory sha=${sha}\n`);
});
