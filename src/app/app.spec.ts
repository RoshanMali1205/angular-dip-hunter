import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { NEVER } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { App } from './app';
import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';
import { UserService } from './core/services/user.service';
import { AuthService } from './core/services/auth.service';
import { TourService } from './core/services/tour.service';
import { DEFAULT_USER } from './core/models/user.model';

// Minimal stubs – only surface what the template and constructor actually call.
const mockThemeService = {
  isDark: vi.fn().mockReturnValue(true),
  isLight: vi.fn().mockReturnValue(false),
  theme: signal<'dark' | 'light'>('dark'),
  toggleTheme: vi.fn(),
};

const mockLangService = {
  languages: [{ code: 'en', name: 'English', nativeName: 'English' }],
  language: signal('en'),
  currentLanguage: signal({ code: 'en', name: 'English', nativeName: 'English' }),
  t: vi.fn((key: string) => key),
  setLanguage: vi.fn(),
};

const mockUserService = {
  user: signal(DEFAULT_USER),
};

const mockAuthService = {
  isAuthenticated: vi.fn().mockReturnValue(false),
  user: signal(null),
};

const mockTourService = {
  isActive: vi.fn().mockReturnValue(false),
  isCompleted: vi.fn().mockReturnValue(true),
  start: vi.fn(),
  setUser: vi.fn(),
  highlightCurrentStep: vi.fn(),
  steps: signal([]),
  currentIndex: signal(0),
};

const mockSwUpdate = {
  isEnabled: false,
  versionUpdates: NEVER,
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LanguageService, useValue: mockLangService },
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TourService, useValue: mockTourService },
        { provide: SwUpdate, useValue: mockSwUpdate },
      ],
    }).compileComponents();
  });

  it('should create the app component', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('should contain a router-outlet in the template', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should show the header when not on an auth page', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    // isAuthPage defaults to false
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('header')).toBeTruthy();
  });

  it('should hide the header on auth pages', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    (app as unknown as { isAuthPage: ReturnType<typeof signal> }).isAuthPage.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('header')).toBeNull();
  });

  it('title signal should equal "Dip Hunter"', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect((app as unknown as { title: ReturnType<typeof signal> }).title()).toBe('Dip Hunter');
  });
});
