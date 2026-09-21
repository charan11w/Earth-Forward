import { describe, expect, it } from 'vitest';
import express from 'express';
import cors from 'cors';
import type { AddressInfo } from 'node:net';
import { createCorsOptions } from '../src/config/cors';

async function request(mode: string, origin: string, preflight = true) {
  const app = express();
  app.use(cors(createCorsOptions('https://app.example.com', mode)));
  app.get('/private', (_req, res) => res.status(401).json({ error: 'Authentication required' }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + (server.address() as AddressInfo).port + '/private', {
      method: preflight ? 'OPTIONS' : 'GET',
      headers: { Origin: origin, ...(preflight ? {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type'
      } : {}) }
    });
    await response.text();
    return response;
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
describe('CORS responses', () => {
  it.each(['http://localhost:5173','http://localhost:5174','http://127.0.0.1:5174','http://[::1]:5174'])('allows development preflight from %s', async origin => {
    const r = await request('development', origin);
    expect(r.status).toBe(204);
    expect(r.headers.get('access-control-allow-origin')).toBe(origin);
    expect(r.headers.get('access-control-allow-headers')).toContain('authorization');
    expect(r.headers.get('access-control-allow-methods')).toContain('POST');
  });
  it.each(['https://untrusted.example','http://localhost.attacker.example:5174','null'])('does not allow an unconfigured origin %s', async origin => {
    expect((await request('development', origin)).headers.get('access-control-allow-origin')).toBeNull();
  });
  it('keeps production origins restricted to the configured allowlist', async () => {
    expect((await request('production','http://localhost:5174')).headers.get('access-control-allow-origin')).toBeNull();
    expect((await request('production','https://app.example.com')).headers.get('access-control-allow-origin')).toBe('https://app.example.com');
  });
  it('preserves CORS headers on authentication errors', async () => {
    const r = await request('development','http://localhost:5174',false);
    expect(r.status).toBe(401);
    expect(r.headers.get('access-control-allow-origin')).toBe('http://localhost:5174');
  });
});

