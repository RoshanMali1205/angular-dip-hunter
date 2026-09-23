/**
 * Daily investment-idea card.
 * Gemini writes a fresh brief once per IST day after login.
 * Closing the card hides it until the next calendar day.
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { PortfolioService } from './portfolio.service';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { HoldingsService } from './holdings.service';
import { LanguageService } from './language.service';
import { istCalendarDate } from './dip-signal.service';
import { resolveAiEndpoint } from '../utils/ai-endpoint';
import {
  AiIdeasRequest,
  AiIdeasResponse,
  DailyIdeasBrief,
  IdeaConviction,
  IdeaHorizon,
  InvestmentIdea,
} from '../models/plan.model';

const GEMINI_DISCLAIMER = 'AI-assisted suggestion — not financial advice.';

interface IdeaStockInput {
  symbol: string;
  displayName: string;
  sector?: string;
  price?: number;
  changePercent?: number;
  holdingQty?: number;
}

interface UserIdeasState {
  dismissedOn?: string;
  brief?: DailyIdeasBrief;
}

interface DailyIdeasStore {
  users: Record<string, UserIdeasState>;
}

@Injectable({ providedIn: 'root' })
export class DailyIdeasService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);
  private auth = inject(AuthService);
  private portfolio = inject(PortfolioService);
  private quotes = inject(QuoteService);
  private settings = inject(SettingsService);
  private currency = inject(CurrencyService);
  private holdings = inject(HoldingsService);
  private lang = inject(LanguageService);

  readonly visible = signal(false);
  readonly loading = signal(false);
  readonly brief = signal<DailyIdeasBrief | null>(null);

  private inFlight = false;
  private requestToken = 0;

  /** Show today's card, reusing the cached brief or asking Gemini once. */
  presentToday(): void {
    if (!this.auth.isAuthenticated()) {
      this.visible.set(false);
      return;
    }

    const today = istCalendarDate();
    const userId = this.currentUserId();
    const state = this.read(userId);

    if (state.dismissedOn === today) {
      this.visible.set(false);
      return;
    }

    if (state.brief?.asOfDate === today && state.brief.ideas.length > 0) {
      this.brief.set(state.brief);
      this.loading.set(false);
      this.visible.set(true);
      return;
    }

    const stocks = this.snapshot();
    if (stocks.length === 0) {
      this.visible.set(false);
      return;
    }

    if (this.inFlight) {
      this.visible.set(true);
      return;
    }

    this.inFlight = true;
    this.loading.set(true);
    this.visible.set(true);
    const token = ++this.requestToken;

    this.fetch(stocks).subscribe((brief) => {
      if (token !== this.requestToken) return;
      this.inFlight = false;
      const stamped: DailyIdeasBrief = { ...brief, asOfDate: today };
      this.write(userId, { ...this.read(userId), brief: stamped });
      if (this.read(userId).dismissedOn === today) {
        this.loading.set(false);
        this.visible.set(false);
        return;
      }
      this.brief.set(stamped);
      this.loading.set(false);
      this.visible.set(true);
    });
  }

  /** Hide the card until the next IST day. */
  dismiss(): void {
    if (!this.auth.isAuthenticated()) {
      this.visible.set(false);
      return;
    }
    this.requestToken += 1;
    this.inFlight = false;
    const userId = this.currentUserId();
    this.write(userId, { ...this.read(userId), dismissedOn: istCalendarDate() });
    this.loading.set(false);
    this.visible.set(false);
  }

  private currentUserId(): string {
    return this.auth.user()?.id || 'local';
  }

  private read(userId: string): UserIdeasState {
    const store = this.storage.get<DailyIdeasStore>('dh_daily_ideas');
    return store?.users?.[userId] ?? {};
  }

  private write(userId: string, state: UserIdeasState): void {
    const store = this.storage.get<DailyIdeasStore>('dh_daily_ideas') ?? { users: {} };
    this.storage.set('dh_daily_ideas', {
      users: { ...(store.users ?? {}), [userId]: state },
    });
  }

  private snapshot(): IdeaStockInput[] {
    const quotes = this.quotes.quotes();
    return this.portfolio
      .activeStocks()
      .slice(0, 30)
      .map((stock) => {
        const quote = quotes[stock.symbol];
        return {
          symbol: stock.symbol,
          displayName: stock.displayName,
          sector: stock.sector,
          price: quote?.price,
          changePercent: quote?.changePercent,
          holdingQty: this.holdings.getHolding(stock.id)?.totalQty,
        };
      });
  }

  private fetch(stocks: IdeaStockInput[]) {
    const body: AiIdeasRequest = {
      action: 'ideas',
      currency: this.currency.displayCurrency(),
      stocks,
    };

    return this.http
      .post<AiIdeasResponse>(resolveAiEndpoint(this.settings.settings().yahooProxyUrl), body)
      .pipe(
        map((res) => this.normalize(res?.ideas, stocks)),
        catchError(() => of(this.localBrief(stocks)))
      );
  }

  private normalize(
    raw: AiIdeasResponse['ideas'] | undefined,
    stocks: IdeaStockInput[]
  ): DailyIdeasBrief {
    const bySymbol = new Map(stocks.map((stock) => [stock.symbol, stock]));
    const ideas: InvestmentIdea[] = [];
    const seen = new Set<string>();

    for (const row of raw?.ideas ?? []) {
      const stock = bySymbol.get(row.symbol);
      if (!stock || seen.has(stock.symbol)) continue;
      seen.add(stock.symbol);
      ideas.push({
        symbol: stock.symbol,
        displayName: stock.displayName,
        thesis: row.thesis?.trim() || this.localThesis(stock),
        horizon: this.asHorizon(row.horizon),
        conviction: this.asConviction(row.conviction),
        riskNote: row.riskNote?.trim() || this.lang.t('dailyIdeas.localRisk'),
      });
      if (ideas.length >= 3) break;
    }

    if (ideas.length === 0) return this.localBrief(stocks);

    return {
      asOfDate: istCalendarDate(),
      headline: raw?.headline?.trim() || this.lang.t('dailyIdeas.localHeadline'),
      ideas,
      provider: 'gemini',
      model: raw?.model,
      disclaimer: raw?.disclaimer?.trim() || GEMINI_DISCLAIMER,
    };
  }

  private localBrief(stocks: IdeaStockInput[]): DailyIdeasBrief {
    const ranked = [...stocks].sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0));
    return {
      asOfDate: istCalendarDate(),
      headline: this.lang.t('dailyIdeas.localHeadline'),
      ideas: ranked.slice(0, 3).map((stock) => ({
        symbol: stock.symbol,
        displayName: stock.displayName,
        horizon: 'medium',
        conviction: (stock.changePercent ?? 0) <= -2 ? 'high' : 'medium',
        thesis: this.localThesis(stock),
        riskNote: this.lang.t('dailyIdeas.localRisk'),
      })),
      provider: 'local',
      disclaimer: this.lang.t('dailyIdeas.localRisk'),
    };
  }

  private localThesis(stock: IdeaStockInput): string {
    return this.lang.t('dailyIdeas.localThesis', {
      name: stock.displayName,
      change: this.formatChange(stock.changePercent),
    });
  }

  private formatChange(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return this.lang.t('dailyIdeas.emptyChange');
    }
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  private asHorizon(value: string | undefined): IdeaHorizon {
    return value === 'short' || value === 'long' ? value : 'medium';
  }

  private asConviction(value: string | undefined): IdeaConviction {
    return value === 'high' || value === 'low' ? value : 'medium';
  }
}
