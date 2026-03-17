# AI Issue Tool

Electron + Vite + React desktop app for AI-powered GitHub Issue creation.

## Tech Stack

- **Desktop**: Electron 39 (electron-vite)
- **Frontend**: React 19 + TypeScript + TanStack Router + TanStack Query
- **UI**: shadcn/ui + Tailwind CSS v4
- **DB**: SQLite (better-sqlite3 + Drizzle ORM) in main process
- **Test**: Vitest (unit) + Playwright (E2E on Electron)
- **Lint**: ESLint + Prettier

## Architecture

```
src/main/        — Electron main process (Node.js)
  db/            — Drizzle schema, migrations, queries
  ipc/           — IPC handlers (type-safe bridge)
  services/      — Business logic (AI mock, GitHub mock)
  index.ts       — Electron app entry

src/preload/     — Preload scripts (contextBridge)

src/renderer/    — React app (browser context)
  src/pages/     — Route pages
  src/components/— UI components (shadcn/ui)
  src/hooks/     — Custom hooks
  src/lib/       — Utilities
  src/mocks/     — Mock data for development
```

## Conventions

- All DB operations happen in main process, exposed via IPC
- Renderer never imports Node.js modules directly
- IPC channels are typed via shared types in `src/shared/`
- Tests: `tests/main/` for main process, `tests/renderer/` for components, `e2e/` for Playwright
- Use `getByRole` / `getByLabel` for test selectors (Playwright best practice)
- Mock all external APIs (Claude, GitHub) — no real API calls in tests

## Commands

```bash
pnpm dev          # Start dev mode
pnpm build        # Build for production
pnpm test         # Run Vitest
pnpm test:e2e     # Run Playwright E2E
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
```
