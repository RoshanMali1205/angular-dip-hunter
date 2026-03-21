/**
 * Tour Configuration
 * Defines the steps for the First-Time User Tour
 * Author: Roshan Mali
 */

export interface TourStep {
  id: string;
  titleKey: string;        // i18n key for title
  descriptionKey: string;  // i18n key for description
  targetSelector: string;  // CSS selector for the target element
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  route?: string;          // Optional route to navigate to
  highlightPadding?: number; // Extra padding around highlight
}

/**
 * Dashboard Tour Steps
 * These are the main tour steps shown to first-time users
 */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    titleKey: 'tour.welcome.title',
    descriptionKey: 'tour.welcome.description',
    targetSelector: '',
    position: 'center'
  },
  {
    id: 'folder-tabs',
    titleKey: 'tour.folderTabs.title',
    descriptionKey: 'tour.folderTabs.description',
    targetSelector: '[data-tour="folder-tabs"]',
    position: 'bottom',
    route: '/dashboard'
  },
  {
    id: 'kpi-cards',
    titleKey: 'tour.kpiCards.title',
    descriptionKey: 'tour.kpiCards.description',
    targetSelector: '[data-tour="kpi-cards"]',
    position: 'bottom',
    route: '/dashboard'
  },
  {
    id: 'stock-list',
    titleKey: 'tour.stockList.title',
    descriptionKey: 'tour.stockList.description',
    targetSelector: '[data-tour="stock-list"]',
    position: 'top',
    route: '/dashboard'
  },
  {
    id: 'red-candidates',
    titleKey: 'tour.redCandidates.title',
    descriptionKey: 'tour.redCandidates.description',
    targetSelector: '[data-tour="red-candidates"]',
    position: 'left',
    route: '/dashboard'
  },
  {
    id: 'nav-planner',
    titleKey: 'tour.planner.title',
    descriptionKey: 'tour.planner.description',
    targetSelector: '[data-tour="nav-planner"]',
    position: 'right'
  },
  {
    id: 'nav-transactions',
    titleKey: 'tour.transactions.title',
    descriptionKey: 'tour.transactions.description',
    targetSelector: '[data-tour="nav-transactions"]',
    position: 'right'
  },
  {
    id: 'nav-settings',
    titleKey: 'tour.settings.title',
    descriptionKey: 'tour.settings.description',
    targetSelector: '[data-tour="nav-settings"]',
    position: 'right'
  },
  {
    id: 'complete',
    titleKey: 'tour.complete.title',
    descriptionKey: 'tour.complete.description',
    targetSelector: '',
    position: 'center'
  }
];
