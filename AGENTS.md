# AGENTS.md — Dip Hunter

Shared guidance for AI coding agents working in this repository.

## Product

**Dip Hunter** is an Angular 21 PWA for Indian NSE/BSE investors following a buy-the-dip strategy (Growth 20 + Dividend 10 portfolios, monthly planner, transactions, analytics, Finance Buddy chat).

## Stack

- Angular 21 standalone components + signals
- Tailwind CSS, Chart.js / ng2-charts, `@ngx-translate`
- Vitest via `ng test` (use `vi` from `vitest`, not Jasmine/Karma)
- Netlify functions under `netlify/functions/`
- Optional Supabase auth + `user_snapshots`

## Multi-agent kit (AMK)

This repo ships the **Angular Multi-Agent Kit**. Prefer specialized agents over one generic chat for feature work:

| Stage | Agent |
|-------|-------|
| Orchestrate E2E | `angular-orchestrator` |
| Plan | `angular-planner` |
| Implement | `angular-implementer` |
| Style | `angular-ui-styling` |
| Generate tests | `angular-unit-test-generator` |
| Fix tests | `angular-test-fixer` |
| Review | `angular-reviewer` |
| NSE/BSE / Finance Buddy | `nse-bse-finance-buddy` |

Canonical prompts: `angular-multi-agent-kit/agents/`.  
Kit docs + SVG diagrams: `angular-multi-agent-kit/README.md`.

After editing canonical agents, run `npm run amk:sync`.

## Engineering rules

- Keep diffs minimal; match existing naming and folder layout
- Do not add packages unless explicitly requested
- Preserve i18n keys when changing user-visible copy
- India cash equities only — no US market hour/ticker assumptions
- Keep `src/assets/knowledge/nse-bse.json` and `netlify/functions/nse-bse-knowledge.json` identical when updating market facts
- Prefer existing services under `src/app/core/services/`

## Commands

```bash
npm start          # ng serve
npm run build      # production build
npm test           # Vitest via Angular
npm run amk:sync   # sync AMK agents to Claude Code + Copilot paths
```
