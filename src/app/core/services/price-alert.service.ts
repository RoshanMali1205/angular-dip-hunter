/**
 * Price Alert Service
 * Monitors quote updates and fires browser notifications when
 * a stock's changePercent crosses the user-configured threshold.
 */

import { Injectable, signal } from '@angular/core';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { Quote } from '../models/quote.model';

/** Cooldown between repeat notifications per symbol (4 hours) */
const COOLDOWN_MS = 4 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class PriceAlertService {
  /** Current browser notification permission */
  readonly permissionStatus = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  /** Whether browser notifications are supported */
  readonly isSupported = typeof Notification !== 'undefined';

  /** Per-symbol last-fired timestamp (in-memory, resets on page reload) */
  private readonly lastFired = new Map<string, number>();

  constructor(
    private readonly quoteService: QuoteService,
    private readonly settingsService: SettingsService
  ) {
    // Subscribe to every quote update and check thresholds
    this.quoteService.quotes$.subscribe(quotes => {
      if (this.permissionStatus() === 'granted') {
        this.checkAlerts(quotes);
      }
    });
  }

  /**
   * Request browser notification permission.
   * Returns the resulting permission status.
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return 'denied';
    const result = await Notification.requestPermission();
    this.permissionStatus.set(result);
    return result;
  }

  /**
   * Check all alerts against the latest quotes and fire
   * a notification for any that have crossed their threshold.
   */
  private checkAlerts(quotes: Record<string, Quote>): void {
    const alerts = this.settingsService.settings().priceAlerts;
    if (!alerts || Object.keys(alerts).length === 0) return;

    const now = Date.now();

    for (const [symbol, threshold] of Object.entries(alerts)) {
      const quote = quotes[symbol];
      if (!quote) continue;

      // Fire when changePercent <= threshold (threshold is stored as a negative number)
      if (quote.changePercent <= threshold) {
        const lastFiredAt = this.lastFired.get(symbol) ?? 0;
        if (now - lastFiredAt > COOLDOWN_MS) {
          this.fireNotification(symbol, quote, threshold);
          this.lastFired.set(symbol, now);
        }
      }
    }
  }

  private fireNotification(symbol: string, quote: Quote, threshold: number): void {
    try {
      new Notification(`🔔 Dip Alert: ${symbol}`, {
        body: `${symbol} is down ${Math.abs(quote.changePercent).toFixed(2)}% today`
          + ` (alert set at ${Math.abs(threshold)}% dip)`
          + ` · Current: ₹${quote.price.toFixed(2)}`,
        icon: '/icons/icon-192x192.png',
        tag: `dip-alert-${symbol}`,   // Replaces any existing notification for this symbol
        renotify: true
      } as NotificationOptions);
    } catch {
      // Notifications may be blocked by some environments — fail silently
    }
  }
}
