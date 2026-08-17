import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

const mockRoute = {} as ActivatedRouteSnapshot;

function makeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  let authService: { isAuthenticated: ReturnType<typeof vi.fn>; setRedirectUrl: ReturnType<typeof vi.fn>; whenReady: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };
  const fakeUrlTree = {} as any;

  beforeEach(() => {
    authService = {
      isAuthenticated: vi.fn(),
      setRedirectUrl: vi.fn(),
      whenReady: vi.fn().mockResolvedValue(undefined),
    };
    router = { navigate: vi.fn(), createUrlTree: vi.fn().mockReturnValue(fakeUrlTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('returns true when user is authenticated', async () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, makeState('/dashboard'))
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('returns false and redirects to /auth/login when unauthenticated', async () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, makeState('/dashboard'))
    );

    expect(result).toBe(fakeUrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login']);
  });

  it('stores the attempted URL before redirecting', async () => {
    authService.isAuthenticated.mockReturnValue(false);

    await TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, makeState('/portfolio/folder-1'))
    );

    expect(authService.setRedirectUrl).toHaveBeenCalledWith('/portfolio/folder-1');
  });
});

describe('guestGuard', () => {
  let authService: { isAuthenticated: ReturnType<typeof vi.fn>; whenReady: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn>; createUrlTree: ReturnType<typeof vi.fn> };
  const fakeUrlTree = {} as any;

  beforeEach(() => {
    authService = { isAuthenticated: vi.fn(), whenReady: vi.fn().mockResolvedValue(undefined) };
    router = { navigate: vi.fn(), createUrlTree: vi.fn().mockReturnValue(fakeUrlTree) };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('returns true when user is not authenticated', async () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      guestGuard(mockRoute, makeState('/auth/login'))
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('returns false and redirects to / when already authenticated', async () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      guestGuard(mockRoute, makeState('/auth/login'))
    );

    expect(result).toBe(fakeUrlTree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
