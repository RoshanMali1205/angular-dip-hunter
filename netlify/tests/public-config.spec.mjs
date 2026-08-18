import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../functions/public-config.mjs';

describe('public-config function', () => {
  it('returns unconfigured when env is empty', async () => {
    const result = await handler({ httpMethod: 'GET' });
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.equal(body.configured, false);
    assert.equal(body.supabaseUrl, '');
    assert.equal(body.supabaseAnonKey, '');
  });

  it('returns keys from env without exposing service_role', async () => {
    const previousUrl = process.env.SUPABASE_URL;
    const previousAnon = process.env.SUPABASE_ANON_KEY;
    const previousService = process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-public-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret';
    try {
      const result = await handler({ httpMethod: 'GET' });
      const body = JSON.parse(result.body);
      assert.equal(body.configured, true);
      assert.equal(body.supabaseUrl, 'https://example.supabase.co');
      assert.equal(body.supabaseAnonKey, 'anon-public-key');
      assert.equal(JSON.stringify(body).includes('super-secret'), false);
    } finally {
      process.env.SUPABASE_URL = previousUrl;
      process.env.SUPABASE_ANON_KEY = previousAnon;
      process.env.SUPABASE_SERVICE_ROLE_KEY = previousService;
    }
  });
});
