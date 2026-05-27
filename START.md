# GTM360 HQ — Day 1 Setup

## Run locally

```
cd D:\GTM-OS\gtm360-hq
npm install
npm run dev
```

Open: http://localhost:3000

## What's live
- Full design system (GTM Orange, DM Sans, Bebas Neue, DM Mono)
- Sidebar: Command Center + 5 agents + workspace + system
- Header: search trigger (Cmd+K), notification bell (pulls from escalations), refresh
- Command Palette: Cmd+K, searches pipeline_snapshot live
- 6 views wired to real Supabase data:
  - Command Center — brief, metrics, pipeline, OKRs, Sam's flag
  - Sam — structured brief + chat (API stub)
  - Rex — pipeline table with filters + company detail panel
  - Andy — content queue with status tabs + draft editor
  - Finn — financial metrics + invoice table
  - Ola — OKR tracker with progress bars + system health

## Day 2 next
- Command Center full build (all panels fleshed out)
- Loading skeletons
- Error states
