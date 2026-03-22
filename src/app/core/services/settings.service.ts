/**
 * Settings Service - Application preferences and red rule logic
 */

import { Injectable, signal, computed } from '@angular/core';
import { AppSettings, DEFAULT_SETTINGS, RedRule } from '../models/settings.model';
import { Quote } from '../models/quote.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly _settings = signal<AppSettings>(DEFAULT_SETTINGS);

  readonly settings = this._settings.asReadonly();
  
  readonly redRule = computed(() => this._settings().redRule);
  readonly autoRefresh = computed(() => this._settings().autoRefresh);
  readonly refreshInterval = computed(() => this._settings().refreshIntervalSeconds);

  constructor(private storage: StorageService) {
    this.loadFromStorage();
  }

  /**
   * Load settings from storage
   */
  private loadFromStorage(): void {
    const stored = this.storage.get<AppSettings>('dh_settings');
    if (stored) {
      // Merge stored with defaults, ensuring new fields get default values
      const merged: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...stored,
        // Ensure critical new fields use defaults if not present in stored
        quoteDataSource: stored.quoteDataSource || DEFAULT_SETTINGS.quoteDataSource,
        // Migrate old '/api/quotes' value (caused double-path bug) to '' (same origin)
        yahooProxyUrl: stored.yahooProxyUrl === '/api/quotes' ? '' : (stored.yahooProxyUrl ?? ''),
      };
      this._settings.set(merged);
      // Save merged settings to update storage with new fields
      this.storage.set('dh_settings', merged);
    } else {
      this._settings.set(DEFAULT_SETTINGS);
      this.storage.set('dh_settings', DEFAULT_SETTINGS);
    }
  }

  /**
   * Update settings
   */
  updateSettings(patch: Partial<AppSettings>): void {
    const updated: AppSettings = {
      ...this._settings(),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this._settings.set(updated);
    this.storage.set('dh_settings', updated);
  }

  /**
   * Update red rule
   */
  updateRedRule(rule: RedRule): void {
    this.updateSettings({ redRule: rule });
  }

  /**
   * Check if a quote meets the RED condition
   * MVP: changePercent < 0
   */
  isRed(quote: Quote | undefined): boolean {
    if (!quote) return false;

    const rule = this._settings().redRule;
    
    switch (rule.type) {
      case 'CHANGE_PERCENT_NEGATIVE':
        return quote.changePercent < 0;
      
      case 'CHANGE_PERCENT_THRESHOLD':
        return quote.changePercent <= (rule.threshold ?? 0);
      
      case 'BELOW_SMA':
        // Future: Implement SMA-based red rule
        return quote.changePercent < 0;
      
      default:
        return quote.changePercent < 0;
    }
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults(): void {
    this._settings.set(DEFAULT_SETTINGS);
    this.storage.set('dh_settings', DEFAULT_SETTINGS);
  }
}
