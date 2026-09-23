import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { SupabaseClientService } from './supabase-client.service';

describe('AuthService login errors', () => {
  it('replaces a Supabase gateway timeout with an account-service message', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Gateway Timeout' },
    });
    const supabase = {
      isEnabled: true,
      client: {
        auth: {
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          onAuthStateChange: vi.fn(),
          signInWithPassword,
        },
      },
      whenReady: () => Promise.resolve(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseClientService, useValue: supabase },
        { provide: Router, useValue: { navigate: vi.fn(), navigateByUrl: vi.fn() } },
      ],
    });

    const auth = TestBed.inject(AuthService);
    await auth.whenReady();

    const ok = await auth.login({
      email: 'investor@example.com',
      password: 'secret-password',
      rememberMe: false,
    });

    expect(ok).toBe(false);
    expect(auth.error()).toBe(
      'The account service is not responding. It may be paused or offline. Try again shortly.'
    );
    expect(auth.isLoading()).toBe(false);
  });
});
