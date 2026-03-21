# 📈 Dip Hunter - Stock Portfolio Dashboard

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Angular](https://img.shields.io/badge/Angular-21.0.0-dd0031.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-3178c6.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.19-38bdf8.svg)
![PWA](https://img.shields.io/badge/PWA-Enabled-5a0fc8.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Author](https://img.shields.io/badge/author-Roshan%20Mali-orange.svg)

**A comprehensive stock portfolio management dashboard built for the "Buy the Dip" investment strategy**

[Features](#-features) •
[Tech Stack](#-tech-stack) •
[Getting Started](#-getting-started) •
[Architecture](#-architecture) •
[Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Pages & Components](#-pages--components)
- [Services](#-services)
- [Data Models](#-data-models)
- [API Contracts](#-api-contracts)
- [Internationalization](#-internationalization-i18n)
- [Theming](#-theming)
- [Storage](#-storage)
- [Authentication](#-authentication)
- [PWA Support](#-pwa-support)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Author](#-author)
- [License](#-license)

---

## 🎯 Overview

**Dip Hunter** is a personal stock portfolio management application built with **Angular 21**. It helps investors track and manage their investments using the "Buy the Dip" strategy — purchasing stocks when they decline from their recent highs.

The application manages a **split-portfolio structure**:
- **Growth Twenty (G20)**: 20 high-growth potential stocks
- **Dividend Ten (D10)**: 10 high-dividend yield stocks

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Red Stock** | A stock that is down (negative change) — buying opportunity |
| **Green Stock** | A stock that is up (positive change) — hold/watch |
| **Dip Buying** | Purchasing stocks when they decline below a threshold |
| **Monthly Planning** | Allocating monthly budget to red stock candidates |

---

## ✨ Features

### 📊 Dashboard
- Real-time stock quotes with price and change percentage
- Visual indicators for red (buy) and green (hold) stocks
- Quick portfolio overview with KPI cards
- Search and filter functionality
- One-click add to monthly plan
- Skeleton loaders during data fetch

### 📁 Folder Management
- Organize stocks into Growth Twenty and Dividend Ten folders
- Add, edit, and remove stocks
- Rank-based ordering
- Active/Inactive status toggle

### 📅 Monthly Planner
- Create monthly buying plans from red stock candidates
- Budget allocation with remaining balance tracking
- **AI Allocation Advisor** with three smart strategies:
  - Equal Weight distribution
  - Risk-Adjusted allocation
  - Defensive allocation
- Plan finalization and execution tracking

### 💰 Transactions
- Record buy transactions with price, quantity, and charges
- Track dividend income
- View consolidated holdings
- Real-time P/L calculation

### 📈 Analytics
- Total portfolio value and cost basis
- Unrealized P/L with percentage
- YTD investment summary
- Portfolio allocation charts (Pie/Doughnut) using Chart.js
- Monthly transaction trends (Line chart)
- **Portfolio Insights** — AI-powered analysis of concentration, sector exposure, and diversification

### 📊 Performance
- Historical price charts with multiple time ranges: `1W`, `30D`, `1M`, `3M`, `6M`, `5Y`
- Single stock performance view
- Multi-stock comparison (up to 5 stocks)
- Aggregate portfolio performance
- Normalized percentage view for comparison
- Performance summary cards (Start, End, Δ₹, Δ%)
- Comparison table with top movers

### ⚙️ Settings
- User profile management
- Theme toggle (Dark/Light)
- Language selection (English, Hindi, Marathi)
- Red stock rule customization
- Auto-refresh interval configuration
- Data backup (Export/Import JSON)
- Reset all data option

### 🔐 Authentication
- User registration with validation
- Login with email/password
- Session-based auth with route guards
- Protected routes via `authGuard` / `guestGuard`
- Logout functionality

### 🌐 Internationalization
- Full i18n support via `@ngx-translate`
- 3 languages: English, Hindi (हिंदी), Marathi (मराठी)
- Dynamic language switching
- Persistent language preference

### 🎨 Theming
- Dark mode (default)
- Light mode
- Smooth CSS transitions
- Persistent theme preference
- Class-based Tailwind dark mode

### 🗺 First-Time User Tour
- Interactive step-by-step guided tour for new users
- Highlights key UI elements using CSS selectors
- i18n-aware (title/description via translation keys)
- Progress tracking and skip/complete support
- Tour completion state persisted to LocalStorage

### 📱 Progressive Web App (PWA)
- Installable on desktop and mobile
- Offline support via Angular Service Worker
- `manifest.webmanifest` with icons
- Asset caching strategies (prefetch / lazy)

---

## 🛠 Tech Stack

### Core Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 21.0.0 | Frontend framework |
| TypeScript | 5.9.2 | Programming language |
| RxJS | 7.8.0 | Reactive programming |

### UI & Styling

| Technology | Version | Purpose |
|------------|---------|---------|
| Tailwind CSS | 3.4.19 | Utility-first CSS framework |
| PostCSS | 8.5.6 | CSS processing |
| Autoprefixer | 10.4.23 | CSS vendor prefixes |

### Charts & Visualization

| Technology | Version | Purpose |
|------------|---------|---------|
| Chart.js | 4.5.1 | Performance and analytics charts |
| ng2-charts | 8.0.0 | Angular Chart.js wrapper |

### State Management
- **Angular Signals** — Reactive state management (Angular 17+)
- **Computed Signals** — Derived state calculations
- **Effects** — Side effect management

### Testing

| Technology | Version | Purpose |
|------------|---------|---------|
| Vitest | 4.0.8 | Unit test runner |
| jsdom | 27.1.0 | DOM testing environment |

### PWA

| Technology | Version | Purpose |
|------------|---------|---------|
| @angular/service-worker | 21.1.1 | Service Worker and offline caching |

### Storage
- **LocalStorage** — Persistent client-side storage
- **JSON** — Data serialization format

---

## 🚀 Getting Started

### Prerequisites

```bash
# Required
Node.js >= 20.x (LTS recommended)
npm >= 11.x

# Optional (for global Angular CLI)
npm install -g @angular/cli@21
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/roshan-mali/angular-dip-hunter.git
cd angular-dip-hunter

# 2. Install dependencies
npm install

# 3. Start development server
npm start
# or
ng serve

# 4. Open browser
# Navigate to http://localhost:4200
```

### Build

```bash
# Development build
ng build

# Production build
ng build --configuration=production

# Build output: dist/angular-dip-hunter/
```

### Testing

```bash
# Run unit tests
npm test
```

---

## 📂 Project Structure

```
angular-dip-hunter/
├── 📁 src/
│   ├── 📁 app/
│   │   ├── 📁 core/                       # Core module (singleton services)
│   │   │   ├── 📁 guards/
│   │   │   │   └── auth.guard.ts          # authGuard / guestGuard
│   │   │   ├── 📁 interceptors/
│   │   │   │   └── auth.interceptor.ts    # Auth token interceptor
│   │   │   ├── 📁 models/                 # TypeScript interfaces & types
│   │   │   │   ├── auth.model.ts
│   │   │   │   ├── folder.model.ts
│   │   │   │   ├── holding.model.ts
│   │   │   │   ├── performance.model.ts
│   │   │   │   ├── plan.model.ts
│   │   │   │   ├── quote.model.ts
│   │   │   │   ├── settings.model.ts
│   │   │   │   ├── stock.model.ts
│   │   │   │   ├── transaction.model.ts
│   │   │   │   ├── user.model.ts
│   │   │   │   └── index.ts               # Barrel export
│   │   │   ├── 📁 services/               # Application services
│   │   │   │   ├── allocation-advisor.service.ts  # AI allocation strategies
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── holdings.service.ts
│   │   │   │   ├── language.service.ts
│   │   │   │   ├── performance.service.ts
│   │   │   │   ├── planner.service.ts
│   │   │   │   ├── portfolio-insights.service.ts  # AI portfolio analysis
│   │   │   │   ├── portfolio.service.ts
│   │   │   │   ├── quote.service.ts
│   │   │   │   ├── settings.service.ts
│   │   │   │   ├── stock-analysis.service.ts      # AI stock analysis
│   │   │   │   ├── storage.service.ts
│   │   │   │   ├── theme.service.ts
│   │   │   │   ├── tour.service.ts                # First-time user tour
│   │   │   │   ├── transaction.service.ts
│   │   │   │   ├── user.service.ts
│   │   │   │   └── index.ts
│   │   │   └── 📁 tour/
│   │   │       └── tour.config.ts         # Tour steps configuration
│   │   ├── 📁 features/                   # Feature pages (lazy-loaded)
│   │   │   ├── 📁 analytics/
│   │   │   ├── 📁 auth/
│   │   │   │   ├── auth-layout.component.ts
│   │   │   │   ├── 📁 login/
│   │   │   │   └── 📁 register/
│   │   │   ├── 📁 dashboard/
│   │   │   │   └── 📁 components/
│   │   │   │       ├── holdings-pie-chart.component.ts
│   │   │   │       └── portfolio-insights-card.component.ts
│   │   │   ├── 📁 folders/
│   │   │   ├── 📁 performance/
│   │   │   │   └── 📁 components/
│   │   │   ├── 📁 planner/
│   │   │   │   └── 📁 components/
│   │   │   ├── 📁 settings/
│   │   │   └── 📁 transactions/
│   │   ├── 📁 shared/
│   │   │   └── 📁 components/
│   │   │       ├── 📁 radial-progress/    # Radial progress indicator
│   │   │       ├── 📁 skeleton/           # Skeleton loaders
│   │   │       └── 📁 tour-overlay/       # Tour overlay component
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── app.ts
│   │   ├── app.html
│   │   └── app.css
│   ├── 📁 assets/
│   │   └── 📁 i18n/
│   │       └── translations.json          # All language strings (EN/HI/MR)
│   ├── index.html
│   ├── main.ts
│   └── styles.css
├── 📁 public/
│   ├── manifest.webmanifest               # PWA manifest
│   └── 📁 icons/                          # PWA icons
├── 📁 server/                             # Express server for PWA
│   └── index.js
├── angular.json
├── ngsw-config.json                       # Service Worker config
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 🏗 Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AppComponent                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Header / Navigation                   │    │
│  │  [Dashboard] [Folders] [Planner] [Transactions]          │    │
│  │  [Analytics] [Performance] [Settings]                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    <router-outlet>                       │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │              Feature Page Component              │    │    │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │    │    │
│  │  │  │  Child  │ │  Child  │ │  Child  │           │    │    │
│  │  │  └─────────┘ └─────────┘ └─────────┘           │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                Tour Overlay Component                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Component  │────▶│   Service    │────▶│  LocalStorage│
│  (Signals)   │◀────│  (Signals)   │◀────│   (JSON)     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │   Computed   │
       │             │   Signals    │
       │             └──────────────┘
       ▼                    ▼
┌──────────────────────────────────────────┐
│              Template (HTML)              │
│   {{ signal() }} | @if | @for            │
└──────────────────────────────────────────┘
```

### Service Layer

```
┌─────────────────────────────────────────────────────────────────┐
│                        Services Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Auth     │  │  Portfolio  │  │ Transaction │             │
│  │   Service   │  │   Service   │  │   Service   │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         └────────────────┴────────────────┘                     │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Storage Service                        │    │
│  │             (LocalStorage Abstraction)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Quote    │  │  Holdings   │  │ Performance │             │
│  │   Service   │  │   Service   │  │   Service   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Allocation │  │  Portfolio  │  │    Stock    │             │
│  │  Advisor    │  │  Insights   │  │  Analysis   │             │
│  │   Service   │  │   Service   │  │   Service   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Theme     │  │  Language   │  │    Tour     │             │
│  │   Service   │  │   Service   │  │   Service   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📄 Pages & Components

### Main Pages

| Page | Route | Description | Guard |
|------|-------|-------------|-------|
| Login | `/auth/login` | User authentication | Guest only |
| Register | `/auth/register` | New user registration | Guest only |
| Dashboard | `/` | Stock overview & quick actions | Auth required |
| Folders | `/folders` | Manage stock folders | Auth required |
| Planner | `/planner` | Monthly buying plan with AI advisor | Auth required |
| Transactions | `/transactions` | Buy/Dividend records | Auth required |
| Analytics | `/analytics` | Portfolio analysis and insights | Auth required |
| Performance | `/performance` | Historical charts and comparison | Auth required |
| Settings | `/settings` | App configuration | Auth required |

### Performance Page Components

| Component | Purpose |
|-----------|---------|
| `TimeRangeSelectorComponent` | Time range chips (1W, 30D, 1M, 3M, 6M, 5Y) |
| `PerformanceChartComponent` | Chart.js line/area chart |
| `PerformanceSummaryCardsComponent` | KPI cards (Start, End, Δ₹, Δ%) |
| `CompareStocksSelectorComponent` | Multi-select dropdown for comparison |
| `PerformanceTableSnapshotComponent` | Comparison table with top movers |

### Dashboard Components

| Component | Purpose |
|-----------|---------|
| `HoldingsPieChartComponent` | Portfolio allocation doughnut chart |
| `PortfolioInsightsCardComponent` | AI-generated portfolio health insights |

### Shared Components

| Component | Purpose |
|-----------|---------|
| `SkeletonComponent` | Generic skeleton loader |
| `SkeletonCardComponent` | Card skeleton for KPI areas |
| `SkeletonStockRowComponent` | Table row skeleton |
| `SkeletonChartComponent` | Chart placeholder skeleton |
| `RadialProgressComponent` | Radial/circular progress indicator |
| `TourOverlayComponent` | First-time user tour overlay and spotlight |

---

## ⚙️ Services

### `AuthService`
Handles user authentication, registration, and session management.

```typescript
login(email: string, password: string): boolean
register(name: string, email: string, password: string): boolean
logout(): void
isAuthenticated: Signal<boolean>
user: Signal<User | null>
```

### `PortfolioService`
Manages folders and stocks.

```typescript
folders: Signal<Folder[]>
stocks: Signal<Stock[]>
growth20Stocks: Signal<Stock[]>
dividend10Stocks: Signal<Stock[]>
addStock(stock: Stock): void
updateStock(stock: Stock): void
removeStock(stockId: string): void
getStocksByFolder(folderId: FolderId): Stock[]
```

### `QuoteService`
Fetches and caches stock quotes (mock data).

```typescript
quotes: Signal<Record<string, Quote>>
refreshQuotes(): Promise<void>
getQuote(symbol: string): Quote | null
isRed(symbol: string): boolean
```

### `TransactionService`
Manages buy and dividend transactions.

```typescript
buyTransactions: Signal<BuyTransaction[]>
dividendTransactions: Signal<DividendTransaction[]>
addBuyTransaction(tx: BuyTransaction): void
addDividendTransaction(tx: DividendTransaction): void
getBuysByStock(stockId: string): BuyTransaction[]
getTotalDividends(stockId: string): number
```

### `HoldingsService`
Computes consolidated holdings from transactions.

```typescript
holdings: Signal<Holding[]>
holdingsMap: Signal<Record<string, Holding>>
summary: Signal<HoldingsSummary>
recomputeHoldings(): void
```

### `PerformanceService`
Manages historical price data with LocalStorage caching.

```typescript
getHistory(symbol: string, range: HistoryRange): Promise<HistoryResponse>
getMultipleHistory(symbols: string[], range: HistoryRange): Promise<Map<string, HistoryResponse>>
calculateSummary(points: HistoricalPoint[]): PerformanceSummary
calculateAggregatePerformance(historyMap: Map<string, HistoryResponse>): HistoricalPoint[]
clearCache(): void
```

### `AllocationAdvisorService` _(New)_
Generates AI-powered allocation strategies for the monthly planner.

```typescript
suggestAllocations(stocks: StockViewModel[], budget: number): AllocationSuggestion[]
// Strategies: Equal Weight | Risk-Adjusted | Defensive
```

### `PortfolioInsightsService` _(New)_
Analyzes holdings and generates insights about portfolio health.

```typescript
getInsights(folderId?: FolderId): PortfolioInsight[]
// Categories: concentration | sector | diversification | performance | opportunity
// Severity: info | warning | critical
```

### `StockAnalysisService` _(New)_
Provides detailed AI insights for individual stocks.

```typescript
// Analyzes: dropType, riskLevel, recommendation, supportingFactors
// Drop types: technical | sector-wide | news-based | correction | unknown
```

### `TourService` _(New)_
Manages the first-time user guided tour.

```typescript
isActive: Signal<boolean>
currentStep: Signal<TourStep | null>
progress: Signal<number>
isFirstStep: Signal<boolean>
isLastStep: Signal<boolean>
start(steps?: TourStep[]): void
next(): void
prev(): void
skip(): void
isCompleted(): boolean
```

### `ThemeService`
Manages dark/light theme.

```typescript
isDark: Signal<boolean>
isLight: Signal<boolean>
toggleTheme(): void
setTheme(theme: 'dark' | 'light'): void
```

### `LanguageService`
Manages internationalization via `@ngx-translate`.

```typescript
language: Signal<'en' | 'hi' | 'mr'>
setLanguage(lang: string): void
t(key: string): string
```

---

## 📊 Data Models

### Stock

```typescript
interface Stock {
  id: string;
  symbol: string;           // e.g., "RELIANCE"
  displayName: string;      // e.g., "Reliance Industries"
  exchange: 'NSE' | 'BSE';
  folderId: FolderId;       // 'GROWTH_20' | 'DIVIDEND_10'
  rank: number;
  isActive: boolean;
  sector?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Quote

```typescript
interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: number;
  timestamp: string;
}
```

### Transactions

```typescript
interface BuyTransaction {
  id: string;
  stockId: string;
  symbol: string;
  date: string;
  qty: number;
  price: number;
  charges: number;
  totalAmount: number;    // qty * price + charges
  createdAt: string;
}

interface DividendTransaction {
  id: string;
  stockId: string;
  symbol: string;
  date: string;
  amount: number;
  createdAt: string;
}
```

### Holding

```typescript
interface Holding {
  stockId: string;
  symbol: string;
  displayName: string;
  folderId: FolderId;
  totalQty: number;
  investedAmount: number;
  avgPrice: number;
  currentPrice?: number;
  currentValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
  totalDividends: number;
  firstBuyDate: string;
  lastBuyDate: string;
}
```

### Performance

```typescript
type HistoryRange = '1W' | '30D' | '1M' | '3M' | '6M' | '5Y';

interface HistoricalPoint {
  date: string;    // YYYY-MM-DD
  close: number;
}

interface HistoryResponse {
  symbol: string;
  range: HistoryRange;
  currency: string;
  points: HistoricalPoint[];
}

interface PerformanceSummary {
  startPrice: number;
  endPrice: number;
  absoluteChange: number;
  percentageChange: number;
  highPrice: number;
  lowPrice: number;
  avgPrice: number;
}
```

### Monthly Plan

```typescript
interface MonthlyPlan {
  id: string;
  month: string;          // "2026-03"
  budget: number;
  status: 'draft' | 'finalized';
  items: PlanItem[];
  createdAt: string;
  updatedAt: string;
}

interface PlanItem {
  stockId: string;
  symbol: string;
  plannedPrice: number;
  targetAmount: number;
  targetQty: number;
  isExecuted: boolean;
}
```

### Allocation Advisor

```typescript
interface AllocationSuggestion {
  strategy: AdvisorStrategy;   // 'equal-weight' | 'risk-adjusted' | 'defensive'
  label: string;
  description: string;
  allocations: {
    symbol: string;
    displayName: string;
    allocation: number;
    percentage: number;
    reason: string;
  }[];
}
```

### Portfolio Insight

```typescript
interface PortfolioInsight {
  category: 'concentration' | 'sector' | 'diversification' | 'performance' | 'opportunity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommendation: string;
  metric?: number;
  metricLabel?: string;
}
```

---

## 🔌 API Contracts

> **Note:** The application currently uses **mock data** generated client-side. The contracts below define the expected format for real backend integration.

### Quote API

```
GET /api/quotes?symbols=RELIANCE,TCS,INFY

Response:
{
  "quotes": {
    "RELIANCE": {
      "symbol": "RELIANCE",
      "price": 2450.50,
      "change": -35.25,
      "changePercent": -1.42,
      "open": 2480.00,
      "high": 2495.00,
      "low": 2440.00,
      "prevClose": 2485.75,
      "volume": 5234567,
      "timestamp": "2026-03-21T15:30:00+05:30"
    }
  }
}
```

### History API

```
GET /api/history?symbol=RELIANCE&range=30D

Response:
{
  "symbol": "RELIANCE",
  "range": "30D",
  "currency": "INR",
  "points": [
    { "date": "2026-02-20", "close": 2380.50 },
    ...
    { "date": "2026-03-21", "close": 2450.50 }
  ]
}
```

---

## 🌐 Internationalization (i18n)

### Supported Languages

| Code | Language | Native Name |
|------|----------|-------------|
| `en` | English | English |
| `hi` | Hindi | हिंदी |
| `mr` | Marathi | मराठी |

### Translation Structure

```json
{
  "en": {
    "nav": { "dashboard": "Dashboard", ... },
    "dashboard": { ... },
    "folders": { ... },
    "planner": { ... },
    "transactions": { ... },
    "analytics": { ... },
    "performance": { ... },
    "settings": { ... },
    "auth": { ... },
    "tour": { ... },
    "common": { ... }
  },
  "hi": { ... },
  "mr": { ... }
}
```

### Usage in Components

```typescript
readonly lang = inject(LanguageService);

// In template
{{ lang.t('dashboard.title') }}

// Change language
lang.setLanguage('hi');
```

---

## 🎨 Theming

The application uses **Tailwind CSS** with class-based dark mode:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
}
```

### Color Palette

| Purpose | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `bg-slate-950` | `bg-gray-50` |
| Card | `bg-slate-800` | `bg-white` |
| Text Primary | `text-slate-100` | `text-gray-900` |
| Text Secondary | `text-slate-400` | `text-gray-500` |
| Accent | `emerald-500` | `emerald-500` |
| Red (Down) | `text-red-400` | `text-red-500` |
| Green (Up) | `text-emerald-400` | `text-emerald-500` |
| Border | `border-slate-700` | `border-gray-200` |

---

## 💾 Storage

### LocalStorage Keys

| Key | Purpose | Type |
|-----|---------|------|
| `dh_folders` | Folder definitions | `Folder[]` |
| `dh_stocks` | Stock list | `Stock[]` |
| `dh_plans` | Monthly plans | `MonthlyPlan[]` |
| `dh_transactions` | All transactions | `{ buys, dividends }` |
| `dh_settings` | App settings | `Settings` |
| `dh_user` | Current user session | `User` |
| `dh_quote_cache` | Cached stock quotes | `QuoteCache` |
| `dh_registered_users` | Registered users list | `RegisteredUser[]` |
| `dh_history_*` | Performance history cache | `CachedHistory` |
| `dip_hunter_tour_completed` | Tour completion flag | `boolean` |
| `dip_hunter_tour_step` | Saved tour step index | `number` |

### Backup/Restore

```typescript
// Export all data as JSON
settingsService.exportBackup(): string

// Import from JSON backup
settingsService.importBackup(json: string): boolean
```

---

## 🔐 Authentication

### Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Register  │────▶│    Login    │────▶│  Dashboard  │
│    Page     │     │    Page     │     │ (Protected) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ LocalStorage│
                    │  (Session)  │
                    └─────────────┘
```

### Route Guards

```typescript
canActivate: [authGuard]   // Redirects to /auth/login if not authenticated
canActivate: [guestGuard]  // Redirects to / if already authenticated
```

---

## 📱 PWA Support

Dip Hunter is a **Progressive Web App** powered by Angular Service Worker.

- **Installable** on Android, iOS, and desktop browsers
- **Offline-capable** — app shell cached on install
- **Asset caching** — lazy-loaded assets cached on first use

### Service Worker Strategy

```json
{
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": { "files": ["/*.css", "/*.js", "/index.html"] }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch"
    }
  ]
}
```

The Service Worker is enabled only in production builds and registered with `registerWhenStable:30000`.

---

## 🗺 Roadmap

### Version 1.0.0 (Current) ✅
- [x] Dashboard with stock overview
- [x] Folder management (G20, D10)
- [x] Monthly planner with AI Allocation Advisor
- [x] Buy & Dividend transactions
- [x] Holdings view with P/L
- [x] Analytics with charts and Portfolio Insights
- [x] Performance page with time ranges and comparison
- [x] Dark/Light themes
- [x] i18n (EN, HI, MR)
- [x] Authentication (local)
- [x] Data backup/restore
- [x] First-time user guided tour
- [x] Progressive Web App (PWA)
- [x] Skeleton loaders
- [x] AI-powered Stock Analysis service

### Version 1.1.0 (Planned)
- [ ] Real API integration
- [ ] Real-time quotes (WebSocket)
- [ ] Push notifications for dips
- [ ] Watchlist feature
- [ ] Price alerts

### Version 1.2.0 (Future)
- [ ] Backend with database
- [ ] User authentication (JWT)
- [ ] Cloud sync
- [ ] Mobile app (Ionic/Capacitor)
- [ ] Export to Excel/PDF

### Version 2.0.0 (Vision)
- [ ] AI-powered dip predictions
- [ ] Portfolio optimization suggestions
- [ ] Social features (share strategies)
- [ ] Broker integration
- [ ] Tax calculation helper

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the Angular Style Guide
- Use TypeScript strict mode
- Write meaningful commit messages
- Add tests for new features
- Update documentation for API/model changes

---

## 👤 Author

**Roshan Mali**

- GitHub: [@roshan-mali](https://github.com/roshan-mali)
- LinkedIn: [Roshan Mali](https://linkedin.com/in/roshan-mali)

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Roshan Mali

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

<div align="center">
Made with ❤️ by <strong>Roshan Mali</strong>
</div>
