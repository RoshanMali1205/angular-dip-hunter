import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';

/** Independence Day (15 Aug) end-of-day in India Standard Time. */
export const INDEPENDENCE_DAY_EOD_IST = new Date('2026-08-15T23:59:59.999+05:30');

const CHAKRA_SPOKES = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * Math.PI) / 12;
  return {
    x2: 18 + 3 * Math.cos(angle),
    y2: 12 + 3 * Math.sin(angle),
  };
});

@Component({
  selector: 'app-independence-day-flag',
  standalone: true,
  template: `
    @if (visible()) {
      <div
        class="independence-flag"
        role="img"
        aria-label="Happy Independence Day India"
        title="Happy Independence Day"
      >
        <svg viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="36" height="8" y="0" fill="#FF9933" />
          <rect width="36" height="8" y="8" fill="#FFFFFF" />
          <rect width="36" height="8" y="16" fill="#138808" />
          <circle cx="18" cy="12" r="3.2" fill="none" stroke="#000080" stroke-width="0.7" />
          @for (spoke of chakraSpokes; track $index) {
            <line
              x1="18"
              y1="12"
              [attr.x2]="spoke.x2"
              [attr.y2]="spoke.y2"
              stroke="#000080"
              stroke-width="0.35"
            />
          }
          <circle cx="18" cy="12" r="0.55" fill="#000080" />
        </svg>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .independence-flag {
      position: fixed;
      z-index: 35;
      right: 1rem;
      bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
      width: 3rem;
      height: 2rem;
      border-radius: 0.35rem;
      overflow: hidden;
      box-shadow:
        0 4px 14px rgb(0 0 0 / 0.28),
        0 0 0 1px rgb(255 255 255 / 0.35);
      pointer-events: none;
      animation: flag-float 3.2s ease-in-out infinite;
    }

    .independence-flag svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    @media (min-width: 768px) {
      .independence-flag {
        bottom: 1.25rem;
        width: 3.25rem;
        height: 2.15rem;
      }
    }

    @keyframes flag-float {
      0%,
      100% {
        transform: translateY(0) rotate(-1deg);
      }
      50% {
        transform: translateY(-6px) rotate(1deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .independence-flag {
        animation: none;
      }
    }
  `,
})
export class IndependenceDayFlagComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly visible = signal(false);
  protected readonly chakraSpokes = CHAKRA_SPOKES;

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.refreshVisibility();

    const msUntilHide = INDEPENDENCE_DAY_EOD_IST.getTime() - Date.now();
    // setTimeout max delay is ~24.8 days; only schedule when within that window
    if (msUntilHide > 0 && msUntilHide < 2_147_000_000) {
      this.hideTimer = setTimeout(() => this.visible.set(false), msUntilHide);
    }

    this.destroyRef.onDestroy(() => {
      if (this.hideTimer !== null) {
        clearTimeout(this.hideTimer);
      }
    });
  }

  private refreshVisibility(): void {
    this.visible.set(Date.now() <= INDEPENDENCE_DAY_EOD_IST.getTime());
  }
}
