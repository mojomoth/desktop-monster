// T22 — node:http adapter for the leaderboard/PvP server (SPEC F43,
// SERVER_ARCHITECTURE §1/§4). This is a trust boundary: it caps the body,
// parses the JSON and derives the rate-limit ip before anything reaches the
// application handler. /healthz is answered here so a health check never
// touches a store (Render probes it while the DB may be asleep).

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

/** 64 KB. A legitimate snapshot (roster cap 30) is two orders below this. */
export const BODY_LIMIT = 65_536;

/** The bits of node:http we use — kept structural so tests can inject streams. */
type HttpReq = Readable & {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  socket?: { remoteAddress?: string };
};

type HttpRes = {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body?: string): unknown;
};

/**
 * Render fronts the service with a proxy, so the socket address is the proxy:
 * the caller is the FIRST `x-forwarded-for` entry. Falls back to the socket
 * address (direct local runs) and finally to '' (rate limiting still keys on it).
 */
export function clientIp(headers: IncomingHttpHeaders, remoteAddress: string | undefined): string {
  const forwarded = headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || remoteAddress || '';
}

/** Bearer token from `authorization`, or null when absent/another scheme. */
function bearer(headers: IncomingHttpHeaders): string | null {
  return /^Bearer (.+)$/i.exec(headers.authorization ?? '')?.[1] ?? null;
}

export function createRequestListener(handle: ApiHandler): (req: HttpReq, res: HttpRes) => void {
  return (req, res) => {
    const send = (status: number, body: unknown): void => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    };

    const method = req.method ?? 'GET';
    // Any absolute base works: we only ever read pathname/searchParams back out.
    const url = new URL(req.url ?? '/', 'http://x');

    if (method === 'GET' && url.pathname === '/healthz') {
      send(200, { ok: true, sha: process.env.RENDER_GIT_COMMIT ?? 'dev' });
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let answered = false;

    req.on('data', (chunk: Buffer) => {
      if (answered) {
        return;
      }
      size += chunk.length;
      if (size > BODY_LIMIT) {
        answered = true;
        send(413, { error: 'payload_too_large' });
        req.destroy(); // stop reading a body we already refused
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (answered) {
        return;
      }
      answered = true;
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
      void handle({
        method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        auth: bearer(req.headers),
        body,
        ip: clientIp(req.headers, req.socket?.remoteAddress),
      }).then((result) => {
        send(result.status, result.body);
      });
    });
  };
}
