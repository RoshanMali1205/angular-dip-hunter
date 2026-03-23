import { Component, signal, inject, HostListener, ElementRef, OnInit, DestroyRef } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { ThemeService } from './core/services/theme.service';
import { LanguageService, Language } from './core/services/language.service';
import { UserService } from './core/services/user.service';
import { AuthService } from './core/services/auth.service';
import { TourService } from './core/services/tour.service';
import { TourOverlayComponent } from './shared/components/tour-overlay/tour-overlay.component';
import { DialogComponent } from './shared/components/dialog/dialog.component';
import { DialogService } from './shared/components/dialog/dialog.service';
import { DASHBOARD_TOUR_STEPS } from './core/tour/tour.config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TourOverlayComponent, DialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('Dip Hunter');
  protected readonly mobileMenuOpen = signal(false);
  protected readonly showUserMenu = signal(false);
  protected readonly showLangMenu = signal(false);
  protected readonly isAuthPage = signal(false);

  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  readonly tourService = inject(TourService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(DialogService);

  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userMenuContainer = this.elementRef.nativeElement.querySelector('.user-menu-container');
    const langMenuContainer = this.elementRef.nativeElement.querySelector('.lang-menu-container');
    
    if (userMenuContainer && !userMenuContainer.contains(target)) {
      this.showUserMenu.set(false);
    }
    if (langMenuContainer && !langMenuContainer.contains(target)) {
      this.showLangMenu.set(false);
    }
  }

  constructor(
    public themeService: ThemeService,
    public lang: LanguageService,
    public userService: UserService,
    public authService: AuthService
  ) {
    // Track if we're on auth pages to hide header
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((event: NavigationEnd) => {
      this.isAuthPage.set(event.urlAfterRedirects.startsWith('/auth'));
      this.closeMobileMenu();
      this.showUserMenu.set(false);
      
      // Re-highlight current step when navigating (for tour)
      if (this.tourService.isActive()) {
        setTimeout(() => this.tourService.highlightCurrentStep(), 300);
      }

      // Auto-start tour for first-time users after login redirect
      if (this.authService.isAuthenticated() && !event.urlAfterRedirects.startsWith('/auth')) {
        this.tourService.setUser(this.authService.user()?.id ?? null);
        if (!this.tourService.isCompleted() && !this.tourService.isActive()) {
          setTimeout(() => this.tourService.start(DASHBOARD_TOUR_STEPS), 1000);
        }
      }
    });
  }

  ngOnInit(): void {
    // Check for service worker updates
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates.pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe(async () => {
        const ok = await this.dialog.confirm('A new version of Dip Hunter is available. Load it now?', 'Update Available');
        if (ok) {
          window.location.reload();
        }
      });
    }

    // Set user for tour tracking & start tour for first-time users on initial load
    if (this.authService.isAuthenticated()) {
      this.tourService.setUser(this.authService.user()?.id ?? null);
      if (!this.tourService.isCompleted() && !this.isAuthPage()) {
        setTimeout(() => this.tourService.start(DASHBOARD_TOUR_STEPS), 1000);
      }
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
    this.showLangMenu.set(false);
  }

  toggleLangMenu(): void {
    this.showLangMenu.update(v => !v);
    this.showUserMenu.set(false);
  }

  selectLanguage(langCode: Language): void {
    this.lang.setLanguage(langCode);
    this.showLangMenu.set(false);
  }

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.lang.setLanguage(select.value as Language);
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
  }

  getUserInitials(): string {
    const user = this.authService.user();
    if (!user) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
