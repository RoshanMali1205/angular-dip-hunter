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

  // Skip adding token for auth endpoints and external URLs
  const isAuthEndpoint = req.url.includes('/auth/');
  const isExternalUrl = req.url.startsWith('http') && !req.url.includes(window.location.host);

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
