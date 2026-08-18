import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { SupabaseClientService } from './supabase-client.service';

describe('SupabaseClientService', () => {
  const originalLocation = globalThis.location;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation,
    });
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  it('stays disabled when environment keys are empty', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(SupabaseClientService);
    await service.whenReady();
    expect(service.isEnabled).toBe(false);
    expect(service.client).toBeNull();
  });

  it('does not fetch remote config on localhost', async () => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hostname: 'localhost' },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    TestBed.configureTestingModule({});
    const service = TestBed.inject(SupabaseClientService);
    await service.whenReady();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(service.isEnabled).toBe(false);
  });

  it('enables the client from public-config on a production host', async () => {
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hostname: 'dip-hunter.netlify.app' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          supabaseUrl: 'https://example.supabase.co',
          supabaseAnonKey: 'anon-public-key',
          configured: true,
        }),
      })
    );

    TestBed.configureTestingModule({});
    const service = TestBed.inject(SupabaseClientService);
    await service.whenReady();

    expect(service.isEnabled).toBe(true);
    expect(service.url).toBe('https://example.supabase.co');
    expect(service.client).not.toBeNull();
  });
});
