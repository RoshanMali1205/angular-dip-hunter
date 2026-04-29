import { TestBed } from '@angular/core/testing';
import { WhatsNewModalComponent } from './whats-new-modal.component';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';
import { WhatsNewService } from '../../../core/services/whats-new.service';
import { WhatsNewRelease } from '../../../core/config/app-release.config';

describe('WhatsNewModalComponent', () => {
  const mockThemeService = {
    isDark: vi.fn().mockReturnValue(true),
    isLight: vi.fn().mockReturnValue(false),
  };

  const mockLanguageService = {
    t: vi.fn((key: string) => key),
  };

  const mockWhatsNewService = {
    markAsSeen: vi.fn(),
  };

  const release: WhatsNewRelease = {
    version: '1.1.0',
    date: '2026-04-29',
    highlights: [
      { icon: 'spark', tag: 'new', textKey: 'whatsNew.highlights.versionAwareModal' },
      { icon: 'rocket', tag: 'improved', textKey: 'whatsNew.highlights.startupFlowGuarded' },
    ],
    changelogUrl: 'https://example.com/changelog',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      imports: [WhatsNewModalComponent],
      providers: [
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: WhatsNewService, useValue: mockWhatsNewService },
      ],
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('creates the component', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders modal shell and release version', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const dialog = host.querySelector('[role="dialog"]');

    expect(dialog).toBeTruthy();
    expect(host.textContent).toContain(`v${release.version}`);
  });

  it('calls markAsSeen and emits closed when acknowledge() is called', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    const component = fixture.componentInstance;
    const emitSpy = vi.spyOn(component.closed, 'emit');

    component.acknowledge();

    expect(mockWhatsNewService.markAsSeen).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('acknowledges on Escape key', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const acknowledgeSpy = vi.spyOn(component, 'acknowledge');

    component.onEscape(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(acknowledgeSpy).toHaveBeenCalledTimes(1);
  });

  it('focuses the Got it button after view init', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();
    vi.runAllTimers();

    const host = fixture.nativeElement as HTMLElement;
    const button = host.querySelector('button[type="button"]:last-of-type') as HTMLButtonElement;

    expect(document.activeElement).toBe(button);
  });

  it('acknowledges on backdrop click only when clicking the backdrop itself', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    const component = fixture.componentInstance;
    const acknowledgeSpy = vi.spyOn(component, 'acknowledge');

    const backdropTarget = document.createElement('div');
    component.onBackdropClick({
      target: backdropTarget,
      currentTarget: backdropTarget,
    } as unknown as MouseEvent);

    const innerTarget = document.createElement('button');
    component.onBackdropClick({
      target: innerTarget,
      currentTarget: backdropTarget,
    } as unknown as MouseEvent);

    expect(acknowledgeSpy).toHaveBeenCalledTimes(1);
  });

  it('traps forward Tab focus inside the modal', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();
    vi.runAllTimers();

    const host = fixture.nativeElement as HTMLElement;
    const changelogLink = host.querySelector('a[href]') as HTMLAnchorElement;
    const ackButton = host.querySelector('button[type="button"]') as HTMLButtonElement;
    const preventDefault = vi.fn();

    ackButton.focus();

    fixture.componentInstance.onTabKeydown({
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(changelogLink);
  });

  it('traps backward Shift+Tab focus inside the modal', () => {
    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();
    vi.runAllTimers();

    const host = fixture.nativeElement as HTMLElement;
    const changelogLink = host.querySelector('a[href]') as HTMLAnchorElement;
    const ackButton = host.querySelector('button[type="button"]') as HTMLButtonElement;
    const preventDefault = vi.fn();

    changelogLink.focus();

    fixture.componentInstance.onTabKeydown({
      shiftKey: true,
      preventDefault,
    } as unknown as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(ackButton);
  });

  it('restores focus to the previously focused element when acknowledged', () => {
    const previouslyFocused = document.createElement('button');
    document.body.appendChild(previouslyFocused);
    previouslyFocused.focus();

    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();
    vi.runAllTimers();

    fixture.componentInstance.acknowledge();

    expect(document.activeElement).toBe(previouslyFocused);

    previouslyFocused.remove();
  });

  it('restores focus on destroy when modal closes without acknowledge', () => {
    const previouslyFocused = document.createElement('button');
    document.body.appendChild(previouslyFocused);
    previouslyFocused.focus();

    const fixture = TestBed.createComponent(WhatsNewModalComponent);
    fixture.componentRef.setInput('release', release);
    fixture.detectChanges();
    vi.runAllTimers();

    fixture.destroy();

    expect(document.activeElement).toBe(previouslyFocused);

    previouslyFocused.remove();
  });
});
