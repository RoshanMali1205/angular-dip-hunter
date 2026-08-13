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
import { WhatsNewService } from './core/services/whats-new.service';
import { DEFAULT_USER } from './core/models/user.model';
import { WhatsNewRelease } from './core/config/app-release.config';

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
  justFinished: signal(false),
  consumeJustFinished: vi.fn(),
  steps: signal([]),
  currentIndex: signal(0),
};

const mockSwUpdate = {
  isEnabled: false,
  versionUpdates: NEVER,
};

const mockWhatsNewService = {
  seedCurrentVersionIfMissing: vi.fn().mockReturnValue(false),
  shouldShowWhatsNew: vi.fn().mockReturnValue(false),
  getLatestRelease: vi.fn().mockReturnValue(null),
  markAsSeen: vi.fn(),
};

const releaseFixture: WhatsNewRelease = {
  version: '1.1.0',
  date: '2026-04-29',
  highlights: [{ icon: 'spark', tag: 'new', textKey: 'whatsNew.highlights.versionAwareModal' }],
};

describe('App', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LanguageService, useValue: mockLangService },
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TourService, useValue: mockTourService },
        { provide: WhatsNewService, useValue: mockWhatsNewService },
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

  it('shows Tiranga brand mark in header while Independence Day icon window is active', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      showIndependenceDayIcon: ReturnType<typeof signal<boolean>>;
    };
    app.showIndependenceDayIcon.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const brandImg = compiled.querySelector('header img[alt="Dip Hunter Independence Day icon"]') as HTMLImageElement | null;
    expect(brandImg).toBeTruthy();
    expect(brandImg?.getAttribute('src')).toContain('icons-india/');
  });

  it('shows default brand mark when Independence Day icon window is inactive', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      showIndependenceDayIcon: ReturnType<typeof signal<boolean>>;
    };
    app.showIndependenceDayIcon.set(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header img[alt="Dip Hunter Independence Day icon"]')).toBeNull();
  });

  it('renders whats new modal when modal flag is true and release exists', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      showWhatsNewModal: ReturnType<typeof signal<boolean>>;
      latestRelease: ReturnType<typeof signal<WhatsNewRelease | null>>;
    };

    app.latestRelease.set(releaseFixture);
    app.showWhatsNewModal.set(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-whats-new-modal')).toBeTruthy();
  });

  it('hides whats new modal when closeWhatsNewModal() is called', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      showWhatsNewModal: ReturnType<typeof signal<boolean>>;
      closeWhatsNewModal: () => void;
    };

    app.showWhatsNewModal.set(true);
    app.closeWhatsNewModal();

    expect(app.showWhatsNewModal()).toBe(false);
  });

  it('seeds whats new version after onboarding completion without showing modal', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockTourService.isCompleted.mockReturnValue(true);
    mockTourService.isActive.mockReturnValue(false);
    mockWhatsNewService.seedCurrentVersionIfMissing.mockReturnValue(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(mockWhatsNewService.seedCurrentVersionIfMissing).toHaveBeenCalled();
    expect(mockWhatsNewService.shouldShowWhatsNew).not.toHaveBeenCalled();
  });

  it('re-checks whats new when tour just finished signal is emitted', () => {
    vi.useFakeTimers();
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockTourService.isCompleted.mockReturnValue(true);
    mockTourService.isActive.mockReturnValue(false);
    mockWhatsNewService.seedCurrentVersionIfMissing.mockReturnValue(false);
    mockWhatsNewService.shouldShowWhatsNew.mockReturnValue(false);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const initialCalls = mockWhatsNewService.shouldShowWhatsNew.mock.calls.length;
    mockTourService.justFinished.set(true);
    vi.runAllTimers();

    expect(mockWhatsNewService.shouldShowWhatsNew.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(mockTourService.consumeJustFinished).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
