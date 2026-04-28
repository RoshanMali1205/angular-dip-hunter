# Dip Hunter — Complete Application Architecture Document

> **Purpose:** This document provides a comprehensive technical blueprint of the "Dip Hunter" Angular application. It is designed to serve as the **single source of truth** for converting this project into a **React application** with identical UI, functionality, and production-readiness.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Project Structure](#4-project-structure)
5. [Data Models & TypeScript Interfaces](#5-data-models--typescript-interfaces)
6. [State Management Architecture](#6-state-management-architecture)
7. [Routing & Navigation Flow](#7-routing--navigation-flow)
8. [Authentication Flow](#8-authentication-flow)
9. [Service Layer — Complete API](#9-service-layer--complete-api)
10. [Feature Pages — Functional Specifications](#10-feature-pages--functional-specifications)
11. [Shared Components](#11-shared-components)
12. [Styling & Theming System](#12-styling--theming-system)
13. [Internationalization (i18n)](#13-internationalization-i18n)
14. [PWA & Service Worker](#14-pwa--service-worker)
15. [Backend / Serverless Functions](#15-backend--serverless-functions)
16. [External APIs & Data Sources](#16-external-apis--data-sources)
17. [Key Business Rules & Domain Logic](#17-key-business-rules--domain-logic)
18. [User Interaction Flows](#18-user-interaction-flows)
19. [Terminology Glossary](#19-terminology-glossary)
20. [Angular → React Migration Mapping](#20-angular--react-migration-mapping)
21. [Agent Instructions for React Conversion](#21-agent-instructions-for-react-conversion)

---

## 1. Application Overview

**Dip Hunter** is a stock portfolio management dashboard built for Indian stock market (NSE/BSE) investors who follow a **"buy the dip"** strategy. The app helps users:

- Track stocks across two curated portfolios: **Growth Twenty** (20 growth stocks) and **Dividend Ten** (10 dividend stocks)
- Monitor real-time stock prices and identify **"red" stocks** (stocks that have dropped in price)
- Plan monthly investments with smart allocation strategies
- Record buy and dividend transactions
- Analyze portfolio performance with charts and insights
- Manage reusable investment plan drafts
- View historical performance with comparisons

**Key Characteristics:**
- **Single Page Application (SPA)** with client-side routing
- **PWA** with offline support via service worker
- **LocalStorage-based persistence** (no traditional database)
- **Mock auth system** using localStorage (credentials stored client-side)
- **Multi-source quote fetching** (Yahoo Finance, Finnhub, AlphaVantage, Mock)
- **Dark/Light theme** support
- **Multi-language** support (English, Hindi, Marathi)
- **Responsive** design (mobile + desktop)
- **Deployed on Netlify** with serverless functions

---

## 2. Technology Stack

### Current Angular Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Angular | 21.x (standalone components) |
| Language | TypeScript | 5.9.x |
| Styling | Tailwind CSS | 3.4.x |
| Charts | Chart.js + ng2-charts | 4.5+ / 8.0+ |
| State | Angular Signals | Built-in |
| HTTP | Angular HttpClient | Built-in |
| Routing | Angular Router | Built-in |
| i18n | @ngx-translate | 17.x |
| PWA | @angular/service-worker | 21.x |
| Build | @angular/build | 21.x |
| Testing | Vitest | 4.x |
| CSS Processing | PostCSS + Autoprefixer | 8.x / 10.x |
| Deployment | Netlify | — |
| Serverless | Netlify Functions | — |
| Stock Data | yahoo-finance2 | 2.14.x |

### Recommended React Stack (Equivalent)
| Layer | Recommended Technology |
|-------|----------------------|
| Framework | React 18/19 + TypeScript |
| State | Zustand or Redux Toolkit (replaces Angular Signals) |
| Routing | React Router v6 (replaces Angular Router) |
| HTTP | Axios or fetch API (replaces HttpClient) |
| Styling | Tailwind CSS 3.x (same) |
| Charts | Chart.js + react-chartjs-2 (replaces ng2-charts) |
| i18n | react-i18next (replaces @ngx-translate) |
| PWA | Workbox / vite-plugin-pwa |
| Forms | React Hook Form (replaces FormsModule/ngModel) |
| Build | Vite |
| Testing | Vitest + React Testing Library |

---

## 3. Architecture Diagram

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA + PWA)                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    APP SHELL (app.ts)                          │  │
│  │  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ │  │
│  │  │  Header  │ │   Nav    │ │ Theme  │ │  Lang  │ │  User   │ │  │
│  │  │  + Logo  │ │  Links   │ │ Toggle │ │ Select │ │ Menu    │ │  │
│  │  └─────────┘ └──────────┘ └────────┘ └────────┘ └─────────┘ │  │
│  │                                                               │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │                   <router-outlet>                        │  │  │
│  │  │                                                         │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │  │  │
│  │  │  │Dashboard │ │ Planner  │ │Transactions│ │ Settings │ │  │  │
│  │  │  │  Page    │ │  Page    │ │   Page     │ │  Page    │ │  │  │
│  │  │  └──────────┘ └──────────┘ └───────────┘ └──────────┘ │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │  │  │
│  │  │  │ Folders  │ │  Drafts  │ │ Analytics  │ │Performanc│ │  │  │
│  │  │  │  Page    │ │  Page    │ │   Page     │ │  Page    │ │  │  │
│  │  │  └──────────┘ └──────────┘ └───────────┘ └──────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────── SERVICE LAYER ────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │AuthService  │  │PortfolioSvc  │  │  QuoteService        │ │  │
│  │  │(login/reg)  │  │(stocks/folders│  │  (prices/cache)      │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │HoldingsSvc  │  │TransactionSvc│  │  PlannerService      │ │  │
│  │  │(computed)   │  │(buy/dividend) │  │  (monthly plans)     │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │SettingsSvc  │  │ ThemeService │  │  LanguageService     │ │  │
│  │  │(config)     │  │ (dark/light) │  │  (i18n)              │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │CurrencySvc  │  │ DraftsService│  │  PerformanceService  │ │  │
│  │  │(exchange)   │  │ (plan drafts)│  │  (historical data)   │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │PriceAlertSvc│  │StockAnalysis │  │ AllocationAdvisor    │ │  │
│  │  │(notifications│  │(red analysis)│  │ (AI strategies)      │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │CsvImportSvc │  │NetworkStatus │  │PortfolioInsightsSvc  │ │  │
│  │  │(broker CSV) │  │(online/off)  │  │(analysis/warnings)   │ │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  │  ┌─────────────┐  ┌──────────────┐                           │  │
│  │  │ UserService │  │ TourService  │                           │  │
│  │  │(profile)    │  │ (onboarding) │                           │  │
│  │  └─────────────┘  └──────────────┘                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────── PERSISTENCE LAYER ────────────────────────────┐  │
│  │                                                               │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │              StorageService (localStorage)              │   │  │
│  │  │                                                        │   │  │
│  │  │  Keys: dh_folders | dh_stocks | dh_plans | dh_settings │   │  │
│  │  │  dh_transactions | dh_drafts | dh_quote_cache          │   │  │
│  │  │  dh_exchange_rates | dh_user | dh_theme | dh_language  │   │  │
│  │  │  dh_auth_token | dh_auth_user | dh_registered_users    │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NETLIFY (Hosting + Functions)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │   Serverless Function: /.netlify/functions/quotes           │   │
│  │                                                             │   │
│  │   Orchestrates multi-source quote fetching:                 │   │
│  │   1. Finnhub API (primary, if key available)                │   │
│  │   2. Alpha Vantage (fallback)                               │   │
│  │   3. Stooq (cloud-safe fallback, no API key)                │   │
│  │   4. Yahoo Finance (last resort)                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │   Express Dev Server: server/index.js (port 3001)           │   │
│  │   Routes: /api/health, /api/quotes, /api/chart/:symbol      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIs                                   │
│                                                                     │
│  ┌────────────┐ ┌───────────────┐ ┌─────────┐ ┌────────────────┐  │
│  │  Yahoo     │ │  Finnhub      │ │  Stooq  │ │ Alpha Vantage  │  │
│  │  Finance   │ │  (60 req/min) │ │  (free) │ │ (25 req/day)   │  │
│  └────────────┘ └───────────────┘ └─────────┘ └────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Frankfurter API (https://api.frankfurter.dev)                │  │
│  │  Purpose: Currency exchange rates (INR, USD, EUR, etc.)       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Diagram

```
┌─────────────────── USER ACTION ──────────────────────┐
│  (Click refresh, add transaction, change settings)    │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌─────────────────── COMPONENT ────────────────────────┐
│  Page Component (e.g., DashboardPageComponent)        │
│  - Calls service methods                              │
│  - Reads computed signals for UI binding              │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌─────────────────── SERVICE LAYER ────────────────────┐
│  Service (e.g., QuoteService)                         │
│  - Updates internal signal state                      │
│  - Makes HTTP calls if needed                         │
│  - Persists to StorageService                         │
└───────────┬──────────┬───────────────────────────────┘
            │          │
    ┌───────▼──┐  ┌────▼──────────┐
    │ Storage  │  │ HTTP / API    │
    │ Service  │  │ (Netlify Fn)  │
    │(localStorage)│ └──────────────┘
    └──────────┘
            │
            ▼
┌─────────── REACTIVE UPDATE ─────────────────────────┐
│  Signal change → computed() re-evaluates             │
│  → All dependent components auto-update UI           │
│  (No manual subscription management needed)          │
└──────────────────────────────────────────────────────┘
```

### 3.3 Service Dependency Graph

```
                      ┌──────────────┐
                      │StorageService│ (Foundation - no deps)
                      └──────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│SettingsService│  │PortfolioSvc │  │TransactionService│
│              │  │(stocks/folders│  │(buy/dividend)    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────────┘
       │                 │                  │
       ▼                 │                  │
┌──────────────┐         │                  │
│ QuoteService │◄────────┘                  │
│  + Network   │                            │
└──────┬───────┘                            │
       │          ┌─────────────────────────┘
       │          │
       ▼          ▼
┌─────────────────────┐
│  HoldingsService    │ (Computed from Transactions + Quotes + Portfolio)
└──────┬──────────────┘
       │
       ├──────────────────────────┐
       ▼                          ▼
┌──────────────────┐  ┌──────────────────────┐
│StockAnalysisSvc  │  │PortfolioInsightsSvc  │
│(red stock reasons│  │(concentration/sector) │
└──────────────────┘  └──────────────────────┘
       │
       ▼
┌──────────────────────┐
│AllocationAdvisorSvc  │ (Depends on Quotes + Portfolio)
└──────────────────────┘
```

---

## 4. Project Structure

```
angular-dip-hunter/
├── src/
│   ├── index.html                          # HTML entry point
│   ├── main.ts                             # Bootstrap (bootstrapApplication)
│   ├── styles.css                          # Global Tailwind + custom styles
│   │
│   ├── app/
│   │   ├── app.ts                          # Root component (shell, header, nav)
│   │   ├── app.html                        # Root template (header + router-outlet)
│   │   ├── app.css                         # Root styles (empty)
│   │   ├── app.config.ts                   # App providers (router, http, sw)
│   │   ├── app.routes.ts                   # All route definitions
│   │   │
│   │   ├── core/                           # Singleton services, models, guards
│   │   │   ├── models/                     # TypeScript interfaces & types
│   │   │   │   ├── index.ts                # Barrel + StockViewModel, DashboardKPIs
│   │   │   │   ├── auth.model.ts           # AuthUser, LoginRequest, AuthState
│   │   │   │   ├── currency.model.ts       # CurrencyCode, SupportedCurrency
│   │   │   │   ├── folder.model.ts         # Folder, FolderId, DEFAULT_FOLDERS
│   │   │   │   ├── holding.model.ts        # Holding, HoldingsSummary
│   │   │   │   ├── performance.model.ts    # HistoryRange, HistoricalPoint
│   │   │   │   ├── plan.model.ts           # MonthlyPlan, PlanItem, PlanDraft
│   │   │   │   ├── quote.model.ts          # Quote, QuoteCache
│   │   │   │   ├── settings.model.ts       # AppSettings, RedRule, DEFAULT_SETTINGS
│   │   │   │   ├── stock.model.ts          # Stock, GROWTH_20_STOCKS, DIVIDEND_10_STOCKS
│   │   │   │   ├── transaction.model.ts    # BuyTransaction, DividendTransaction
│   │   │   │   └── user.model.ts           # User, DEFAULT_USER
│   │   │   │
│   │   │   ├── services/                   # All business logic services
│   │   │   │   ├── index.ts                # Barrel export
│   │   │   │   ├── auth.service.ts         # Authentication (localStorage-based)
│   │   │   │   ├── storage.service.ts      # LocalStorage wrapper
│   │   │   │   ├── portfolio.service.ts    # Stocks & folders management
│   │   │   │   ├── quote.service.ts        # Price fetching + caching
│   │   │   │   ├── holdings.service.ts     # Computed holdings from transactions
│   │   │   │   ├── transaction.service.ts  # Buy & dividend CRUD
│   │   │   │   ├── planner.service.ts      # Monthly investment plans
│   │   │   │   ├── drafts.service.ts       # Reusable plan drafts (max 10)
│   │   │   │   ├── settings.service.ts     # App configuration
│   │   │   │   ├── theme.service.ts        # Dark/Light theme
│   │   │   │   ├── language.service.ts     # i18n (en/hi/mr)
│   │   │   │   ├── user.service.ts         # User profile
│   │   │   │   ├── currency.service.ts     # Exchange rates (Frankfurter API)
│   │   │   │   ├── performance.service.ts  # Historical price data
│   │   │   │   ├── network-status.service.ts # Online/offline detection
│   │   │   │   ├── price-alert.service.ts  # Browser notification alerts
│   │   │   │   ├── csv-import.service.ts   # CSV parsing (Zerodha/Groww/Angel)
│   │   │   │   ├── stock-analysis.service.ts # Red stock analysis
│   │   │   │   ├── allocation-advisor.service.ts # AI allocation strategies
│   │   │   │   ├── portfolio-insights.service.ts # Portfolio health analysis
│   │   │   │   └── tour.service.ts         # Onboarding tour engine
│   │   │   │
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts           # authGuard + guestGuard
│   │   │   │
│   │   │   ├── interceptors/
│   │   │   │   └── auth.interceptor.ts     # Bearer token interceptor
│   │   │   │
│   │   │   └── tour/
│   │   │       └── tour.config.ts          # Tour steps configuration
│   │   │
│   │   ├── features/                        # Feature pages (lazy-loaded)
│   │   │   ├── dashboard/
│   │   │   │   ├── dashboard.page.ts        # Main dashboard component
│   │   │   │   ├── dashboard.page.html      # Dashboard template
│   │   │   │   └── components/
│   │   │   │       ├── holdings-pie-chart.component.ts
│   │   │   │       └── portfolio-insights-card.component.ts
│   │   │   │
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.page.ts        # Portfolio analytics
│   │   │   │   └── analytics.page.html
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── auth-layout.component.ts # Auth page wrapper
│   │   │   │   ├── login/login.page.ts
│   │   │   │   ├── register/register.page.ts
│   │   │   │   ├── forgot-password/forgot-password.page.ts
│   │   │   │   └── reset-password/reset-password.page.ts
│   │   │   │
│   │   │   ├── drafts/
│   │   │   │   ├── drafts.page.ts
│   │   │   │   └── drafts.page.html
│   │   │   │
│   │   │   ├── folders/
│   │   │   │   ├── folders.page.ts
│   │   │   │   └── folders.page.html
│   │   │   │
│   │   │   ├── performance/
│   │   │   │   ├── performance.page.ts
│   │   │   │   ├── performance.page.html
│   │   │   │   └── components/
│   │   │   │       ├── time-range-selector.component.ts
│   │   │   │       ├── performance-chart.component.ts
│   │   │   │       ├── performance-summary-cards.component.ts
│   │   │   │       ├── compare-stocks-selector.component.ts
│   │   │   │       └── performance-table-snapshot.component.ts
│   │   │   │
│   │   │   ├── planner/
│   │   │   │   ├── planner.page.ts
│   │   │   │   ├── planner.page.html
│   │   │   │   └── components/
│   │   │   │       └── allocation-suggestions.component.ts
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── settings.page.ts
│   │   │   │   └── settings.page.html
│   │   │   │
│   │   │   └── transactions/
│   │   │       ├── transactions.page.ts
│   │   │       └── transactions.page.html
│   │   │
│   │   └── shared/                          # Reusable components, pipes, utils
│   │       ├── components/
│   │       │   ├── index.ts
│   │       │   ├── csv-import-dialog.component.ts + .html
│   │       │   ├── currency-selector.component.ts
│   │       │   ├── dialog.component.ts
│   │       │   ├── dialog.service.ts
│   │       │   ├── radial-progress.component.ts
│   │       │   ├── skeleton.component.ts       # Multiple skeleton loaders
│   │       │   └── tour-overlay.component.ts
│   │       │
│   │       ├── pipes/
│   │       │   ├── index.ts
│   │       │   └── currency-display.pipe.ts
│   │       │
│   │       └── utils/
│   │           ├── currency.utils.ts
│   │           └── pagination.utils.ts
│   │
│   └── assets/
│       └── i18n/
│           └── translations.json            # en, hi, mr translations
│
├── public/
│   ├── manifest.webmanifest                 # PWA manifest
│   ├── robots.txt
│   ├── _redirects                           # Netlify redirects
│   └── icons/                               # PWA icons (72-512px)
│
├── server/
│   ├── index.js                             # Express dev server
│   └── package.json
│
├── netlify/
│   └── functions/
│       └── quotes.mjs                       # Serverless quote fetcher
│
├── angular.json                             # Angular CLI config
├── package.json                             # Dependencies
├── tailwind.config.js                       # Tailwind configuration
├── postcss.config.js                        # PostCSS config
├── tsconfig.json                            # TypeScript config
├── ngsw-config.json                         # Service worker config
└── netlify.toml                             # Netlify deployment config
```

---

## 5. Data Models & TypeScript Interfaces

### 5.1 Entity Relationship Diagram

```
┌──────────┐      ┌──────────────┐
│  Folder   │ 1──* │    Stock     │
│           │      │              │
│ id(FolderId)     │ id           │
│ name      │      │ symbol       │
│ description│     │ displayName  │
│ stockCount│      │ exchange     │
└──────────┘      │ folderId ──┐ │
                   │ rank       │ │
                   │ isActive   │ │
                   │ sector     │ │
                   └──────┬─────┘ │
                          │       │
                   ┌──────▼─────┐ │
                   │ Transaction│ │
                   │            │ │
                   │ id         │ │
                   │ type(BUY/  │ │
                   │  DIVIDEND) │ │
                   │ stockId ───┘ │
                   │ symbol      │
                   │ qty/amount  │
                   │ price       │
                   │ charges     │
                   │ planId?     │
                   └──────┬─────┘
                          │ computed from
                   ┌──────▼─────┐
                   │  Holding   │ (virtual - not stored)
                   │            │
                   │ stockId    │
                   │ totalQty   │
                   │ avgPrice   │
                   │ investedAmt│
                   │ currentVal │
                   │ unrealPL   │
                   └────────────┘

┌──────────────┐      ┌──────────────┐
│ MonthlyPlan  │ 1──* │  PlanItem    │
│              │      │              │
│ id           │      │ stockId      │
│ month(YY-MM) │      │ symbol       │
│ budget       │      │ targetAmount │
│ strategy     │      │ plannedPrice │
│ status       │      │ isExecuted   │
└──────────────┘      └──────────────┘

┌──────────────┐      ┌──────────────┐
│  PlanDraft   │ 1──* │PlanDraftItem │
│ (max 10)     │      │              │
│ id, name     │      │ stockId      │
│ budget       │      │ targetAmount │
└──────────────┘      └──────────────┘

┌──────────────┐      ┌──────────────┐
│  AppSettings │      │    Quote     │
│              │      │  (cached)    │
│ redRule      │      │ symbol       │
│ dataSource   │      │ price        │
│ currency     │      │ change       │
│ autoRefresh  │      │ changePercent│
│ priceAlerts  │      │ volume       │
│ ...          │      │ timestamp    │
└──────────────┘      └──────────────┘
```

### 5.2 Complete Model Definitions

#### FolderId (Enum-like type)
```typescript
type FolderId = 'GROWTH_20' | 'DIVIDEND_10';
```

#### Folder
```typescript
interface Folder {
  id: FolderId;
  name: string;           // "Growth Twenty" | "Dividend Ten"
  description: string;
  stockCount: number;     // 20 | 10
  createdAt: string;      // ISO date
  updatedAt: string;
}
```

#### Stock
```typescript
interface Stock {
  id: string;             // Auto-generated
  symbol: string;         // e.g., "RELIANCE", "TCS"
  displayName: string;    // e.g., "Reliance Industries"
  exchange: 'NSE' | 'BSE';
  folderId: FolderId;
  rank: number;           // Display order within folder
  isActive: boolean;
  sector?: string;        // e.g., "Banking", "IT", "Pharma"
  createdAt: string;
  updatedAt: string;
}
```

#### Quote
```typescript
interface Quote {
  symbol: string;
  price: number;
  currency: 'INR' | string;
  change: number;           // Absolute change from previous close
  changePercent: number;    // Percentage change
  open?: number;
  high?: number;
  low?: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  volume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  timestamp: string;
  source: 'yahoo' | 'mock' | string;
}
```

#### Transaction (BUY | DIVIDEND)
```typescript
interface BuyTransaction {
  id: string;
  type: 'BUY';
  date: string;           // ISO date
  symbol: string;
  stockId: string;
  qty: number;
  price: number;
  charges: number;        // Brokerage, taxes
  totalAmount: number;    // qty * price + charges
  planId?: string;        // If executed from a plan
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DividendTransaction {
  id: string;
  type: 'DIVIDEND';
  date: string;
  symbol: string;
  stockId: string;
  amount: number;
  dividendPerShare?: number;
  qty?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

type Transaction = BuyTransaction | DividendTransaction;
```

#### Holding (Computed Virtual Model)
```typescript
interface Holding {
  stockId: string;
  symbol: string;
  displayName: string;
  folderId: FolderId;
  totalQty: number;
  investedAmount: number;
  avgPrice: number;             // investedAmount / totalQty
  currentPrice?: number;        // From QuoteService
  currentValue?: number;        // totalQty * currentPrice
  unrealizedPL?: number;        // currentValue - investedAmount
  unrealizedPLPercent?: number;
  totalDividends: number;
  firstBuyDate: string;
  lastBuyDate: string;
  lastUpdated: string;
}
```

#### MonthlyPlan & PlanItem
```typescript
type PlanStatus = 'DRAFT' | 'FINAL';
type AllocationStrategy = 'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT' | 'EQUAL' | 'RISK_ADJUSTED' | 'DEFENSIVE' | 'AI_ADVISOR';

interface PlanItem {
  stockId: string;
  symbol: string;
  targetAmount: number;
  targetQty?: number;
  plannedPrice: number;
  actualPrice?: number;
  actualQty?: number;
  isExecuted: boolean;
  executedAt?: string;
}

interface MonthlyPlan {
  id: string;
  month: string;          // YYYY-MM
  name?: string;
  status: PlanStatus;
  budget: number;
  strategy: AllocationStrategy;
  items: PlanItem[];
  totalPlannedAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}
```

#### PlanDraft
```typescript
interface PlanDraft {
  id: string;
  name: string;
  budget: number;
  items: PlanDraftItem[];
  totalPlannedAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### AppSettings
```typescript
interface AppSettings {
  redRule: RedRule;
  quoteDataSource: 'mock' | 'yahoo' | 'finnhub' | 'alphavantage';
  yahooProxyUrl: string;
  finnhubApiKey?: string;
  alphaVantageApiKey?: string;
  autoRefresh: boolean;
  refreshIntervalSeconds: number;
  cacheTTLSeconds: number;
  defaultFolderId: FolderId;
  showHoldingsInDashboard: boolean;
  compactMode: boolean;
  displayCurrency: CurrencyCode;
  defaultAllocationStrategy: 'EQUAL_WEIGHT' | 'CUSTOM_WEIGHT';
  priceAlerts: Record<string, number>;   // symbol → threshold %
  updatedAt: string;
}
```

#### Auth Models
```typescript
interface AuthUser { id: string; name: string; email: string; avatar?: string; createdAt: string; }
interface LoginRequest { email: string; password: string; rememberMe?: boolean; }
interface RegisterRequest { name: string; email: string; password: string; }
interface AuthResponse { user: AuthUser; accessToken: string; expiresIn?: number; }
```

#### StockViewModel (Combined Display Model)
```typescript
interface StockViewModel {
  stockId: string;
  symbol: string;
  displayName: string;
  folderId: FolderId;
  rank: number;
  isActive: boolean;
  sector?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  quoteUpdatedAt?: string;
  isRed: boolean;
  isInCurrentPlan: boolean;
  holdingQty?: number;
  avgPrice?: number;
  investedAmount?: number;
  currentValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
}
```

#### Currency
```typescript
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'SGD' | 'HKD';

interface SupportedCurrency {
  code: CurrencyCode;
  name: string;
  symbol: string;       // ₹, $, €, £, ¥
  locale: string;       // en-IN, en-US
  flag: string;         // 🇮🇳, 🇺🇸
}
```

---

## 6. State Management Architecture

### Angular Signals → React Equivalent

The app uses **Angular Signals** exclusively (no NgRx/RxJS store). Each service holds its own state:

```
┌─────────────────── SIGNAL-BASED STATE ─────────────────────┐
│                                                             │
│  Service         Signal          Type                       │
│  ─────────       ──────          ────                       │
│  AuthService     _state          WritableSignal<AuthState>  │
│  PortfolioSvc    _folders        WritableSignal<Folder[]>   │
│                  _stocks         WritableSignal<Stock[]>    │
│  QuoteService    _quotesCache    WritableSignal<Record>     │
│  TransactionSvc  _transactions   WritableSignal<Transaction[]> │
│  PlannerService  _plans          WritableSignal<MonthlyPlan[]> │
│  DraftsService   _drafts         WritableSignal<PlanDraft[]>│
│  SettingsService _settings       WritableSignal<AppSettings>│
│  ThemeService    _theme          WritableSignal<Theme>      │
│  LanguageService language        WritableSignal<Language>   │
│  UserService     _user           WritableSignal<User>       │
│  CurrencyService _rates          WritableSignal<Record>     │
│  NetworkStatusSvc _isOnline      WritableSignal<boolean>    │
│                                                             │
│  COMPUTED SIGNALS (derived automatically):                  │
│  PortfolioSvc    activeStocks, growth20Stocks, dividend10   │
│  HoldingsService holdings, holdingsMap, summary             │
│  QuoteService    cacheAgeMinutes, isStaleCache              │
│  TransactionSvc  buyTransactions, dividendTransactions      │
│  SettingsService redRule, displayCurrency, autoRefresh      │
│  AuthService     user, isAuthenticated, isLoading           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### React Migration: Zustand Store Mapping

```
React Store Structure (Zustand recommended):
├── useAuthStore      (user, isAuthenticated, login, logout, register)
├── usePortfolioStore (folders, stocks, addStock, removeStock, etc.)
├── useQuoteStore     (quotes, fetchQuotes, getQuote, cache management)
├── useTransactionStore (transactions, addBuy, addDividend, delete)
├── usePlannerStore   (plans, createPlan, addItem, finalize)
├── useDraftStore     (drafts, createDraft, deleteDraft)
├── useSettingsStore  (settings, updateSettings, isRed)
├── useThemeStore     (theme, isDark, toggleTheme)
├── useLanguageStore  (language, t(), setLanguage)
├── useUserStore      (user, updateUser, setAvatar)
├── useCurrencyStore  (rates, convert, formatDisplay)
└── usePerformanceStore (history, getHistory, clearCache)
```

---

## 7. Routing & Navigation Flow

### Route Map

```
/                           → Dashboard (authGuard)
/planner                    → Planner (authGuard)
/drafts                     → Drafts (authGuard)
/transactions               → Transactions (authGuard)
/folders                    → Stock Vault/Folders (authGuard)
/performance                → Performance Charts (authGuard)
/analytics                  → Portfolio Analytics (authGuard)
/settings                   → Settings (authGuard)

/auth/login                 → Login (guestGuard)
/auth/register              → Register (guestGuard)
/auth/forgot-password       → Forgot Password (guestGuard)
/auth/reset-password        → Reset Password (guestGuard)
/**                         → Redirect to /
```

### Guard Logic

```
authGuard:
  IF authenticated → allow access
  ELSE → store attempted URL, redirect to /auth/login

guestGuard:
  IF authenticated → redirect to / (dashboard)
  ELSE → allow access (show auth pages)
```

### Navigation Structure (Header)

```
Desktop: [Dashboard] [Planner] [Drafts] [Transactions] [Stock Vault] [Performance] [Analytics] [Settings]
         + Language Dropdown + Theme Toggle + User Profile Menu

Mobile: Hamburger Menu → Same items stacked vertically
```

---

## 8. Authentication Flow

```
┌──────────┐     ┌───────────┐     ┌─────────────┐
│  Login    │────▶│ Validate  │────▶│ Store Token │
│  Form     │     │ Against   │     │ + User in   │
│           │     │ localStorage│   │ session/local│
└──────────┘     └───────────┘     └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Redirect to  │
                                   │ Dashboard or │
                                   │ saved URL    │
                                   └─────────────┘

┌──────────┐     ┌───────────┐     ┌─────────────┐
│ Register  │────▶│ Validate  │────▶│ Store User  │
│  Form     │     │ Password  │     │ Credentials │
│           │     │ + Email   │     │ in localStorage│
└──────────┘     └───────────┘     └──────┬──────┘
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Redirect to  │
                                   │   Login      │
                                   └─────────────┘

IMPORTANT: This is a CLIENT-SIDE mock auth system.
- No real backend API calls
- Passwords stored in localStorage (PLAIN TEXT - development only)
- Token is a randomly generated string
- "Remember Me" uses localStorage vs sessionStorage
- Reset tokens expire after 1 hour (client-side)
```

### Password Rules
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
- Strength meter: 0-4 scale (weak → very strong)

### localStorage Keys (Auth)
| Key | Purpose |
|-----|---------|
| `dh_auth_token` | JWT-like token (mock) |
| `dh_auth_user` | Serialized AuthUser object |
| `dh_remember_me` | Boolean flag |
| `dh_registered_users` | Array of registered user credentials |
| `dh_reset_tokens` | Active password reset tokens |

---

## 9. Service Layer — Complete API

### 9.1 StorageService
**Purpose:** Type-safe localStorage abstraction

| Method | Signature | Description |
|--------|-----------|-------------|
| `get` | `get<T>(key: StorageKey): T \| null` | Read from localStorage |
| `set` | `set<T>(key: StorageKey, value: T): boolean` | Write to localStorage |
| `remove` | `remove(key: StorageKey): void` | Delete key |
| `clearAll` | `clearAll(): void` | Clear all app data |
| `exportAll` | `exportAll(): Record<string, unknown>` | Export backup |
| `importAll` | `importAll(data): boolean` | Import backup |

**Storage Keys:** `dh_folders`, `dh_stocks`, `dh_plans`, `dh_transactions`, `dh_drafts`, `dh_settings`, `dh_quote_cache`, `dh_exchange_rates`, `dh_user`

### 9.2 AuthService
| Method | Description |
|--------|-------------|
| `login(LoginRequest)` | Validate & authenticate (returns boolean) |
| `register(RegisterRequest)` | Create account (returns boolean) |
| `logout()` | Clear session, navigate to login |
| `getAccessToken()` | Get current token string |
| `updateUser(Partial<AuthUser>)` | Update profile |
| `requestPasswordReset(email)` | Generate reset token (1hr expiry) |
| `validateResetToken(token)` | Check token validity |
| `resetPassword(token, newPassword)` | Set new password |

### 9.3 PortfolioService
| Method | Description |
|--------|-------------|
| `getFolder(folderId)` | Get folder by ID (O(1)) |
| `getStocksByFolder(folderId)` | Get stocks in folder (O(1), pre-sorted) |
| `getStock(stockId)` | Get stock by ID (O(1)) |
| `getStockBySymbol(symbol)` | Get stock by symbol (O(1)) |
| `getActiveSymbols(folderId?)` | Get active stock symbols |
| `addStock(stock)` | Add new stock |
| `updateStock(stockId, patch)` | Update stock fields |
| `removeStock(stockId)` | Delete stock |
| `toggleStockActive(stockId)` | Toggle active/inactive |
| `reorderStocks(folderId, newOrder)` | Change display order |

**Signals:** `folders`, `stocks`, `activeStocks`, `growth20Stocks`, `dividend10Stocks`

### 9.4 QuoteService
| Method | Description |
|--------|-------------|
| `fetchQuotes(symbols[], bypassCache?)` | Fetch from configured source |
| `getQuote(symbol)` | Get single quote from cache |
| `getQuotes(symbols[])` | Batch cache lookup |
| `refresh(symbols[])` | Force refresh (bypass cache) |
| `isCacheValid()` | Check TTL validity |
| `clearCache()` | Clear all cached quotes |

**Signals:** `quotes`, `lastUpdated`, `isLoading`, `error`, `cacheAgeMinutes`, `isStaleCache`

### 9.5 TransactionService
| Method | Description |
|--------|-------------|
| `addBuy(txn)` | Create buy transaction |
| `addDividend(txn)` | Create dividend transaction |
| `bulkImport(rows)` | Import from CSV |
| `getTransactions(filters?)` | Get with filters |
| `getBuysByStock(stockId)` | All buys for stock |
| `getDividendsByStock(stockId)` | All dividends for stock |
| `deleteTransaction(id)` | Delete by ID |
| `getTotalInvested(stockId)` | Sum of buy amounts |
| `getTotalQty(stockId)` | Sum of quantities |
| `getTotalDividends(stockId)` | Sum of dividends |

### 9.6 HoldingsService (Fully Computed — No Direct Storage)
| Property/Method | Description |
|----------------|-------------|
| `holdings` | Computed signal: aggregates all transactions + current prices |
| `holdingsMap` | Computed: stockId → Holding lookup (O(1)) |
| `summary` | Computed: HoldingsSummary aggregate |
| `getHolding(stockId)` | O(1) lookup |
| `getHoldingsByFolder(folderId)` | Filter by folder |

### 9.7 PlannerService
| Method | Description |
|--------|-------------|
| `getPlansForMonth(month)` | All plans for YYYY-MM |
| `getPlanById(planId)` | Get by ID |
| `getCurrentPlan()` | Get current month's plan |
| `createPlan(month, budget, strategy)` | Create new plan |
| `addItem(planId, stockId, symbol, quote?)` | Add stock to plan |
| `removeItem(planId, stockId)` | Remove stock from plan |
| `updatePlan(planId, patch)` | Update plan fields |
| `applyEqualWeight(planId, quotesMap)` | Equal allocation |
| `finalizePlan(planId)` | Lock plan (FINAL status) |
| `deletePlan(planId)` | Delete plan |
| `markItemsExecuted(planId, stockIds)` | Mark as bought |
| `isInCurrentPlan(stockId)` | Check if in current plan |

### 9.8 DraftsService
| Method | Description |
|--------|-------------|
| `createDraft(name, budget?)` | Create blank draft (max 10) |
| `createFromPlan(plan, name)` | Clone from plan |
| `updateDraft(id, patch)` | Update draft |
| `addItem(draftId, item)` | Add stock item |
| `removeItem(draftId, stockId)` | Remove stock |
| `applyEqualWeight(draftId)` | Equal allocation |
| `deleteDraft(id)` | Delete draft |

### 9.9 SettingsService
| Method | Description |
|--------|-------------|
| `updateSettings(patch)` | Update any setting |
| `updateCurrency(code)` | Change display currency |
| `updateRedRule(rule)` | Change red condition |
| `isRed(quote)` | Check if quote is "red" |
| `setAlert(symbol, threshold)` | Set price alert |
| `removeAlert(symbol)` | Remove alert |
| `resetToDefaults()` | Factory reset |

### 9.10 Other Services

| Service | Key Purpose |
|---------|-------------|
| **ThemeService** | Dark/light toggle, persists to localStorage, applies CSS classes to `<html>` |
| **LanguageService** | i18n with `t(key, params)`, supports en/hi/mr, loads translations.json |
| **UserService** | Profile management, avatar upload/remove, auto-initials |
| **CurrencyService** | Exchange rates from Frankfurter API, convert/format amounts |
| **PerformanceService** | Historical price data, mock generation, summary calculations |
| **NetworkStatusService** | Online/offline detection via window events |
| **PriceAlertService** | Browser notifications when stock drops below threshold |
| **CsvImportService** | Parse broker CSVs (Zerodha, Groww, Angel, Generic) |
| **StockAnalysisService** | Analyze red stocks (sector-wide, correction, news, technical) |
| **AllocationAdvisorService** | 3 strategies: Equal, Risk-Adjusted, Defensive |
| **PortfolioInsightsService** | Concentration, sector, diversification, performance analysis |
| **TourService** | Onboarding tour engine with step navigation, highlighting |

---

## 10. Feature Pages — Functional Specifications

### 10.1 Dashboard Page (`/`)

**Purpose:** Main entry point showing portfolio overview, stock list, and "red" buying candidates.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Growth Twenty] [Dividend Ten]  tabs                    │
├─────────────────────────────────────────────────────────┤
│  KPI Cards:                                              │
│  [Total Stocks] [Red Stocks] [Total Invested]            │
│  [Current Value] [Total P/L]                             │
├───────────────────────────────────────┬─────────────────┤
│  Holdings Pie Chart | Portfolio       │  Red Candidates  │
│  (by stock/folder)  | Progress Radial │  Sidebar         │
├───────────────────────────────────────┤  (scrollable     │
│  [Search] [Sector chips] [Red Only]   │   list of red    │
│  Stock Table (paginated):             │   stocks with    │
│  Symbol | Price | Change | Status |   │   + Plan button) │
│  Holdings | Actions                   │                  │
│  [10|20|50|100] per page              │                  │
│  [< 1 2 ... N >] pagination          │                  │
└───────────────────────────────────────┴─────────────────┘
```

**Data Sources:**
- `PortfolioService.growth20Stocks` / `dividend10Stocks`
- `QuoteService.quotes`
- `HoldingsService.holdings`
- `SettingsService.isRed(quote)`
- `PlannerService.isInCurrentPlan(stockId)`

**Key Interactions:**
1. Tab switch between Growth 20 / Dividend 10
2. Real-time search filtering by symbol/name/sector
3. Sector filter chips (click to filter by sector)
4. "Red only" toggle filter
5. Sort by column
6. Refresh quotes button (shows cache age)
7. Pagination with configurable page size
8. "Add to Plan" button on red stocks
9. Holdings pie chart (doughnut, colored per stock)
10. Portfolio progress radial indicators

### 10.2 Planner Page (`/planner`)

**Purpose:** Create and manage monthly investment plans with allocation strategies.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Month Picker: [< April 2026 >]                          │
│  [Create Plan] [Plan Name dropdown if multiple]          │
├─────────────────────────────────────────────────────────┤
│  Budget: [₹ input]  Allocated: ₹X / ₹Y  [progress bar]│
│  [Equal Weight] [Smart Alloc] [Save Draft] [Export CSV] │
├─────────────────────────────────────────────────────────┤
│  Plan Items Table:                                       │
│  Symbol | Planned Price | Target Amount | Target Qty |   │
│  Status | Actions (remove)                               │
├─────────────────────────────────────────────────────────┤
│  AI Allocation Suggestions:                              │
│  [Equal Weight card] [Risk-Adjusted card] [Defensive]    │
│  Each shows: breakdown, risk profile, expected return    │
├─────────────────────────────────────────────────────────┤
│  Red Candidates (not in plan):                           │
│  [+ Add] buttons for quick inclusion                     │
├─────────────────────────────────────────────────────────┤
│  Actions: [Execute Plan] [Finalize] [Delete]             │
│  Reconciliation summary (if executed)                    │
└─────────────────────────────────────────────────────────┘
```

**Key Interactions:**
1. Select month with arrow navigation
2. Create/switch between multiple plans per month
3. Set budget amount
4. Add stocks from red candidates or search
5. Apply Equal Weight allocation
6. View AI allocation suggestions (3 strategies)
7. Apply a suggested strategy
8. Edit individual stock amounts
9. Execute plan → Creates BUY transactions
10. Finalize plan (locks it)
11. Save as reusable draft (goes to Drafts)
12. Export to CSV/Excel

### 10.3 Transactions Page (`/transactions`)

**Purpose:** Record and view buy/dividend transactions.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Tabs: [Buy] [Dividend] [Holdings]                       │
├─────────────────────────────────────────────────────────┤
│  Add Transaction Form:                                   │
│  Folder: [dropdown] → Symbol: [dropdown]                │
│  Date: [datepicker] Qty: [input] Price: [input]         │
│  Charges: [input]  [Add Transaction]                     │
├─────────────────────────────────────────────────────────┤
│  Filters: [Symbol select] [Date range]  [Clear]          │
├─────────────────────────────────────────────────────────┤
│  Transaction List (paginated):                           │
│  Date | Symbol | Qty | Price | Charges | Total | Plan   │
│  [Delete] per row                                        │
├─────────────────────────────────────────────────────────┤
│  [Import CSV] button → CSV Import Dialog                 │
└─────────────────────────────────────────────────────────┘
```

**CSV Import Flow:**
1. Upload CSV file (drag-and-drop or file picker)
2. Auto-detect broker format (Zerodha/Groww/Angel/Generic)
3. Preview parsed rows with validation status
4. Confirm import → Creates BUY transactions
5. Show summary (imported count, skipped, errors)

### 10.4 Drafts Page (`/drafts`)

**Purpose:** Save and manage reusable plan templates (max 10).

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Draft Count: 3/10  [+ New Draft]                        │
├─────────────────────────────────────────────────────────┤
│  Draft Card (expandable):                                │
│  [Name] [Budget] [Items count] [Created date]            │
│  Actions: [Edit] [Delete] [Load to Planner] [Execute]   │
│  Expanded: items table with amounts                      │
└─────────────────────────────────────────────────────────┘
```

### 10.5 Folders Page (`/folders`)

**Purpose:** Manage stocks within curated folders.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Tabs: [Growth Twenty (20)] [Dividend Ten (10)]          │
├─────────────────────────────────────────────────────────┤
│  Add Stock Form:                                         │
│  Symbol | Display Name | Exchange | Sector | [Add]       │
├─────────────────────────────────────────────────────────┤
│  Stock Table (paginated):                                │
│  Rank | Symbol | Name | Exchange | Sector | Active |     │
│  [Toggle Active] [↑] [↓] [Delete]                       │
└─────────────────────────────────────────────────────────┘
```

### 10.6 Performance Page (`/performance`)

**Purpose:** Historical stock performance visualization.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  View Mode: [Single] [Compare] [Sector]                  │
│  Folder: [Growth 20 ▼]  Stock: [RELIANCE ▼]             │
│  Time Range: [1W] [30D] [1M] [3M] [6M] [5Y]            │
│  Chart Type: [Line ○] [Area ○]                           │
│  [✓ Normalize] [✓ Show Aggregate]                        │
├─────────────────────────────────────────────────────────┤
│  LINE CHART (Chart.js)                                   │
│  Multi-line for comparison mode                          │
├─────────────────────────────────────────────────────────┤
│  Summary Cards:                                          │
│  [Start Price] [End Price] [Change] [% Change]           │
│  [High] [Low] [Average]                                  │
├─────────────────────────────────────────────────────────┤
│  Performance Table Snapshot                               │
│  Symbol | Start | End | Change | % | High | Low          │
└─────────────────────────────────────────────────────────┘
```

### 10.7 Analytics Page (`/analytics`)

**Purpose:** Portfolio analysis with charts and sector breakdown.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Summary KPIs:                                           │
│  [Total Value] [Unrealized P/L] [Total Dividends] [YTD] │
├──────────────────────────────┬──────────────────────────┤
│  Doughnut Chart              │  Growth Allocation List   │
│  (Portfolio Allocation)      │  Stock | Amount | %       │
├──────────────────────────────┤──────────────────────────┤
│  Line Chart                  │  Dividend Allocation List │
│  (Monthly Investment Trends) │  Stock | Amount | Divs    │
│  Range: [3M][6M][1Y][ALL]   │                           │
├──────────────────────────────┴──────────────────────────┤
│  Sector Diversification Cards                            │
│  Sector | Holdings Count | Total Value | % of Portfolio  │
└─────────────────────────────────────────────────────────┘
```

### 10.8 Settings Page (`/settings`)

**Purpose:** All application configuration in one place.

**Sections:**
1. **Profile** — Name, avatar upload/remove
2. **Appearance** — Theme toggle, language selector
3. **Currency** — Display currency dropdown with flags
4. **Red Rule** — Type selector + threshold input
5. **Data Source** — Yahoo/Finnhub/AlphaVantage/Mock + API keys
6. **Refresh** — Auto-refresh toggle, interval
7. **Price Alerts** — Symbol → threshold management
8. **Data Management** — Export JSON, Import JSON, Clear cache, Reset all
9. **Tour** — Restart onboarding tour button

### 10.9 Auth Pages (`/auth/*`)

**Login:** Email + password + "Remember Me" + links to register/forgot
**Register:** Name + email + password (with strength meter) + confirm
**Forgot Password:** Email input → generates reset link (mock)
**Reset Password:** New password + confirm (with token validation)

---

## 11. Shared Components

| Component | Purpose | Props/Inputs |
|-----------|---------|--------------|
| **DialogComponent** | Modal dialog system | type: confirm/alert/prompt/danger |
| **DialogService** | Programmatic dialog API | confirm(), alert(), prompt(), danger() |
| **CsvImportDialog** | 3-step CSV import wizard | onClose, stocks |
| **CurrencySelector** | Currency dropdown with flags | selected, currencyChange output |
| **RadialProgress** | SVG circular progress | value, max, label, color, size |
| **SkeletonComponent** | Loading placeholder | width, height |
| **SkeletonCardComponent** | Card placeholder | — |
| **SkeletonTableRow** | Table row loader | columns count |
| **SkeletonStockRow** | Stock row loader | — |
| **SkeletonTransactionRow** | Transaction row loader | — |
| **SkeletonChartComponent** | Chart placeholder | — |
| **TourOverlay** | Onboarding tour tooltip + backdrop | — (reads TourService) |
| **HoldingsPieChart** | Doughnut chart for holdings | holdings data |
| **PortfolioInsightsCard** | Insight cards (concentration, etc.) | folderId |
| **TimeRangeSelector** | Time range chip selector | ranges, selected, onChange |
| **PerformanceChart** | Chart.js line/area chart | data, config |
| **PerformanceSummaryCards** | KPI cards for performance | summary data |
| **CompareStocksSelector** | Multi-select dropdown (max 5) | stocks, selected |
| **PerformanceTableSnapshot** | Tabular comparison | comparison data |
| **AllocationSuggestions** | 3 strategy cards | suggestions array |

### Shared Pipes

| Pipe | Purpose |
|------|---------|
| **CurrencyDisplayPipe** | Format number as currency with conversion |

### Shared Utils

| Utility | Functions |
|---------|-----------|
| **currency.utils.ts** | `getCurrencySymbol()`, `getLocaleForCurrency()`, `formatCurrencyValue()`, `convertAmount()` |
| **pagination.utils.ts** | `buildPageNumbers()` — generates `[1, -1, 4, 5, 6, -1, 10]` style pagination |

---

## 12. Styling & Theming System

### Theme Architecture
- **Dark theme:** `bg-slate-950`, `text-slate-100`, emerald/cyan accent colors
- **Light theme:** `bg-gray-50`, `text-gray-900`, emerald/green accent colors
- **Toggle mechanism:** CSS class on `<html>` element (`dark` / `light`)
- **Tailwind config:** Dark mode via `class` strategy (not `media`)

### Color Palette
| Purpose | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `slate-950` | `gray-50` |
| Text Primary | `slate-100` | `gray-900` |
| Text Secondary | `slate-400` | `gray-500` |
| Accent Primary | `emerald-500` | `emerald-600` |
| Accent Secondary | `cyan-500` | `cyan-600` |
| Card Background | `slate-900/80` | `white/80` |
| Border | `emerald-500/20` | `emerald-200/30` |
| Red (negative) | `red-400` | `red-600` |
| Green (positive) | `emerald-400` | `emerald-600` |

### Visual Effects
- **Glassmorphism:** `backdrop-blur-xl` on cards and header
- **Animated SVG background:** Hexagon pattern + dot grid + floating orbs
- **Gradient borders:** `bg-gradient-to-r from-emerald-500/30 to-cyan-500/30`
- **Shadow effects:** `shadow-lg shadow-emerald-500/20`
- **Animated glow line** on header bottom border
- **Futuristic grid pattern** in header background

### Responsive Breakpoints
- **Mobile:** Full-width, hamburger menu, stacked cards
- **Desktop (md+):** Sidebar layout, horizontal nav, multi-column grids
- **Navigation:** Hidden on mobile, shown desktop (`md:flex`)

---

## 13. Internationalization (i18n)

### Supported Languages
| Code | Name | Native Name |
|------|------|-------------|
| `en` | English | English |
| `hi` | Hindi | हिन्दी |
| `mr` | Marathi | मराठी |

### Translation Key Structure
```json
{
  "en": {
    "nav": {
      "dashboard": "Dashboard",
      "folders": "Stock Vault",
      "planner": "Planner",
      ...
    },
    "dashboard": {
      "title": "Dashboard",
      "totalStocks": "Total Stocks",
      "redStocks": "Red Stocks",
      ...
    },
    "tour": {
      "welcome": {
        "title": "Welcome to Dip Hunter!",
        ...
      }
    }
  },
  "hi": { ... },
  "mr": { ... }
}
```

### Translation Usage Pattern
```typescript
// Angular: this.lang.t('dashboard.totalStocks')
// React:   t('dashboard.totalStocks')

// With params: this.lang.t('holdings.count', { count: 5 })
// Translation: "You have {count} holdings"
```

### i18n Sections
- `nav` — Navigation labels
- `dashboard` — Dashboard UI
- `folders` — Stock Vault page
- `planner` — Planner page
- `transactions` — Transactions page
- `analytics` — Analytics page  
- `performance` — Performance page
- `settings` — Settings page
- `auth` — Login/Register pages
- `tour` — Onboarding tour steps
- `common` — Shared labels

---

## 14. PWA & Service Worker

### Manifest Configuration
```json
{
  "name": "Dip Hunter",
  "short_name": "DipHunter",
  "display": "standalone",
  "theme_color": "#0f172a",
  "background_color": "#0f172a",
  "categories": ["finance", "business", "productivity"]
}
```

### Service Worker Caching Strategy
| Group | Strategy | Max Size | Max Age |
|-------|----------|----------|---------|
| `app` (core files) | Prefetch | — | — |
| `assets` (icons) | Lazy | — | — |
| `translations` | Performance | 10 items | 7 days |
| `quotes-api` | Freshness | 5 items | 4 hours |

### PWA Shortcuts
- Dashboard: `/` (icon: icon-192x192.png)
- Stock Vault: `/folders`

### Update Handling
- Service worker checks for updates automatically
- Shows dialog: "A new version is available. Load it now?"
- User confirms → `window.location.reload()`

---

## 15. Backend / Serverless Functions

### Netlify Serverless Function: `quotes.mjs`

**Endpoint:** `GET /.netlify/functions/quotes`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `symbols` | string | Comma-separated Yahoo-format symbols (e.g., `RELIANCE.NS,TCS.NS`) |
| `source` | string? | Override: `yahoo`, `finnhub`, `alphavantage` |
| `capabilities` | `1`? | Return available data sources |

**Response:**
```json
{
  "quotes": {
    "RELIANCE.NS": {
      "symbol": "RELIANCE.NS",
      "price": 2450.50,
      "previousClose": 2470.00,
      "change": -19.50,
      "changePercent": -0.79,
      "dayHigh": 2465.00,
      "dayLow": 2440.00,
      "volume": 12345678,
      "currency": "INR"
    }
  },
  "meta": {
    "requested": 2,
    "success": 2,
    "errors": [],
    "source": "finnhub",
    "timestamp": "2026-04-09T..."
  }
}
```

**Source Priority & Fallback Chain:**
```
1. Finnhub (if FINNHUB_API_KEY env var set)
   - Format: NSE:RELIANCE
   - Limit: 60 requests/min
   
2. Alpha Vantage (if ALPHAVANTAGE_API_KEY set)
   - Format: RELIANCE.BSE
   - Limit: 25 requests/day
   - 12s delay between batches

3. Stooq (no API key needed)
   - Cloud-safe, CSV response
   
4. Yahoo Finance (last resort)
   - query2.finance.yahoo.com (no auth)
   - Fallback to query1 with crumb/cookie
```

### Express Dev Server: `server/index.js`
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/quotes?symbols=` | GET | Batch quote fetch (Yahoo) |
| `/api/chart/:symbol` | GET | Single stock chart data |

### External API: Frankfurter
| Endpoint | Purpose |
|----------|---------|
| `https://api.frankfurter.dev/latest?from=INR` | Exchange rates |
| Cache TTL: 6 hours | |

---

## 16. External APIs & Data Sources

### Quote Data Sources

| Source | Symbol Format | Rate Limit | Auth | Notes |
|--------|--------------|------------|------|-------|
| Yahoo Finance | `RELIANCE.NS` | None stated | None/Crumb | Via serverless function |
| Finnhub | `NSE:RELIANCE` | 60 req/min | API Key (env) | Free tier |
| Alpha Vantage | `RELIANCE.BSE` | 25 req/day | API Key (env) | Free tier |
| Stooq | `RELIANCE.NS` | Unknown | None | Fallback, CSV format |
| Mock | `RELIANCE` | ∞ | None | Deterministic random |

### Mock Data Generation Logic
```
Base prices (hardcoded per symbol):
  RELIANCE: 2450, HDFCBANK: 1650, TCS: 3800, INFY: 1500
  BHARTIARTL: 1200, HAL: 4500, LT: 3200, ADANIPORTS: 1100
  ITC: 450, BAJFINANCE: 6800, ... (20+ stocks)

Daily variation: ±3% random
Trending bias: slight upward
Change calculation: open * (random ±3%)
```

### Currency Exchange
- **API:** Frankfurter (https://api.frankfurter.dev)
- **Base Currency:** INR (default)
- **Supported:** INR, USD, EUR, GBP, JPY, AUD, CAD, CHF, SGD, HKD
- **Cache TTL:** 6 hours

---

## 17. Key Business Rules & Domain Logic

### "Red" Stock Detection
```
RED condition types:
1. CHANGE_PERCENT_NEGATIVE — changePercent < 0
2. CHANGE_PERCENT_THRESHOLD — changePercent ≤ threshold (e.g., -3%)
3. BELOW_SMA — Below simple moving average (future)

User configures in Settings → redRule
```

### Holdings Calculation
```
For each stock with BUY transactions:
  totalQty = SUM of all buy quantities
  investedAmount = SUM of (qty × price + charges) for all buys
  avgPrice = investedAmount / totalQty
  currentPrice = from QuoteService
  currentValue = totalQty × currentPrice
  unrealizedPL = currentValue - investedAmount
  unrealizedPLPercent = (unrealizedPL / investedAmount) × 100
  totalDividends = SUM of all DIVIDEND transactions

Exclusions: Holdings with totalQty = 0 are hidden
```

### Plan Lifecycle
```
1. CREATE (status: DRAFT)
   → User sets budget, adds stocks
   → Apply equal weight or AI strategies
   
2. EXECUTE
   → Creates BUY transactions for each item
   → Marks items as executed
   → Links transactions via planId
   
3. FINALIZE (status: FINAL)
   → Locks plan from further edits
   → Stores finalization timestamp
```

### Allocation Strategies
```
EQUAL_WEIGHT:
  perStock = budget / itemCount
  
RISK_ADJUSTED:
  volatilityScore = 10 - |changePercent|
  weight = volatilityScore / totalVolatility
  allocation = budget * weight
  
DEFENSIVE:
  defSectors = [Pharma, FMCG, Power, Telecom, Banking, Healthcare]
  70% budget → defensive sector stocks (equal weight)
  30% budget → growth sector stocks (equal weight)
```

### Portfolio Insights Rules
```
CONCENTRATION:
  CRITICAL: Single stock > 50% of portfolio
  WARNING:  Single stock 30-50% 
  INFO:     Max stock < 5% (well-distributed)

SECTOR EXPOSURE:
  WARNING: Single sector > 40%
  INFO:    ≥ 5 sectors balanced

DIVERSIFICATION:
  WARNING: < 5 holdings
  INFO:    ≥ 15 holdings

PERFORMANCE:
  WARNING: > 10% total loss
  INFO:    > 50% total gain (strong)
```

### CSV Import Broker Detection
```
Headers that identify broker:
- Zerodha: "tradingsymbol" OR "trade_date"
- Groww: "company" OR "company name" OR "scrip name"
- Angel: "symbol" AND "segment" AND ("order_date" OR "trade_date")
- Generic: fallback for any other format

Symbol cleanup:
- Strip suffixes: -EQ, -BE, -N1, -N2, -SM
- Uppercase
- Map company names → symbols (150+ Groww mappings)
```

### Price Alerts
```
Trigger: quote.changePercent ≤ alertThreshold (e.g., -3%)
Cooldown: 4 hours between repeat notifications per symbol
Delivery: Browser Notification API
```

### Seeded Stock Data
**Growth Twenty (20 stocks):**
RELIANCE, HDFCBANK, ICICIBANK, TCS, INFY, BHARTIARTL, HAL, LT, ADANIPORTS, ITC, BAJFINANCE, SUNPHARMA, TITAN, NTPC, ULTRACEMCO, ASIANPAINT, MARUTI, M&M, PERSISTENT, AFFLE

**Dividend Ten (10 stocks):**
VEDL, COALINDIA, CASTROLIND, ONGC, POWERGRID, RECLTD, PFC, NTPC, ITC, WIPRO

---

## 18. User Interaction Flows

### 18.1 First-Time User Flow
```
1. Visit app → Redirect to /auth/login
2. Click "Register" → Fill name/email/password
3. Password strength indicator shows real-time feedback
4. Submit → Redirect to /auth/login with success message
5. Login → Redirect to Dashboard
6. Tour auto-starts: 9-step onboarding highlighting key features
7. Tour covers: welcome, folders, KPIs, stock list, red candidates,
   planner, transactions, settings, completion
```

### 18.2 Daily "Buy the Dip" Workflow
```
1. Open Dashboard → See KPI cards (red count, P/L)
2. Check Red Candidates sidebar → Spot dipped stocks
3. Click "Add to Plan" on red stocks
4. Navigate to Planner → Review plan for current month
5. Set budget → Apply allocation strategy
6. Review AI suggestions (equal/risk/defensive)
7. Execute plan → Auto-creates BUY transactions
8. View in Transactions tab → Verify entries
9. Holdings update automatically → Updated P/L
```

### 18.3 CSV Import Workflow
```
1. Navigate to Transactions
2. Click "Import CSV"
3. Drag-and-drop or select CSV file
4. Auto-detects broker format (Zerodha/Groww/Angel)
5. Preview parsed rows with validation
6. Confirm import
7. BUY transactions created in bulk
8. Holdings recalculate automatically
```

### 18.4 Settings Configuration Flow
```
1. Navigate to Settings
2. Set display currency (INR/USD/EUR/...)
3. Choose quote data source (Mock for testing, Yahoo for real)
4. Configure red rule threshold
5. Set up price alerts for watched stocks
6. Optionally enter personal API keys
7. Export data for backup
8. Import data to restore
```

---

## 19. Terminology Glossary

| Term | Definition |
|------|-----------|
| **Dip** | A stock price decline — opportunity to buy |
| **Red Stock** | A stock whose price change meets the "red rule" threshold (e.g., negative change) |
| **Green Stock** | A stock with positive price change |
| **Growth Twenty** | Portfolio folder of 20 growth-oriented stocks |
| **Dividend Ten** | Portfolio folder of 10 dividend-paying stocks |
| **Stock Vault** | UI name for the Folders page (stock management) |
| **Holding** | Virtual / computed position: aggregated from all BUY transactions for a stock |
| **Average Price (avgPrice)** | Total invested / total quantity |
| **Unrealized P/L** | Current value - invested amount (paper profit/loss) |
| **Plan** | Monthly investment plan with budget and stock allocations |
| **Draft** | Reusable plan template (max 10) |
| **Execute Plan** | Convert plan items into actual BUY transactions |
| **Finalize Plan** | Lock a plan from further edits (DRAFT → FINAL) |
| **Equal Weight** | Allocation strategy: divide budget equally across all stocks |
| **Risk-Adjusted** | Allocation strategy: allocate more to less volatile stocks |
| **Defensive** | Allocation strategy: 70% defensive sectors, 30% growth |
| **Red Rule** | Configurable condition that determines when a stock is "red" |
| **Quote** | Real-time stock price data point |
| **Cache TTL** | Time-to-live for cached quote data |
| **Data Source** | Quote provider: Yahoo, Finnhub, AlphaVantage, or Mock |
| **Currency Display** | UI-level currency conversion (all data stored in INR) |
| **Tour** | Interactive onboarding walkthrough for first-time users |
| **KPI** | Key Performance Indicator (summary metrics on dashboard) |
| **Charges** | Brokerage fees, taxes, etc. on a buy transaction |
| **Plan Item** | A single stock entry within a monthly plan |
| **Sector** | Industry classification (Banking, IT, Pharma, etc.) |
| **NSE/BSE** | National Stock Exchange / Bombay Stock Exchange (India) |
| **SIP** | Systematic Investment Plan (monthly investment approach) |

---

## 20. Angular → React Migration Mapping

### Component Mapping

| Angular | React Equivalent |
|---------|-----------------|
| `@Component({ standalone: true })` | React functional component |
| `signal()` | `useState()` or Zustand store |
| `computed()` | `useMemo()` or Zustand derived state |
| `effect()` | `useEffect()` |
| `inject(Service)` | Custom hook: `useService()` or Zustand `useStore()` |
| `@Input()` | React props |
| `@Output()` / EventEmitter | Callback props (e.g., `onChange`) |
| `ngOnInit` | `useEffect(() => {}, [])` |
| `ngOnDestroy` | `useEffect` cleanup return |
| `takeUntilDestroyed` | `useEffect` cleanup |
| `RouterLink` | React Router `<Link>` or `<NavLink>` |
| `RouterOutlet` | `<Outlet>` from React Router |
| `routerLinkActive` | `NavLink` with `className` callback |
| `ngModel` (two-way binding) | `useState` + `onChange` handler |
| `FormsModule` | React Hook Form |
| `HttpClient` | `fetch()` or Axios |
| `Observable` / `BehaviorSubject` | State + useEffect, or React Query |
| `Pipe` | Utility function or React component |
| `@HostListener` | `useEffect` with event listener |
| `ng2-charts` | `react-chartjs-2` (same Chart.js) |
| `@ngx-translate` | `react-i18next` |
| `Angular Service Worker` | Workbox / vite-plugin-pwa |
| `canActivate guard` | React Router `loader` / `<Navigate>` wrapper |
| `HTTP Interceptor` | Axios interceptor or fetch wrapper |
| Template `@if / @for` | JSX `{condition && ...}` / `.map()` |
| `[class.xxx]="expr"` | `className={expr ? 'xxx' : ''}` or `clsx()` |
| `(click)="fn()"` | `onClick={fn}` |
| `[(ngModel)]` | `value={state}` + `onChange` |

### Service → Hook/Store Mapping

| Angular Service | React Equivalent |
|----------------|-----------------|
| `AuthService` | `useAuthStore` (Zustand) + `useAuth()` hook |
| `StorageService` | Plain utility module (no React needed) |
| `PortfolioService` | `usePortfolioStore` (Zustand) |
| `QuoteService` | `useQuoteStore` + `useQuery` (React Query optional) |
| `TransactionService` | `useTransactionStore` |
| `HoldingsService` | `useHoldingsStore` (derived from transactions + quotes) |
| `PlannerService` | `usePlannerStore` |
| `DraftsService` | `useDraftStore` |
| `SettingsService` | `useSettingsStore` |
| `ThemeService` | `useThemeStore` + CSS class on `<html>` |
| `LanguageService` | `react-i18next` (i18n.t()) |
| `UserService` | `useUserStore` |
| `CurrencyService` | `useCurrencyStore` |
| `PerformanceService` | `usePerformanceStore` |
| `NetworkStatusService` | `useNetworkStatus()` hook |
| `PriceAlertService` | `usePriceAlerts()` hook |
| `CsvImportService` | Plain utility module |
| `StockAnalysisService` | Plain utility module |
| `AllocationAdvisorService` | Plain utility module |
| `PortfolioInsightsService` | Plain utility or custom hook |
| `TourService` | `useTourStore` or react-joyride library |
| `DialogService` | Context provider + `useDialog()` hook |

### Route Guard Mapping
```tsx
// Angular: canActivate: [authGuard]
// React equivalent:
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

// Angular: canActivate: [guestGuard]
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
```

### HTTP Interceptor Mapping
```tsx
// Angular: authInterceptor
// React: Axios interceptor
const api = axios.create({ baseURL: '' });
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && !config.url?.includes('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 21. Agent Instructions for React Conversion

### Conversion Agent System Prompt

```
You are an expert React/TypeScript developer. Your task is to convert the 
"Dip Hunter" Angular 21 application into a production-ready React application 
with IDENTICAL UI and functionality.

CRITICAL REQUIREMENTS:
1. Match the Angular app's UI pixel-for-pixel (same Tailwind classes)
2. Maintain ALL business logic exactly as documented
3. Keep the same localStorage keys and data format (migration-compatible)
4. Preserve the same API endpoints and response handling
5. Support the same dark/light theme system
6. Support the same i18n system (en/hi/mr)
7. Maintain the same PWA capabilities
8. Keep the same serverless function (quotes.mjs) — it's framework-agnostic

TECH STACK:
- React 18+ with TypeScript (strict mode)
- Vite for build tooling
- React Router v6 for routing
- Zustand for state management (replaces Angular Signals)
- Tailwind CSS 3.x (same config)
- Chart.js + react-chartjs-2 (replaces ng2-charts)
- react-i18next (replaces @ngx-translate)
- React Hook Form (replaces FormsModule)
- Workbox / vite-plugin-pwa (replaces @angular/service-worker)
- Vitest + React Testing Library for tests

PROJECT STRUCTURE:
```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Root component (shell, header, nav)
├── routes.tsx                  # Route definitions
├── index.css                   # Global Tailwind + custom styles
│
├── stores/                     # Zustand stores (1:1 with Angular services)
│   ├── auth.store.ts
│   ├── portfolio.store.ts
│   ├── quote.store.ts
│   ├── transaction.store.ts
│   ├── holdings.store.ts      # Derived store
│   ├── planner.store.ts
│   ├── drafts.store.ts
│   ├── settings.store.ts
│   ├── theme.store.ts
│   ├── language.store.ts
│   ├── user.store.ts
│   ├── currency.store.ts
│   ├── performance.store.ts
│   └── tour.store.ts
│
├── models/                     # TypeScript interfaces (copy from Angular)
│   ├── index.ts
│   ├── auth.model.ts
│   ├── stock.model.ts
│   ├── ... (all model files)
│
├── hooks/                      # Custom React hooks
│   ├── useNetworkStatus.ts
│   ├── usePriceAlerts.ts
│   └── useDialog.ts
│
├── utils/                      # Pure utility functions
│   ├── storage.ts              # localStorage wrapper
│   ├── csv-import.ts           # CSV parsing logic
│   ├── stock-analysis.ts       # Red stock analysis
│   ├── allocation-advisor.ts   # Strategy calculations
│   ├── portfolio-insights.ts   # Concentration/sector analysis
│   ├── currency.utils.ts       # Currency conversion
│   └── pagination.utils.ts     # Page number generation
│
├── features/                   # Feature pages
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── HoldingsPieChart.tsx
│   │   └── PortfolioInsightsCard.tsx
│   ├── auth/
│   │   ├── AuthLayout.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── planner/
│   │   ├── PlannerPage.tsx
│   │   └── AllocationSuggestions.tsx
│   ├── transactions/
│   │   └── TransactionsPage.tsx
│   ├── drafts/
│   │   └── DraftsPage.tsx
│   ├── folders/
│   │   └── FoldersPage.tsx
│   ├── performance/
│   │   ├── PerformancePage.tsx
│   │   ├── TimeRangeSelector.tsx
│   │   ├── PerformanceChart.tsx
│   │   ├── PerformanceSummaryCards.tsx
│   │   ├── CompareStocksSelector.tsx
│   │   └── PerformanceTableSnapshot.tsx
│   ├── analytics/
│   │   └── AnalyticsPage.tsx
│   └── settings/
│       └── SettingsPage.tsx
│
├── components/                 # Shared components
│   ├── Dialog.tsx + DialogProvider.tsx
│   ├── CsvImportDialog.tsx
│   ├── CurrencySelector.tsx
│   ├── RadialProgress.tsx
│   ├── Skeletons.tsx
│   ├── TourOverlay.tsx
│   └── ProtectedRoute.tsx
│
├── pipes/                      # Convert to utility functions or components
│   └── currencyDisplay.ts
│
└── assets/
    └── i18n/
        └── translations.json   # Copy from Angular
```

CONVERSION ORDER:
1. Project setup (Vite + Tailwind + dependencies)
2. TypeScript models (copy as-is)
3. Utility functions (StorageService, currency utils, pagination)
4. Zustand stores (core state management)
5. Auth flow (stores + pages + guards)
6. App shell (header, nav, theme, language)
7. Dashboard page (most complex)
8. Planner + Drafts pages
9. Transactions page (+ CSV import)
10. Folders page
11. Performance page (+ Chart.js)
12. Analytics page (+ Chart.js)
13. Settings page
14. Shared components (Dialog, Skeletons, Tour)
15. PWA setup (Workbox)
16. Testing
17. Netlify deployment config

KEY GOTCHAS:
- Angular template syntax `@if/@for/@switch` → JSX conditionals/maps
- Angular `[class.xxx]="expr"` → Use clsx() or template literals
- Angular two-way binding `[(ngModel)]` → controlled components
- Angular computed() → useMemo() with proper dependency arrays
- Angular effect() → useEffect() with cleanup
- BehaviorSubject → Zustand subscribe or React state
- Angular DI → React context or direct store imports
- The Tailwind classes can be copied nearly verbatim
- The translations.json file works as-is with react-i18next
- The serverless function (quotes.mjs) needs NO changes
- localStorage keys must match exactly for data compatibility
```

---

## Appendix A: localStorage Key Reference

| Key | Type | Service |
|-----|------|---------|
| `dh_folders` | `Folder[]` | PortfolioService |
| `dh_stocks` | `Stock[]` | PortfolioService |
| `dh_plans` | `MonthlyPlan[]` | PlannerService |
| `dh_transactions` | `Transaction[]` | TransactionService |
| `dh_drafts` | `PlanDraft[]` | DraftsService |
| `dh_settings` | `AppSettings` | SettingsService |
| `dh_quote_cache` | `QuoteCache` | QuoteService |
| `dh_exchange_rates` | `ExchangeRateCache` | CurrencyService |
| `dh_user` | `User` | UserService |
| `dh_theme` | `'dark' \| 'light'` | ThemeService |
| `dh_language` | `'en' \| 'hi' \| 'mr'` | LanguageService |
| `dh_auth_token` | `string` | AuthService |
| `dh_auth_user` | `AuthUser` | AuthService |
| `dh_remember_me` | `boolean` | AuthService |
| `dh_registered_users` | `Array<{...}>` | AuthService |
| `dh_reset_tokens` | `Array<{...}>` | AuthService |
| `dh_history_*` | `CachedHistory` | PerformanceService |
| `dip_hunter_tour_completed*` | `boolean` | TourService |
| `dip_hunter_tour_step*` | `number` | TourService |

## Appendix B: Default Seed Data

### Growth Twenty Stocks (20)
| Rank | Symbol | Name | Sector |
|------|--------|------|--------|
| 1 | RELIANCE | Reliance Industries | Oil & Gas |
| 2 | HDFCBANK | HDFC Bank | Banking |
| 3 | ICICIBANK | ICICI Bank | Banking |
| 4 | TCS | Tata Consultancy Services | IT |
| 5 | INFY | Infosys | IT |
| 6 | BHARTIARTL | Bharti Airtel | Telecom |
| 7 | HAL | Hindustan Aeronautics | Defence |
| 8 | LT | Larsen & Toubro | Infrastructure |
| 9 | ADANIPORTS | Adani Ports | Infrastructure |
| 10 | ITC | ITC Limited | FMCG |
| 11 | BAJFINANCE | Bajaj Finance | NBFC |
| 12 | SUNPHARMA | Sun Pharma | Pharma |
| 13 | TITAN | Titan Company | Consumer |
| 14 | NTPC | NTPC Limited | Power |
| 15 | ULTRACEMCO | UltraTech Cement | Cement |
| 16 | ASIANPAINT | Asian Paints | Consumer |
| 17 | MARUTI | Maruti Suzuki | Auto |
| 18 | M&M | Mahindra & Mahindra | Auto |
| 19 | PERSISTENT | Persistent Systems | IT |
| 20 | AFFLE | Affle India | IT |

### Dividend Ten Stocks (10)
| Rank | Symbol | Name | Sector |
|------|--------|------|--------|
| 1 | VEDL | Vedanta Limited | Mining |
| 2 | COALINDIA | Coal India | Mining |
| 3 | CASTROLIND | Castrol India | Oil & Gas |
| 4 | ONGC | Oil & Natural Gas Corp | Oil & Gas |
| 5 | POWERGRID | Power Grid Corp | Power |
| 6 | RECLTD | REC Limited | Finance |
| 7 | PFC | Power Finance Corp | Finance |
| 8 | NTPC | NTPC Limited | Power |
| 9 | ITC | ITC Limited | FMCG |
| 10 | WIPRO | Wipro Limited | IT |

---

*Document generated from full codebase analysis of angular-dip-hunter.*
*All interfaces, services, components, and business rules documented for React conversion.*
