# GitHub Copilot — Dip Hunter

Follow `AGENTS.md` for shared project rules.

## Custom agents

Custom agents are defined in `.github/agents/*.agent.md` (synced from `angular-multi-agent-kit/agents/`).

Prefer:

- `@angular-orchestrator` for full feature delivery
- `@angular-planner` before large edits
- `@angular-implementer` / `@angular-ui-styling` for code vs style lanes
- `@angular-unit-test-generator` / `@angular-test-fixer` for Vitest work
- `@angular-reviewer` before merge-quality review
- `@nse-bse-finance-buddy` for NSE/BSE / Finance Buddy knowledge

## Stack

Angular 21 standalone + signals, Tailwind, Vitest via `ng test`. India NSE/BSE cash equities only.

## Kit docs

`angular-multi-agent-kit/README.md` — pipeline SVGs, agent table, sync instructions.
