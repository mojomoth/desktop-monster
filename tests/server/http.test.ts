// T22 — node:http adapter (SPEC F43, SERVER_ARCHITECTURE §1/§4). The listener
// is driven with a PassThrough carrying method/url/headers/socket and a
// recording response object: no sockets, no timers, no store.

import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BODY_LIMIT,
  clientIp,
  createRequestListener,
} from '../../src/server/http.js';
import type { ApiHandler, ApiRequest } from '../../src/server/http.js';

interface Recorded {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface Init {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[]>;
  remoteAddress?: string;
  body?: string | Buffer;
}

/** Feeds one request through the listener; resolves when it answers. */
function call(handle: ApiHandler, init: Init = {}): Promise<Recorded> {
  return new Promise((resolve) => {
    const req = Object.assign(new PassThrough(), {
      method: init.method ?? 'GET',
      url: init.url ?? '/',
      headers: init.headers ?? {},
      socket: { remoteAddress: init.remoteAddress },
    });
    const res: Recorded & HttpResShape = {
      statusCode: 0,
      headers: {},
      body: '',
      setHeader(name: string, value: string) {
        res.headers[name] = value;
      },
      end(body?: string) {
        res.body = body ?? '';
        resolve(res);
      },
    };
    createRequestListener(handle)(req, res);
    if (init.body !== undefined) {
      req.write(init.body);
    }
    req.end();
  });
}

interface HttpResShape {
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

const ok: ApiHandler = async () => ({ status: 200, body: { pong: true } });

const never: ApiHandler = () => {
  throw new Error('the handler must not be reached');
};

/** Captures what the adapter handed the application. */
function record(): { seen: ApiRequest[]; handle: ApiHandler } {
  const seen: ApiRequest[] = [];
  return {
    seen,
    handle: async (req) => {
      seen.push(req);
      return { status: 200, body: null };
    },
  };
}

const savedSha = process.env.RENDER_GIT_COMMIT;

afterEach(() => {
  if (savedSha === undefined) {
    delete process.env.RENDER_GIT_COMMIT;
  } else {
    process.env.RENDER_GIT_COMMIT = savedSha;
  }
});

describe('createRequestListener (F43, src/server/http.ts)', () => {
  it('answers GET /healthz with ok and the RENDER_GIT_COMMIT sha without touching the handler', async () => {
    process.env.RENDER_GIT_COMMIT = 'deadbeef';
    const res = await call(never, { url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    expect(res.body).toBe('{"ok":true,"sha":"deadbeef"}'); // key order ok → sha
  });

  it('falls back to sha dev when RENDER_GIT_COMMIT is unset', async () => {
    delete process.env.RENDER_GIT_COMMIT;
    const res = await call(never, { url: '/healthz' });
    expect(JSON.parse(res.body)).toEqual({ ok: true, sha: 'dev' });
  });

  it('rejects bodies over 65536 bytes with 413 payload_too_large', async () => {
    const res = await call(never, {
      method: 'PUT',
      url: '/v1/snapshot',
      body: Buffer.alloc(BODY_LIMIT + 1, 'x'),
    });
    expect(BODY_LIMIT).toBe(65_536);
    expect(res.statusCode).toBe(413);
    expect(JSON.parse(res.body)).toEqual({ error: 'payload_too_large' });
  });

  it('rejects malformed JSON with 400 bad_request', async () => {
    const res = await call(never, { method: 'POST', url: '/v1/players', body: '{nope' });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'bad_request' });
  });

  it('takes the client ip from the first x-forwarded-for entry', async () => {
    const { seen, handle } = record();
    await call(handle, {
      method: 'POST',
      url: '/v1/pvp',
      headers: { 'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1 ' },
      remoteAddress: '10.0.0.1',
    });
    expect(seen[0]?.ip).toBe('203.0.113.7');
    expect(clientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, '9.9.9.9')).toBe('1.2.3.4');
  });

  it('falls back to the socket address when x-forwarded-for is absent', async () => {
    const { seen, handle } = record();
    await call(handle, { method: 'POST', url: '/v1/pvp', remoteAddress: '198.51.100.4' });
    expect(seen[0]?.ip).toBe('198.51.100.4');
    expect(clientIp({}, undefined)).toBe('');
  });

  it('hands the handler the method, path, query and bearer token', async () => {
    const { seen, handle } = record();
    await call(handle, {
      url: '/v1/leaderboard?n=25&x=y',
      headers: { authorization: 'Bearer t0ken' },
    });
    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/v1/leaderboard',
      query: { n: '25', x: 'y' },
      auth: 't0ken',
    });
  });

  it('gives the handler a null body for an empty request and no bearer for none', async () => {
    const { seen, handle } = record();
    await call(handle, { method: 'POST', url: '/v1/pvp' });
    expect(seen[0]?.body).toBeNull();
    expect(seen[0]?.auth).toBeNull();
  });

  it('answers with the handler status, its JSON body and application/json', async () => {
    const res = await call(ok, { method: 'POST', url: '/v1/players', body: '{"nickname":"a"}' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/json');
    expect(JSON.parse(res.body)).toEqual({ pong: true });
  });
});
