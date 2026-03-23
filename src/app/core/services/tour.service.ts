/**
 * Tour Service
 * Manages the First-Time User Tour state and navigation
 * Author: Roshan Mali
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TourStep, DASHBOARD_TOUR_STEPS } from '../tour/tour.config';

const TOUR_STORAGE_PREFIX = 'dip_hunter_tour_completed';
const TOUR_STEP_PREFIX = 'dip_hunter_tour_step';

@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly router = inject(Router);
  private _userId: string | null = null;

  private get storageKey(): string {
    return this._userId ? `${TOUR_STORAGE_PREFIX}_${this._userId}` : TOUR_STORAGE_PREFIX;
  }

  private get stepKey(): string {
    return this._userId ? `${TOUR_STEP_PREFIX}_${this._userId}` : TOUR_STEP_PREFIX;
  }

  /** Set the current user so tour completion is tracked per user */
  setUser(userId: string | null): void {
    this._userId = userId;
  }
  
  // State signals
  private readonly _steps = signal<TourStep[]>([]);
  private readonly _currentIndex = signal<number>(0);
  private readonly _isActive = signal<boolean>(false);
  private readonly _highlightedElement = signal<HTMLElement | null>(null);
  /** Fires true when tour finishes/skips for the very first time (before data-source chosen) */
  private readonly _justFinished = signal(false);

  // Computed values
  readonly steps = this._steps.asReadonly();
  readonly currentIndex = this._currentIndex.asReadonly();
  readonly isActive = this._isActive.asReadonly();
  /** Consumed once by dashboard to show post-tour popup */
  readonly justFinished = this._justFinished.asReadonly();
  readonly highlightedElement = this._highlightedElement.asReadonly();
  
  readonly currentStep = computed(() => {
    const steps = this._steps();
    const index = this._currentIndex();
    return steps.length > 0 && index < steps.length ? steps[index] : null;
  });

  readonly totalSteps = computed(() => this._steps().length);
  
  readonly isFirstStep = computed(() => this._currentIndex() === 0);
  readonly isLastStep = computed(() => this._currentIndex() === this._steps().length - 1);

  readonly progress = computed(() => {
    const total = this._steps().length;
    if (total === 0) return 0;
    return ((this._currentIndex() + 1) / total) * 100;
  });

  /**
   * Check if the tour has been completed
   */
  isCompleted(): boolean {
    return localStorage.getItem(this.storageKey) === 'true';
  }

  /**
   * Start the tour with given steps
   */
  start(steps: TourStep[] = DASHBOARD_TOUR_STEPS): void {
    this._steps.set(steps);
    
    // Check if there's a saved step
    const savedStep = localStorage.getItem(this.stepKey);
    const startIndex = savedStep ? parseInt(savedStep, 10) : 0;
    
    this._currentIndex.set(Math.min(startIndex, steps.length - 1));
    this._isActive.set(true);
    
    // Navigate to the step's route if specified
    this.navigateToStep();
    this.highlightCurrentStep();
  }

  /**
   * Go to the next step
   */
  next(): void {
    if (this._currentIndex() < this._steps().length - 1) {
      this.clearHighlight();
      this._currentIndex.update(i => i + 1);
      this.saveProgress();
      this.navigateToStep();
      
      // Delay highlight to allow route transition
      setTimeout(() => this.highlightCurrentStep(), 100);
    } else {
      this.finish();
    }
  }

  /**
   * Go to the previous step
   */
  previous(): void {
    if (this._currentIndex() > 0) {
      this.clearHighlight();
      this._currentIndex.update(i => i - 1);
      this.saveProgress();
      this.navigateToStep();
      
      setTimeout(() => this.highlightCurrentStep(), 100);
    }
  }

  /**
   * Skip and close the tour
   */
  skip(): void {
    this.finish();
  }

  /**
   * Complete the tour
   */
  finish(): void {
    this.clearHighlight();
    const isFirstTime = !localStorage.getItem('dh_welcome_shown');
    localStorage.setItem(this.storageKey, 'true');
    localStorage.removeItem(this.stepKey);
    this._isActive.set(false);
    this._currentIndex.set(0);
    if (isFirstTime) {
      this._justFinished.set(true);
    }
  }

  /** Reset the justFinished flag after the consumer has handled it */
  consumeJustFinished(): void {
    this._justFinished.set(false);
  }

  /**
   * Restart the tour
   */
  restart(steps: TourStep[] = DASHBOARD_TOUR_STEPS): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.stepKey);
    this.start(steps);
  }

  /**
   * Navigate to the current step's route
   */
  private navigateToStep(): void {
    const step = this.currentStep();
    if (step?.route && this.router.url !== step.route) {
      this.router.navigate([step.route]);
    }
  }

  /**
   * Save current progress
   */
  private saveProgress(): void {
    localStorage.setItem(this.stepKey, this._currentIndex().toString());
  }

  /**
   * Highlight the current step's target element
   */
  highlightCurrentStep(): void {
    this.clearHighlight();
    
    const step = this.currentStep();
    if (!step?.targetSelector) return;

    // Wait for DOM to be ready
    setTimeout(() => {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      if (element) {
        element.classList.add('tour-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this._highlightedElement.set(element);
      }
    }, 50);
  }

  /**
   * Clear the current highlight
   */
  private clearHighlight(): void {
    const element = this._highlightedElement();
    if (element) {
      element.classList.remove('tour-highlight');
      this._highlightedElement.set(null);
    }
    
    // Also clear any stale highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
  }

  /**
   * Get the position for the tooltip relative to target element
   */
  getTooltipPosition(): { top: string; left: string; transform: string } {
    const step = this.currentStep();
    const element = this._highlightedElement();
    
    // Center position for welcome/complete steps
    if (!step?.targetSelector || step.position === 'center' || !element) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = element.getBoundingClientRect();
    const padding = step.highlightPadding || 12;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    
    let top: number;
    let left: number;

    switch (step.position) {
      case 'top':
        top = rect.top - tooltipHeight - padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + padding;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + padding;
        break;
      default:
        top = rect.bottom + padding;
        left = rect.left;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Mobile: always show at bottom center
    if (viewportWidth < 640) {
      return {
        top: 'auto',
        left: '50%',
        transform: 'translateX(-50%)'
      };
    }

    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none'
    };
  }
}
