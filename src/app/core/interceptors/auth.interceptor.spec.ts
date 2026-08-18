import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: { getAccessToken: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = { getAccessToken: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('attaches Authorization Bearer header when token is present', () => {
    authService.getAccessToken.mockReturnValue('test-token-123');

    http.get('/api/holdings').subscribe();

    const req = httpMock.expectOne('/api/holdings');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({});
  });

  it('does not attach header when no token exists', () => {
    authService.getAccessToken.mockReturnValue(null);

    http.get('/api/holdings').subscribe();

    const req = httpMock.expectOne('/api/holdings');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('skips attaching token for /auth/ endpoints', () => {
    authService.getAccessToken.mockReturnValue('test-token-123');

    http.post('/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('skips attaching token for auth registration endpoint', () => {
    authService.getAccessToken.mockReturnValue('test-token-123');

    http.post('/auth/register', {}).subscribe();

    const req = httpMock.expectOne('/auth/register');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('skips attaching token for the Gemini Netlify function', () => {
    authService.getAccessToken.mockReturnValue('test-token-123');

    http.post('/.netlify/functions/ai', { action: 'chat' }).subscribe();

    const req = httpMock.expectOne('/.netlify/functions/ai');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('skips attaching token for /api/quotes', () => {
    authService.getAccessToken.mockReturnValue('test-token-123');

    http.get('/api/quotes?symbols=TCS').subscribe();

    const req = httpMock.expectOne('/api/quotes?symbols=TCS');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('passes request through when token is absent and URL is not auth', () => {
    authService.getAccessToken.mockReturnValue(null);

    http.get('/api/quotes').subscribe();

    const req = httpMock.expectOne('/api/quotes');
    req.flush({ price: 100 });
    // no error thrown — request completed successfully
  });
});
