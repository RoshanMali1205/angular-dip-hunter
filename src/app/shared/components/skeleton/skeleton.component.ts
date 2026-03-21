/**
 * Skeleton Loader Components
 * Reusable skeleton loading components for all pages
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// Base skeleton pulse animation
const skeletonBaseClasses = 'animate-pulse rounded';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="getClasses()" [style.width]="width" [style.height]="height"></div>
  `
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '1rem';
  @Input() rounded: 'sm' | 'md' | 'lg' | 'xl' | 'full' = 'md';
  @Input() isDark = true;

  getClasses(): string {
    const roundedClass = `rounded-${this.rounded}`;
    const bgClass = this.isDark ? 'bg-slate-700/50' : 'bg-gray-200';
    return `animate-pulse ${roundedClass} ${bgClass}`;
  }
}

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-4"
         [class.border-slate-700/50]="isDark"
         [class.bg-slate-800/30]="isDark"
         [class.border-gray-200]="!isDark"
         [class.bg-gray-50]="!isDark">
      <div class="animate-pulse space-y-3">
        <div class="h-3 w-1/2 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
        <div class="h-7 w-3/4 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </div>
    </div>
  `
})
export class SkeletonCardComponent {
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-table-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <tr class="border-b"
        [class.border-slate-700/50]="isDark"
        [class.border-gray-200]="!isDark">
      @for (col of columns; track $index) {
        <td class="px-4 py-3">
          <div class="animate-pulse h-4 rounded"
               [style.width]="col"
               [class.bg-slate-700/50]="isDark"
               [class.bg-gray-200]="!isDark"></div>
        </td>
      }
    </tr>
  `
})
export class SkeletonTableRowComponent {
  @Input() columns: string[] = ['60%', '40%', '30%', '30%', '20%'];
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-stock-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <tr class="border-b"
        [class.border-slate-700/50]="isDark"
        [class.border-gray-200]="!isDark">
      <td class="px-4 py-3">
        <div class="animate-pulse flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg"
               [class.bg-slate-700/50]="isDark"
               [class.bg-gray-200]="!isDark"></div>
          <div class="space-y-1.5">
            <div class="h-4 w-20 rounded"
                 [class.bg-slate-700/50]="isDark"
                 [class.bg-gray-200]="!isDark"></div>
            <div class="h-3 w-32 rounded"
                 [class.bg-slate-700/50]="isDark"
                 [class.bg-gray-200]="!isDark"></div>
          </div>
        </div>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="animate-pulse ml-auto h-5 w-16 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="animate-pulse ml-auto h-5 w-14 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-right hidden md:table-cell">
        <div class="animate-pulse ml-auto h-5 w-12 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-right hidden lg:table-cell">
        <div class="animate-pulse ml-auto h-5 w-16 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-center">
        <div class="animate-pulse mx-auto h-6 w-6 rounded-full"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
    </tr>
  `
})
export class SkeletonStockRowComponent {
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-transaction-row',
  standalone: true,
  imports: [CommonModule],
  template: `
    <tr class="border-b"
        [class.border-slate-700/50]="isDark"
        [class.border-gray-200]="!isDark">
      <td class="px-4 py-3">
        <div class="animate-pulse h-4 w-24 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3">
        <div class="animate-pulse h-4 w-16 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3">
        <div class="animate-pulse h-5 w-12 rounded-full"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="animate-pulse ml-auto h-4 w-10 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="animate-pulse ml-auto h-4 w-14 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
      <td class="px-4 py-3 text-right hidden md:table-cell">
        <div class="animate-pulse ml-auto h-4 w-16 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </td>
    </tr>
  `
})
export class SkeletonTransactionRowComponent {
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-6"
         [class.border-slate-700/50]="isDark"
         [class.bg-slate-800/30]="isDark"
         [class.border-gray-200]="!isDark"
         [class.bg-gray-50]="!isDark">
      <div class="animate-pulse space-y-4">
        <div class="h-4 w-1/4 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
        <div class="flex items-end gap-2 h-48">
          @for (i of [1,2,3,4,5,6,7,8,9,10,11,12]; track i) {
            <div class="flex-1 rounded-t"
                 [style.height.%]="20 + (i * 5) % 60"
                 [class.bg-slate-700/50]="isDark"
                 [class.bg-gray-200]="!isDark"></div>
          }
        </div>
      </div>
    </div>
  `
})
export class SkeletonChartComponent {
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-folder-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-4"
         [class.border-slate-700/50]="isDark"
         [class.bg-slate-800/30]="isDark"
         [class.border-gray-200]="!isDark"
         [class.bg-gray-50]="!isDark">
      <div class="animate-pulse space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg"
                 [class.bg-slate-700/50]="isDark"
                 [class.bg-gray-200]="!isDark"></div>
            <div class="space-y-1.5">
              <div class="h-4 w-24 rounded"
                   [class.bg-slate-700/50]="isDark"
                   [class.bg-gray-200]="!isDark"></div>
              <div class="h-3 w-16 rounded"
                   [class.bg-slate-700/50]="isDark"
                   [class.bg-gray-200]="!isDark"></div>
            </div>
          </div>
          <div class="h-6 w-6 rounded"
               [class.bg-slate-700/50]="isDark"
               [class.bg-gray-200]="!isDark"></div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="h-12 rounded-lg"
               [class.bg-slate-700/30]="isDark"
               [class.bg-gray-100]="!isDark"></div>
          <div class="h-12 rounded-lg"
               [class.bg-slate-700/30]="isDark"
               [class.bg-gray-100]="!isDark"></div>
        </div>
      </div>
    </div>
  `
})
export class SkeletonFolderCardComponent {
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-plan-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-4"
         [class.border-slate-700/50]="isDark"
         [class.bg-slate-800/30]="isDark"
         [class.border-gray-200]="!isDark"
         [class.bg-gray-50]="!isDark">
      <div class="animate-pulse space-y-3">
        <div class="flex items-center justify-between">
          <div class="h-5 w-32 rounded"
               [class.bg-slate-700/50]="isDark"
               [class.bg-gray-200]="!isDark"></div>
          <div class="h-5 w-16 rounded-full"
               [class.bg-slate-700/50]="isDark"
               [class.bg-gray-200]="!isDark"></div>
        </div>
        <div class="space-y-2">
          @for (i of [1, 2, 3]; track i) {
            <div class="flex items-center justify-between py-2 border-b"
                 [class.border-slate-700/30]="isDark"
                 [class.border-gray-100]="!isDark">
              <div class="h-4 w-20 rounded"
                   [class.bg-slate-700/50]="isDark"
                   [class.bg-gray-200]="!isDark"></div>
              <div class="h-4 w-12 rounded"
                   [class.bg-slate-700/50]="isDark"
                   [class.bg-gray-200]="!isDark"></div>
            </div>
          }
        </div>
        <div class="h-8 w-full rounded-lg"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
      </div>
    </div>
  `
})
export class SkeletonPlanCardComponent {
  @Input() isDark = true;
}

@Component({
  selector: 'app-skeleton-settings-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-xl border p-6"
         [class.border-slate-700/50]="isDark"
         [class.bg-slate-800/30]="isDark"
         [class.border-gray-200]="!isDark"
         [class.bg-gray-50]="!isDark">
      <div class="animate-pulse space-y-4">
        <div class="h-5 w-1/3 rounded"
             [class.bg-slate-700/50]="isDark"
             [class.bg-gray-200]="!isDark"></div>
        <div class="space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="flex items-center justify-between">
              <div class="h-4 w-1/4 rounded"
                   [class.bg-slate-700/50]="isDark"
                   [class.bg-gray-200]="!isDark"></div>
              <div class="h-8 w-24 rounded-lg"
                   [class.bg-slate-700/50]="isDark"
                   [class.bg-gray-200]="!isDark"></div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class SkeletonSettingsSectionComponent {
  @Input() isDark = true;
}

// Export all skeleton components
export const SKELETON_COMPONENTS = [
  SkeletonComponent,
  SkeletonCardComponent,
  SkeletonTableRowComponent,
  SkeletonStockRowComponent,
  SkeletonTransactionRowComponent,
  SkeletonChartComponent,
  SkeletonFolderCardComponent,
  SkeletonPlanCardComponent,
  SkeletonSettingsSectionComponent
];
