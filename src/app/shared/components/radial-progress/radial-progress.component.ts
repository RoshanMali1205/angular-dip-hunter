/**
 * Radial Progress Component
 * SVG-based radial progress indicator with customizable colors and labels
 */

import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-radial-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative flex flex-col items-center">
      <!-- SVG Radial -->
      <div class="relative" [style.width.px]="size()" [style.height.px]="size()">
        <svg [attr.width]="size()" [attr.height]="size()" class="transform -rotate-90">
          <!-- Background circle -->
          <circle 
            [attr.cx]="center()" 
            [attr.cy]="center()" 
            [attr.r]="radius()"
            stroke-width="6"
            fill="none"
            [class]="isDark() ? 'stroke-slate-700' : 'stroke-gray-200'"
          />
          <!-- Progress circle -->
          <circle 
            [attr.cx]="center()" 
            [attr.cy]="center()" 
            [attr.r]="radius()"
            stroke-width="6"
            fill="none"
            stroke-linecap="round"
            [attr.stroke-dasharray]="circumference()"
            [attr.stroke-dashoffset]="strokeDashoffset()"
            [style.stroke]="strokeColor()"
            class="transition-all duration-700 ease-out"
          />
        </svg>
        <!-- Center Content -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-base font-bold"
                [class.text-white]="isDark()"
                [class.text-gray-900]="!isDark()">
            {{ displayValue() }}
          </span>
        </div>
      </div>
      <!-- Label -->
      <span class="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-center"
            [class.text-slate-400]="isDark()"
            [class.text-gray-500]="!isDark()">
        {{ label() }}
      </span>
    </div>
  `
})
export class RadialProgressComponent {
  // Inputs
  value = input.required<number>();
  max = input<number>(100);
  label = input<string>('');
  color = input<'emerald' | 'blue' | 'red' | 'purple' | 'cyan' | 'amber'>('emerald');
  size = input<number>(80);
  isDark = input<boolean>(true);
  showPercent = input<boolean>(true);
  suffix = input<string>('%');

  // Computed values
  center = computed(() => this.size() / 2);
  radius = computed(() => (this.size() - 12) / 2); // Account for stroke width
  circumference = computed(() => 2 * Math.PI * this.radius());
  
  percentage = computed(() => {
    const max = this.max();
    if (max === 0) return 0;
    return Math.min(Math.max((this.value() / max) * 100, 0), 100);
  });

  strokeDashoffset = computed(() => {
    const circumference = this.circumference();
    return circumference - (this.percentage() / 100) * circumference;
  });

  displayValue = computed(() => {
    if (this.showPercent()) {
      return `${this.percentage().toFixed(0)}${this.suffix()}`;
    }
    return `${this.value().toFixed(0)}${this.suffix()}`;
  });

  strokeColor = computed(() => {
    const colorMap: Record<string, string> = {
      emerald: '#10b981',
      blue: '#3b82f6',
      red: '#ef4444',
      purple: '#8b5cf6',
      cyan: '#06b6d4',
      amber: '#f59e0b'
    };
    return colorMap[this.color()] || colorMap['emerald'];
  });
}
