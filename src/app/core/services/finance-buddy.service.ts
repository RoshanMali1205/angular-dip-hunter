/**
 * Finance Buddy — in-app Gemini chat with a local portfolio fallback.
 */

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of } from 'rxjs';
import { QuoteService } from './quote.service';
import { SettingsService } from './settings.service';
import { CurrencyService } from './currency.service';
import { HoldingsService } from './holdings.service';
import { PlannerService } from './planner.service';
import { PortfolioService } from './portfolio.service';
import { LanguageService } from './language.service';
import { resolveAiEndpoint } from '../utils/ai-endpoint';
import {
  AiChatRequest,
  AiChatResponse,
  ChatMessage,
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
        map((res) => this.asAssistant(res?.reply, 'gemini')),
        catchError(() => of(this.asAssistant(this.localReply(text), 'local')))
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

  private asAssistant(text: string | undefined, provider: 'gemini' | 'local'): ChatMessage {
    const fallback = this.localReply('help');
    return {
      id: this.nextId(),
      role: 'assistant',
      text: (text && text.trim()) || fallback,
      provider,
      createdAt: new Date().toISOString(),
    };
  }

  private nextId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private redCandidates(): { symbol: string; changePercent?: number }[] {
    const quotes = this.quoteService.quotes();
    return this.portfolioService
      .activeStocks()
      .map((stock) => {
        const quote = quotes[stock.symbol];
        return { symbol: stock.symbol, changePercent: quote?.changePercent, isRed: this.settingsService.isRed(quote) };
      })
      .filter((row) => row.isRed)
      .map(({ symbol, changePercent }) => ({ symbol, changePercent }));
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
      const list = reds
        .slice(0, 8)
        .map((r) =>
          typeof r.changePercent === 'number'
            ? `${r.symbol} (${r.changePercent.toFixed(1)}%)`
            : r.symbol
        )
        .join(', ');
      return `Today's red dips: ${list}. Open Planner to allocate, or ask Gemini (when configured) which look like staged buys. ${DISCLAIMER}`;
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
}
