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

  if (token && shouldAttachAccessToken(req.url)) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};

function shouldAttachAccessToken(url: string): boolean {
  if (url.includes('/auth/login') || url.includes('/auth/register')) return false;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return false;
  if (url.includes('/.netlify/functions/')) return false;
  if (url.includes('/api/ai') || url.includes('/api/quotes')) return false;
  return true;
}
