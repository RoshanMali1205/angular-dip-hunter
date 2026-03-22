import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP Interceptor for Angular 21
 * Attaches Authorization Bearer token to API requests
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // Skip adding token for auth endpoints and fully-qualified external URLs
  const isAuthEndpoint = req.url.includes('/auth/login') || req.url.includes('/auth/register');
  const isExternalUrl = req.url.startsWith('http://') || req.url.startsWith('https://') || req.url.startsWith('//');

  if (token && !isAuthEndpoint && !isExternalUrl) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};
