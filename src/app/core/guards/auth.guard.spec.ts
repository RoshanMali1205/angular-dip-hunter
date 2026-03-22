import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

const mockRoute = {} as ActivatedRouteSnapshot;

function makeState(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  let authService: { isAuthenticated: ReturnType<typeof vi.fn>; setRedirectUrl: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      isAuthenticated: vi.fn(),
      setRedirectUrl: vi.fn(),
    };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('returns true when user is authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, makeState('/dashboard'))
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('returns false and redirects to /auth/login when unauthenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, makeState('/dashboard'))
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('stores the attempted URL before redirecting', () => {
    authService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() =>
      authGuard(mockRoute, makeState('/portfolio/folder-1'))
    );

    expect(authService.setRedirectUrl).toHaveBeenCalledWith('/portfolio/folder-1');
  });
});

describe('guestGuard', () => {
  let authService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { isAuthenticated: vi.fn() };
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('returns true when user is not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(mockRoute, makeState('/auth/login'))
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('returns false and redirects to / when already authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(mockRoute, makeState('/auth/login'))
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });
});
