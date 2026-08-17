import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Auth Guard for Angular 21
 * Protects routes that require authentication
 */
export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  authService.setRedirectUrl(state.url);

  // Return UrlTree to avoid dual-navigation race condition
  return router.createUrlTree(['/auth/login']);
};

/**
 * Guest Guard - Prevents authenticated users from accessing login/register
 * Redirects to dashboard if already logged in
 */
export const guestGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.whenReady();

  if (!authService.isAuthenticated()) {
    return true;
  }

  // Already logged in, redirect to dashboard — return UrlTree to avoid race condition
  return router.createUrlTree(['/']);
};
