/**
 * Finance Buddy — in-app Gemini chat with a local portfolio fallback.
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { HoldingsService } from './holdings.service';
import { PlannerService } from './planner.service';
import { PortfolioService } from './portfolio.service';
import { LanguageService } from './language.service';
import { resolveAiEndpoint } from '../utils/ai-endpoint';
import { formatNseBseReply, matchNseBseFact } from '../knowledge/nse-bse-knowledge';
import {
  AiChatRequest,
  AiChatResponse,
  ChatMessage,
  ChatTable,
} from '../models/plan.model';

const DISCLAIMER = 'Not financial advice.';

@Injectable({
  providedIn: 'root',
})
export class FinanceBuddyService {
  private http = inject(HttpClient);
  private quoteService = inject(QuoteService);
  private settingsService = inject(SettingsService);
  private currencyService = inject(CurrencyService);
  private holdingsService = inject(HoldingsService);
  private plannerService = inject(PlannerService);
  private portfolioService = inject(PortfolioService);
  private lang = inject(LanguageService);

  readonly isOpen = signal(false);
  readonly loading = signal(false);
  readonly messages = signal<ChatMessage[]>([this.welcomeMessage()]);

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  clear(): void {
    this.messages.set([this.welcomeMessage()]);
  }

  send(raw: string): void {
    const text = raw.trim();
    if (!text || this.loading()) return;

    const userMsg: ChatMessage = {
      id: this.nextId(),
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    };
    this.messages.update((list) => [...list, userMsg]);
    this.loading.set(true);

    const history = this.messages()
      .filter((m) => m.id !== userMsg.id)
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }));

    const body: AiChatRequest = {
      action: 'chat',
      message: text,
      history,
      context: this.buildContext(),
    };

    this.http
      .post<AiChatResponse>(
        resolveAiEndpoint(this.settingsService.settings().yahooProxyUrl),
        body
      )
      .pipe(
        map((res) => this.asAssistant(res?.reply, 'gemini', this.tableFor(text))),
        catchError((err: HttpErrorResponse) =>
          of(this.asAssistant(this.fallbackReply(text, err), 'local', this.tableFor(text)))
        )
      )
      .subscribe((assistant) => {
        this.messages.update((list) => [...list, assistant]);
        this.loading.set(false);
      });
  }

  suggestedPrompts(): string[] {
    return [
      this.lang.t('buddy.chipDips'),
      this.lang.t('buddy.chipPlan'),
      this.lang.t('buddy.chipPortfolio'),
      this.lang.t('buddy.chipMarket'),
    ];
  }

  private welcomeMessage(): ChatMessage {
    return {
      id: 'welcome',
      role: 'assistant',
      text: this.lang.t('buddy.welcome'),
      provider: 'local',
      createdAt: new Date().toISOString(),
    };
  }

  private asAssistant(
    text: string | undefined,
    provider: 'gemini' | 'local',
    table?: ChatTable
  ): ChatMessage {
    const fallback = this.localReply('help');
    return {
      id: this.nextId(),
      role: 'assistant',
      text: (text && text.trim()) || fallback,
      provider,
      createdAt: new Date().toISOString(),
      table,
    };
  }

  private nextId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private redCandidates(): {
    symbol: string;
    displayName: string;
    changePercent?: number;
    price?: number;
  }[] {
    const quotes = this.quoteService.quotes();
    return this.portfolioService
      .activeStocks()
      .map((stock) => {
        const quote = quotes[stock.symbol];
        return {
          symbol: stock.symbol,
          displayName: stock.displayName,
          changePercent: quote?.changePercent,
          price: quote?.price,
          isRed: this.settingsService.isRed(quote),
        };
      })
      .filter((row) => row.isRed)
      .map(({ symbol, displayName, changePercent, price }) => ({
        symbol,
        displayName,
        changePercent,
        price,
      }))
      .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0));
  }

  private formatChange(value?: number): string {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  private tableFor(message: string): ChatTable | undefined {
    if (matchNseBseFact(message)) return undefined;
    const q = message.toLowerCase();
    if (/dip|red|buy/.test(q)) return this.dipsTable();
    if (/plan|budget|allocat/.test(q)) return this.planTable();
    if (/portfolio|holding|p\/?l|pnl|invest/.test(q)) return this.portfolioTable();
    return undefined;
  }

  private dipsTable(): ChatTable | undefined {
    const reds = this.redCandidates().slice(0, 12);
    if (reds.length === 0) return undefined;

    return {
      columns: [
        { key: 'stock', label: this.lang.t('buddy.colStock'), align: 'left' },
        { key: 'change', label: this.lang.t('buddy.colChange'), align: 'right', tone: 'change' },
        { key: 'price', label: this.lang.t('buddy.colPrice'), align: 'right' },
      ],
      rows: reds.map((r) => ({
        stock: r.symbol,
        change: this.formatChange(r.changePercent),
        price: typeof r.price === 'number' ? this.currencyService.formatDisplay(r.price) : '—',
      })),
    };
  }

  private planTable(): ChatTable | undefined {
    const plan =
      this.plannerService.getDraftPlanForMonth(this.plannerService.currentMonth) ??
      this.plannerService.getCurrentPlan();
    if (!plan) return undefined;
    const money = (n: number) => this.currencyService.formatDisplay(n);
    return {
      columns: [
        { key: 'metric', label: this.lang.t('buddy.colMetric'), align: 'left' },
        { key: 'value', label: this.lang.t('buddy.colValue'), align: 'right' },
      ],
      rows: [
        { metric: this.lang.t('buddy.planName'), value: plan.name || plan.month },
        { metric: this.lang.t('buddy.planStatus'), value: plan.status },
        { metric: this.lang.t('buddy.planBudget'), value: money(plan.budget) },
        { metric: this.lang.t('buddy.planAllocated'), value: money(plan.totalPlannedAmount) },
        { metric: this.lang.t('buddy.planItems'), value: String(plan.items.length) },
      ],
    };
  }

  private portfolioTable(): ChatTable | undefined {
    const summary = this.holdingsService.summary();
    if (summary.holdingsCount === 0) return undefined;
    const money = (n: number) => this.currencyService.formatDisplay(n);
    const pl = summary.totalUnrealizedPLPercent;
    const sign = pl > 0 ? '+' : '';
    return {
      columns: [
        { key: 'metric', label: this.lang.t('buddy.colMetric'), align: 'left' },
        { key: 'value', label: this.lang.t('buddy.colValue'), align: 'right', tone: 'pl' },
      ],
      rows: [
        { metric: this.lang.t('buddy.portHoldings'), value: String(summary.holdingsCount) },
        { metric: this.lang.t('buddy.portInvested'), value: money(summary.totalInvested) },
        { metric: this.lang.t('buddy.portValue'), value: money(summary.totalCurrentValue) },
        { metric: this.lang.t('buddy.portPL'), value: `${sign}${pl.toFixed(1)}%` },
      ],
    };
  }

  buildContext(): string {
    const reds = this.redCandidates();
    const summary = this.holdingsService.summary();
    const plan =
      this.plannerService.getDraftPlanForMonth(this.plannerService.currentMonth) ??
      this.plannerService.getCurrentPlan();
    const money = (n: number) => this.currencyService.formatDisplay(n);

    const redLine = reds.length
      ? reds
          .slice(0, 12)
          .map((r) =>
            typeof r.changePercent === 'number'
              ? `${r.symbol} ${r.changePercent.toFixed(1)}%`
              : r.symbol
          )
          .join(', ')
      : 'none';

    const planLine = plan
      ? `${plan.month} ${plan.status} budget=${money(plan.budget)} items=${plan.items.length} allocated=${money(plan.totalPlannedAmount)}`
      : 'no plan this month';

    return [
      `Currency: ${this.currencyService.displayCurrency()}`,
      `Red candidates (${reds.length}): ${redLine}`,
      `Holdings: ${summary.holdingsCount} positions, invested ${money(summary.totalInvested)}, value ${money(summary.totalCurrentValue)}, P/L ${summary.totalUnrealizedPLPercent.toFixed(1)}%`,
      `Plan: ${planLine}`,
    ].join('\n');
  }

  localReply(message: string): string {
    const marketFact = matchNseBseFact(message);
    if (marketFact) {
      return formatNseBseReply(marketFact);
    }

    const q = message.toLowerCase();
    const reds = this.redCandidates();
    const summary = this.holdingsService.summary();
    const plan =
      this.plannerService.getDraftPlanForMonth(this.plannerService.currentMonth) ??
      this.plannerService.getCurrentPlan();
    const money = (n: number) => this.currencyService.formatDisplay(n);

    if (/dip|red|buy/.test(q)) {
      if (reds.length === 0) {
        return `No red candidates right now — watched names look green. ${DISCLAIMER}`;
      }
      return `${this.lang.t('buddy.dipsIntro')} ${DISCLAIMER}`;
    }

    if (/plan|budget|allocat/.test(q)) {
      if (!plan) {
        return `There is no monthly plan yet. Create one in Planner and I can talk through the budget split. ${DISCLAIMER}`;
      }
      return `This month's plan (${plan.name || plan.month}) is ${plan.status} with budget ${money(plan.budget)} across ${plan.items.length} items (${money(plan.totalPlannedAmount)} allocated). ${DISCLAIMER}`;
    }

    if (/portfolio|holding|p\/?l|pnl|invest/.test(q)) {
      if (summary.holdingsCount === 0) {
        return `No holdings yet. Record buys in Transactions and I can summarise P/L here. ${DISCLAIMER}`;
      }
      return `Portfolio: ${summary.holdingsCount} holdings, invested ${money(summary.totalInvested)}, value ${money(summary.totalCurrentValue)}, unrealized P/L ${summary.totalUnrealizedPLPercent.toFixed(1)}%. ${DISCLAIMER}`;
    }

    return this.lang.t('buddy.offlineHelp');
  }

  private fallbackReply(message: string, err: HttpErrorResponse): string {
    const local = this.localReply(message);
    if (local !== this.lang.t('buddy.offlineHelp')) {
      return local;
    }
    const note = this.geminiFailureNote(err);
    return note ? `${local}\n\n${note}` : local;
  }

  private geminiFailureNote(err: HttpErrorResponse): string {
    const code = String(err?.error?.code || '');
    const details = `${err?.error?.error || err?.message || ''}`.toLowerCase();
    if (code === 'GEMINI_API_KEY_MISSING') {
      return this.lang.t('buddy.geminiMissing');
    }
    if (err?.status === 404 || details.includes('not found') || details.includes('shut down')) {
      return this.lang.t('buddy.geminiModel');
    }
    if (err?.status >= 400) {
      return this.lang.t('buddy.geminiUnavailable');
    }
    return this.lang.t('buddy.geminiUnavailable');
  }
}
