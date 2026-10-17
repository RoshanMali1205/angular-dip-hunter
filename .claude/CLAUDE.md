# Claude Code — Dip Hunter

You are working in **angular-dip-hunter**. Read `AGENTS.md` for shared rules.

## Subagents

Project subagents live in `.claude/agents/` (synced from `angular-multi-agent-kit/agents/` via `npm run amk:sync`).

For end-to-end feature delivery, prefer the **angular-orchestrator** workflow:

plan → implement → style (if needed) → generate tests → fix tests → review

Use **nse-bse-finance-buddy** for Indian market structure, settlement, circuits, indices, or Finance Buddy knowledge-pack work.

## Stack reminders

- Angular 21 standalone + signals; Tailwind; Vitest (`vi`), not Jasmine/Karma
- Minimal diffs; no new packages unless asked
- NSE/BSE cash equities domain — never assume US market conventions

## Kit

See `angular-multi-agent-kit/README.md` for pipeline diagrams and compatibility notes.
