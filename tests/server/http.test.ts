// T22 — node:http adapter (SPEC F43, §Server / API body-cap and healthz rows).
// The listener is driven with a PassThrough carrying the IncomingMessage
// fields it reads plus a recording response object: no sockets, no ports, no
// timers, so `npm test` stays hermetic (AGENTS.md §Hard rules).

import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { BODY_LIMIT, clientIp, createRequestListener } from '../../src/server/http.js';
import type { ApiHandler, ApiRequest } from '../../src/server/http.js';

interface Recorded {
  status: number;
  headers: Record<string, string>;
  body: string;
}

interface Init {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  remoteAddress?: string;
  body?: string;
}

/** Runs one request through the listener and resolves with what it wrote. */
const drive = (handle: ApiHandler, init: Init = {}): Promise<Recorded> =>
  new Promise((resolve) => {
    const req = Object.assign(new PassThrough(), {
      method: init.method ?? 'GET',
      url: init.url ?? '/v1/thing',
      headers: init.headers ?? {},
      socket: { remoteAddress: init.remoteAddress },
    });
    req.on('error', () => {
      // the 413 path destroys the request mid-write
    });
    const out: Recorded = { status: 0, headers: {}, body: '' };
    createRequestListener(handle)(req, {
      writeHead(status, headers) {
        out.status = status;
        out.headers = headers;
      },
      end(chunk) {
        out.body = chunk;
        resolve(out);
      },
    });
    req.end(init.body);
  });

/** A handler that fails the test if it is ever called. */
const throwingHandler: ApiHandler = () => {
  throw new Error('handler must not be called');
};

const echoHandler: ApiHandler = async (req) => ({ status: 200, body: req });

describe('createRequestListener (F43, src/server/http.ts)', () => {
  it('answers GET /healthz with ok and the RENDER_GIT_COMMIT sha without touching the handler', async () => {
    process.env.RENDER_GIT_COMMIT = 'abc1234';
    const res = await drive(throwingHandler, { url: '/healthz' });
    delete process.env.RENDER_GIT_COMMIT;
    expect(res.status).toBe(200);
    expect(res.body).toBe('{"ok":true,"sha":"abc1234"}'); // key order ok → sha
    expect(res.headers['content-type']).toBe('application/json');
  });

  it('falls back to sha dev when RENDER_GIT_COMMIT is unset', async () => {
    delete process.env.RENDER_GIT_COMMIT;
    const res = await drive(throwingHandler, { url: '/healthz' });
    expect(res.body).toBe('{"ok":true,"sha":"dev"}');
  });

  it('rejects bodies over 65536 bytes with 413 payload_too_large', async () => {
    const res = await drive(throwingHandler, {
      method: 'PUT',
      url: '/v1/snapshot',
      body: 'x'.repeat(BODY_LIMIT + 1),
    });
    expect(BODY_LIMIT).toBe(65_536);
    expect(res.status).toBe(413);
    expect(JSON.parse(res.body)).toEqual({ error: 'payload_too_large' });
  });

  it('rejects malformed JSON with 400 bad_request', async () => {
    const res = await drive(throwingHandler, { method: 'POST', body: '{nope' });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'bad_request' });
  });

  it('parses path, query, bearer and JSON body into an ApiRequest', async () => {
    const res = await drive(echoHandler, {
      method: 'GET',
      url: '/v1/leaderboard?n=50&x=y',
      headers: { authorization: 'Bearer deadbeef' },
      remoteAddress: '10.0.0.9',
      body: '{"a":1}',
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({
      method: 'GET',
      path: '/v1/leaderboard',
      query: { n: '50', x: 'y' },
      auth: 'deadbeef',
      body: { a: 1 },
      ip: '10.0.0.9',
    } satisfies ApiRequest);
  });

  it('turns an empty body into null and answers application/json', async () => {
    const res = await drive(echoHandler, { method: 'POST', url: '/v1/pvp' });
    expect(res.headers['content-type']).toBe('application/json');
    expect((JSON.parse(res.body) as ApiRequest).body).toBeNull();
    expect((JSON.parse(res.body) as ApiRequest).auth).toBeNull();
  });

  it('answers 500 internal when the handler rejects', async () => {
    const res = await drive(() => Promise.reject(new Error('boom')), { method: 'POST' });
    expect(res.status).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: 'internal' });
  });
});

describe('clientIp (F43, rate-limit key source)', () => {
  it('takes the client ip from the first x-forwarded-for entry', () => {
    expect(clientIp({ 'x-forwarded-for': ' 1.2.3.4 , 5.6.7.8 ' }, '10.0.0.1')).toBe('1.2.3.4');
    expect(clientIp({ 'x-forwarded-for': ['9.9.9.9', '8.8.8.8'] }, '10.0.0.1')).toBe('9.9.9.9');
  });

  it('falls back to the socket address when the header is missing or empty', () => {
    expect(clientIp({}, '10.0.0.1')).toBe('10.0.0.1');
    expect(clientIp({ 'x-forwarded-for': '  ' }, '10.0.0.1')).toBe('10.0.0.1');
    expect(clientIp({}, undefined)).toBe('');
  });
});
