// node:http adapter for the DesMon server (SPEC F43, SERVER_ARCHITECTURE §1/§4).
// The ONLY place in src/server that knows about sockets, streams and headers:
// createApp (T39) sees plain ApiRequest/ApiResponse objects, which is what
// makes the app testable without listening on a port.

import type { IncomingHttpHeaders } from 'node:http';
import type { Readable } from 'node:stream';

export interface ApiRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  auth: string | null;
  body: unknown;
  ip: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export type ApiHandler = (req: ApiRequest) => Promise<ApiResponse>;

/** Request body cap in bytes (SPEC §Server / API); anything larger → 413. */
export const BODY_LIMIT = 65_536;

/** The parts of node's IncomingMessage this adapter uses (tests pass a PassThrough). */
type HttpReq = Readable & {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  socket?: { remoteAddress?: string };
};

/** The parts of node's ServerResponse this adapter uses. */
interface HttpRes {
  writeHead(status: number, headers: Record<string, string>): unknown;
  end(chunk: string): unknown;
}

/**
 * Caller address for rate limiting: Render fronts the service with a proxy, so
 * the socket address is the proxy — the first `x-forwarded-for` entry is the
 * client. Never stored or logged (SERVER_ARCHITECTURE §3, no PII).
 */
export function clientIp(headers: IncomingHttpHeaders, remoteAddress: string | undefined): string {
  const forwarded = headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first !== undefined && first !== '' ? first : (remoteAddress ?? '');
}

/** Bridges node's request/response objects onto an ApiHandler. */
export function createRequestListener(handle: ApiHandler): (req: HttpReq, res: HttpRes) => void {
  return (req, res) => {
    let done = false;
    const send = (status: number, body: unknown): void => {
      if (done) {
        return;
      }
      done = true;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    const url = new URL(req.url ?? '/', 'http://x');
    const method = req.method ?? 'GET';

    // /healthz is answered here, never by the handler: Render's health check
    // and the deploy verification must work even when the store is down.
    if (method === 'GET' && url.pathname === '/healthz') {
      send(200, { ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' });
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        send(413, { error: 'payload_too_large' });
        req.destroy(); // stop reading a body we already refused
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (done) {
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      let body: unknown = null;
      if (raw !== '') {
        try {
          body = JSON.parse(raw);
        } catch {
          send(400, { error: 'bad_request' });
          return;
        }
      }
      void (async () => {
        try {
          const out = await handle({
            method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams),
            auth: /^bearer (.+)$/i.exec(req.headers.authorization ?? '')?.[1] ?? null,
            body,
            ip: clientIp(req.headers, req.socket?.remoteAddress),
          });
          send(out.status, out.body);
        } catch {
          // ponytail: app.ts owns the real 500 guard (handle() never throws);
          // this only keeps a broken handler from crashing the process.
          send(500, { error: 'internal' });
        }
      })();
    });
  };
}
