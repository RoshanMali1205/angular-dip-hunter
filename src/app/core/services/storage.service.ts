/**
 * Storage Service - LocalStorage/IndexedDB abstraction
 */

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type StorageKey =
  | 'dh_folders'
  | 'dh_stocks'
  | 'dh_plans'
  | 'dh_transactions'
  | 'dh_drafts'
  | 'dh_settings'
  | 'dh_quote_cache'
  | 'dh_exchange_rates'
  | 'dh_user';

export interface StorageWriteOptions {
  /** Skip cloud snapshot push (used while hydrating from Supabase). */
  localOnly?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  readonly persisted$ = new Subject<{ key: StorageKey }>();
  
  /**
   * Get item from localStorage
   */
  get<T>(key: StorageKey): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error reading from storage [${key}]:`, error);
      return null;
    }
  }

  /**
   * Set item in localStorage
   */
  set<T>(key: StorageKey, value: T, options?: StorageWriteOptions): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      if (!options?.localOnly) {
        this.persisted$.next({ key });
      }
      return true;
    } catch (error) {
      console.error(`Error writing to storage [${key}]:`, error);
      return false;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from storage [${key}]:`, error);
    }
  }

  /**
   * Clear all app data
   */
  clearAll(): void {
    const keys: StorageKey[] = [
      'dh_folders',
      'dh_stocks',
      'dh_plans',
      'dh_transactions',
      'dh_drafts',
      'dh_settings',
      'dh_quote_cache',
      'dh_exchange_rates',
      'dh_user'
    ];
    keys.forEach(key => this.remove(key));
  }

  /**
   * Export all data as JSON
   */
  exportAll(): Record<string, unknown> {
    return {
      folders: this.get('dh_folders'),
      stocks: this.get('dh_stocks'),
      plans: this.get('dh_plans'),
      transactions: this.get('dh_transactions'),
      settings: this.get('dh_settings'),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from JSON backup
   */
  importAll(data: Record<string, unknown>): boolean {
    try {
      if (data['folders']) this.set('dh_folders', data['folders']);
      if (data['stocks']) this.set('dh_stocks', data['stocks']);
      if (data['plans']) this.set('dh_plans', data['plans']);
      if (data['transactions']) this.set('dh_transactions', data['transactions']);
      if (data['settings']) this.set('dh_settings', data['settings']);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}
