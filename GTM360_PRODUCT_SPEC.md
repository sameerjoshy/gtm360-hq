# GTM360 HQ — Product Specification
Version: 1.0 | Demo Target: 1 Week
Status: Design Complete → Build Ready

---

# PRODUCT VISION
A commercial revenue operating system where AI agents run the full GTM motion autonomously — awareness to close — with human oversight at key decision points only. Demo asset showing enterprise-grade AI system design, multi-agent orchestration, and operator-level UX.

---

# DESIGN SYSTEM

## Brand Colors
Primary: #FF4D00 (GTM Orange)
Secondary: #FF8C00 (Amber)
Background: #0A0A0F (Near black)
Surface 1: #111118
Surface 2: #1A1A24
Border: #22222E
Text Primary: #F0F0F8
Text Secondary: #8888AA
Text Muted: #55556A
Success: #00E676 (Green)
Warning: #FFD600 (Yellow)
Danger: #FF1744 (Red)
Info: #2979FF (Blue)

## Typography
Display: Bebas Neue (headers, numbers, labels)
Body: DM Sans (all readable text)
Mono: DM Mono (data, code, timestamps)

## Design Principles
- Dark mode only
- Data density over whitespace
- Every number tells a story
- Operators scan, not read
- Actions always visible, never buried
- Status always visible — never hunt for it

---

# ARCHITECTURE

## Layout
```
┌─────────────────────────────────────────────────────┐
│ HEADER: Logo | Search | Notifications | Profile      │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ SIDEBAR  │  MAIN CONTENT AREA                       │
│ 200px    │  Fluid                                   │
│ fixed    │                                          │
│          │                                          │
│ Nav      │  View changes based on sidebar selection │
│ items    │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

## Sidebar Navigation
```
GTM360 HQ logo
─────────────
🏠 Command Center    (home/cockpit)
─────────────
AGENTS
🎙 Sam — CoS         (staff meeting + chat)
💼 Rex — CRO         (pipeline + research)
📣 Andy — CMO        (content queue)
💰 Finn — CFO        (finance + pricing)
⚙️ Ola — COO         (OKRs + system health)
─────────────
WORKSPACE
📊 Pipeline          (full deal board)
📝 Content           (content calendar)
💹 Finance           (P&L + invoices)
🎯 OKRs              (quarter tracker)
─────────────
SYSTEM
⚡ Automations       (Make + scheduler status)
🔴 Errors            (error log)
⚙️ Settings          (connections + config)
─────────────
[Sameer Joshi avatar]
[gtm-360.com]
```

---

# VIEWS — DETAILED SPEC

## VIEW 1: Command Center (Home)
This is what opens every morning. Sam's brief + system overview.

### Layout
```
┌─ HEADER ──────────────────────────────────────────┐
│ GTM360 HQ    [🔍 Search]    [🔔 2]    [SJ]        │
├─ ONE THING ───────────────────────────────────────┤
│ ONE THING  [Sam's brief text — full width]        │
│            ──────────────────────────────         │
│ PRIORITY   1. Action one                          │
│ ACTIONS    2. Action two                          │
│            3. Action three                        │
├─ METRICS ROW ─────────────────────────────────────┤
│ $59K Pipeline  │ 0 Stale  │ 3 Drafts │ $0 Revenue │
├─ THREE COLUMNS ───────────────────────────────────┤
│ PIPELINE        │ TODAY          │ SYSTEM         │
│ (Rex)           │ (Sam)          │ (Ola)          │
│ Deal table      │ Meetings       │ Agent status   │
│ with signals    │ Emails         │ OKR bars       │
│                 │ Actions        │ Automation log │
├─ TWO COLUMNS ─────────────────────────────────────┤
│ CONTENT QUEUE (Andy)    │ FINANCE (Finn)          │
│ Drafts awaiting         │ MTD Revenue             │
│ approval                │ Outstanding invoices    │
├─ SAM'S FLAG ──────────────────────────────────────┤
│ 🚩 [Sam's unfiltered read]                        │
└───────────────────────────────────────────────────┘
```

### Interactions
- Click any deal → opens Rex pipeline detail view
- Click "Start Staff Meeting" → opens Sam chat
- Click any metric card → navigates to relevant view
- Refresh button → pulls fresh Supabase data
- Notification bell → opens escalations panel

---

## VIEW 2: Sam — Chief of Staff
Split view: structured brief on left, chat interface on right.

### Layout
```
┌─ SAM VIEW ────────────────────────────────────────┐
│ 🎙 Sam — Chief of Staff          [New Meeting]    │
├─────────────────────┬─────────────────────────────┤
│ STRUCTURED BRIEF    │ STAFF MEETING CHAT           │
│                     │                             │
│ Date: Mon 25 May    │ [Sam avatar]                │
│                     │ Good morning, Sameer.        │
│ ONE THING           │ Here's your brief...         │
│ [text]              │                             │
│                     │ [Message history]           │
│ PIPELINE PULSE      │                             │
│ $59K | 10 deals     │                             │
│ 0 stale             │                             │
│                     │                             │
│ OKR HEALTH          │                             │
│ O1 ████░░░ 0%       │                             │
│ O2 ████░░░ 0%       │                             │
│ O3 ████████ 40%     │                             │
│                     │                             │
│ ESCALATIONS         │                             │
│ None open           │                             │
│                     │ ┌─────────────────────────┐ │
│ SAM'S FLAG          │ │ Type a command or ask..  │ │
│ [flag text]         │ │ /today /sync /capture   │ │
│                     │ └─────────────────────────┘ │
└─────────────────────┴─────────────────────────────┘
```

### Chat Features
- Sends to Claude API (Sam's system prompt)
- Command suggestions shown as pills: /today /campaign /capture
- Responses stream in real time
- Each response saved to Supabase session_log
- "Start Meeting" button auto-sends /today

---

## VIEW 3: Rex — CRO
Three panels: pipeline table, company detail, research/prep output.

### Layout
```
┌─ REX VIEW ────────────────────────────────────────┐
│ 💼 Rex — CRO    [/research] [/prep] [/campaign]   │
├──────────────────────────────────────────────────┤
│ PIPELINE FILTERS: [All Stages ▼] [All ICP ▼]     │
│                   [Search company...]             │
├─────────────────────────────────────────────────┤
│ PIPELINE TABLE                                   │
│ Company      Stage    Service  Amount  ICP  Signal│
│ ─────────────────────────────────────────────── │
│ revVana →    Radar    FCRO     $20K    ✅   🟡   │
│ Aligned →    Radar    DIAG     $8K     ✅   🟡   │
│ MeetRecord → Radar    DIAG     $6K     ~    🟡   │
│ Hook →       Radar    DIAG     $6K     ✅   🟡   │
│ Make →       Radar    ROPS     $5K     ⚠️   🟡   │
│ [+ 5 more]                                       │
├──────────────────────────────────────────────────┤
│ [Click any row to open detail panel below]       │
├─────────────────────┬────────────────────────────┤
│ COMPANY DETAIL      │ RESEARCH / PREP OUTPUT      │
│                     │                            │
│ revVana             │ [Runs /research or /prep]  │
│ ─────────────────   │                            │
│ Stage: Radar        │ Click [Research] or [Prep] │
│ Amount: $20,000     │ above to generate brief    │
│ Service: FCRO       │                            │
│ Close: Aug 31       │ Output streams here        │
│ ICP: 7.4/10         │ in real time               │
│                     │                            │
│ Contact:            │ [Copy] [Save to Notion]    │
│ Greg Lewis          │ [Move to next stage]       │
│ President/Founder   │                            │
│                     │                            │
│ [Move Stage ▼]      │                            │
│ [Log Activity]      │                            │
│ [Run Research]      │                            │
│ [Run Prep]          │                            │
└─────────────────────┴────────────────────────────┘
```

### Interactions
- Click row → opens detail panel
- Click "Run Research" → calls Claude API with Rex prompt → streams output
- Click "Move Stage" → updates HubSpot via API + Supabase
- Click "Log Activity" → logs to HubSpot + updates last_activity_date
- Filter by stage/ICP → filters table instantly
- Search → filters by company name

---

## VIEW 4: Andy — CMO
Content calendar on left, draft editor on right.

### Layout
```
┌─ ANDY VIEW ───────────────────────────────────────┐
│ 📣 Andy — CMO    [/post] [/email] [/capture]      │
├──────────────────────────────────────────────────┤
│ CONTENT QUEUE                    [New Observation]│
├──────────────────────────────────────────────────┤
│ Status tabs: [All] [Raw] [Drafting] [Review] [Approved] [Published] │
├─────────────────────────────────────────────────┤
│ CONTENT TABLE                                    │
│ Title              Format  Channel  Status  QC   │
│ ──────────────────────────────────────────────  │
│ Founder sales...→  F1      LinkedIn  Review  8/10│
│ [Observation 001]  —       —         Raw     —   │
├─────────────────────────────────────────────────┤
│ [Click row to open editor below]                │
├─────────────────────┬────────────────────────────┤
│ OBSERVATION / DRAFT │ ANDY CHAT                  │
│                     │                            │
│ Raw observation:    │ [Andy avatar]              │
│ "B2B founders at    │ Ready to draft. Run /post  │
│ $2-5M ARR..."       │ to start.                  │
│                     │                            │
│ ─────────────────   │ [Chat input]               │
│ DRAFT:              │ /post /email /repurpose    │
│                     │                            │
│ You're at $3M ARR   │                            │
│ Pipeline is full... │                            │
│                     │                            │
│ QC Score: 8/10      │                            │
│ ✅ Reader first     │                            │
│ ✅ Utility          │                            │
│ ⚠️ Needs example   │                            │
│                     │                            │
│ [✅ Approve]        │                            │
│ [✏️ Edit]           │                            │
│ [🔄 Redraft]        │                            │
│ [📅 Schedule]       │                            │
└─────────────────────┴────────────────────────────┘
```

### Interactions
- "New Observation" → opens capture modal → sends to Andy
- Click row → opens draft editor
- Approve → moves to approved, ready to schedule
- Schedule → opens Typefully link or date picker
- Redraft → sends back to Andy with edit notes
- QC score shown visually per draft

---

## VIEW 5: Finn — CFO
Dashboard + command interface.

### Layout
```
┌─ FINN VIEW ───────────────────────────────────────┐
│ 💰 Finn — CFO    [/invoice] [/price] [/forecast]  │
├──────────────────────────────────────────────────┤
│ FINANCIAL METRICS ROW                            │
│ $0 MTD  │ $59K Pipeline │ $0 Outstanding │ 0 Active│
├─────────────────────┬────────────────────────────┤
│ INVOICES            │ FINN CHAT                  │
│                     │                            │
│ [empty state]       │ [Finn avatar]              │
│ No invoices yet     │ Ready. Run /invoice,       │
│                     │ /price, or /forecast.      │
│ ─────────────────   │                            │
│ ENGAGEMENTS         │ [Chat input]               │
│                     │ /invoice /price /forecast  │
│ [empty state]       │ /pl /commercial            │
│ No active clients   │                            │
│                     │                            │
│ ─────────────────   │                            │
│ P&L SUMMARY         │                            │
│ MTD Revenue: $0     │                            │
│ Expenses: $0        │                            │
│ Margin: —           │                            │
│                     │                            │
│ PRICING REFERENCE   │                            │
│ DIAG: $3K-$8K       │                            │
│ FCRO: $5K-$20K/mo   │                            │
│ ROPS: $4K-$15K      │                            │
└─────────────────────┴────────────────────────────┘
```

---

## VIEW 6: Ola — COO
OKR tracker + system health.

### Layout
```
┌─ OLA VIEW ────────────────────────────────────────┐
│ ⚙️ Ola — COO    [/okr] [/health] [/tools]         │
├──────────────────────────────────────────────────┤
│ OKR DASHBOARD — Q2 2026                          │
├──────────────────────────────────────────────────┤
│ O1: Get First 3 Clients              🔴 OFF TRACK │
│ KR1: Discovery calls    ░░░░░░░░░░  0/10         │
│ KR2: Proposals sent     ░░░░░░░░░░  0/3          │
│ KR3: Signed engagement  ░░░░░░░░░░  0/1          │
│                                                  │
│ O2: Awareness & Thought Leadership   🔴 OFF TRACK │
│ KR1: LinkedIn posts     ░░░░░░░░░░  0/20         │
│ KR2: LinkedIn followers ░░░░░░░░░░  0/500        │
│ KR3: Newsletter subs    ░░░░░░░░░░  0/100        │
│                                                  │
│ O3: GTM360 HQ System                🟡 AT RISK   │
│ KR1: Agents operational ████░░░░░░  2/5          │
│ KR2: Daily brief        ██████████  Live ✅      │
│ KR3: Zero manual entry  █████░░░░░  Partial      │
├─────────────────────┬────────────────────────────┤
│ SYSTEM HEALTH       │ OLA CHAT                   │
│                     │                            │
│ AGENTS              │ [Ola avatar]               │
│ Sam    ✅ Live      │ System health nominal.     │
│ Rex    ✅ Live      │ 2/5 agents operational.    │
│ Andy   ✅ Live      │                            │
│ Finn   ✅ Live      │ [Chat input]               │
│ Ola    ✅ Live      │ /okr /health /tools        │
│                     │ /automate /weekly          │
│ AUTOMATIONS         │                            │
│ Pipeline Sync  ✅   │                            │
│ Stale Check    ✅   │                            │
│ Sam Brief      ✅   │                            │
│ OKR Pulse      ✅   │                            │
│ Invoice Mon    ✅   │                            │
│                     │                            │
│ ERRORS: 0 open      │                            │
│ LAST SYNC: 6:30am   │                            │
└─────────────────────┴────────────────────────────┘
```

---

## GLOBAL COMPONENTS

### Header
```
[GTM360 HQ logo]  [Cmd+K search bar]  [🔔 badge]  [SJ avatar]
```
- Cmd+K opens command palette (search companies, run commands)
- Notification bell shows escalations count
- Avatar shows profile + logout

### Command Palette (Cmd+K)
```
> Type a command or search...
─────────────────────────────
QUICK ACTIONS
/research [company]    Run Rex research
/post [observation]    Draft with Andy
/today                 Run Sam brief
/campaign              Pipeline dashboard
─────────────────────────────
COMPANIES
revVana                $20K FCRO Radar
Aligned                $8K DIAG Radar
[...]
─────────────────────────────
RECENT
revVana research brief  2 hours ago
Sam morning brief       6:30 AM
```

### Notification Panel (slide-in)
- Open escalations
- Stale deals
- Content awaiting approval
- Invoice alerts
- System errors

### Agent Status Bar (bottom of sidebar)
```
🟢 Sam  🟢 Rex  🟢 Andy  🟢 Finn  🟢 Ola
Last brief: 6:30 AM
```

---

# DEMO DATA SETUP

## Pipeline (10 companies, realistic)
All current Live deals — already in HubSpot and Supabase.
Add realistic last_activity_dates and ICP scores.
Make 2 deals show as "Watch" signal (yellow).
Make non-ICP deals (Make, Tracxn) clearly flagged.

## Content Queue
Pre-populate with:
- 1 approved post (founder sales problem post Andy drafted)
- 1 draft awaiting review
- 2 raw observations

## Finance
Pre-populate with:
- 1 draft invoice (revVana DIAG $5,000 — not sent)
- Pricing reference table populated

## OKRs
Real data — all at 0 except O3 KR1 (2/5) and KR2 (live).
Honest. Looks like day 1 of a real business.

## Sam's Brief
Real data from this morning's run — already live.

---

# BUILD PLAN — 1 WEEK

## Day 1: Foundation + Navigation
- React app setup (Vite + Tailwind)
- Sidebar navigation component
- Header with Cmd+K shell
- Routing between views
- Supabase client integration
- Design system tokens

## Day 2: Command Center (Home)
- ONE THING + Priority Actions banner
- 4 metric cards
- Pipeline table (simplified)
- System status panel
- Sam's Flag section
- Refresh + Start Meeting buttons

## Day 3: Rex — CRO View
- Full pipeline table with filters
- Company detail panel
- Research output streaming
- Move stage interaction
- Log activity interaction

## Day 4: Andy — CMO View
- Content queue table
- Status tabs
- Draft editor panel
- Approve/reject/redraft flow
- Andy chat interface

## Day 5: Sam — CoS View + Finn View
- Split brief + chat layout
- Claude API streaming chat
- Command pills
- Finn financial dashboard
- Finn chat interface

## Day 6: Ola View + Global Components
- OKR tracker with progress bars
- System health panel
- Ola chat
- Command palette (Cmd+K)
- Notification panel
- Agent status bar

## Day 7: Polish + Demo Prep
- Mobile responsive
- Loading states + skeleton screens
- Error states
- Custom domain hq.gtm-360.com
- Demo script written
- End-to-end test run

---

# TECH STACK

| Layer | Tech | Why |
|-------|------|-----|
| Framework | React + Vite | Fast, Claude Code native |
| Styling | Tailwind CSS | Utility-first, consistent |
| Routing | React Router | Multi-view SPA |
| State | Zustand | Lightweight, simple |
| Database | Supabase REST API | Already connected |
| AI | Anthropic API (streaming) | Agents chat in real time |
| Charts | Recharts | OKR bars, pipeline viz |
| Icons | Lucide React | Clean, consistent |
| Hosting | Cloudflare Pages | Already set up |
| Domain | hq.gtm-360.com | Professional |

---

# DEMO SCRIPT (10 minutes)

## Act 1 — The System (2 mins)
"This is GTM360 HQ. A commercial revenue OS I built in [X days].
Five AI agents running autonomously. One interface.
Everything you see is live data."
→ Show Command Center. Point to Sam's brief. Show pipeline total.

## Act 2 — The Intelligence (3 mins)
"Watch what happens when I research your company."
→ Navigate to Rex. Type their company name. Run /research.
→ Research brief streams live. ICP score appears. Pain hypothesis loads.
"Rex just did 20 minutes of prep work in 30 seconds."

## Act 3 — The Content Engine (2 mins)
"Andy owns all content. Watch this."
→ Navigate to Andy. Show the draft post. Show QC score.
→ Run /post with a quick observation.
"Content that sounds like a senior operator, not a chatbot."

## Act 4 — The Orchestration (2 mins)
"Every morning at 6:30 AM, before I open my laptop:"
→ Show Sam's brief. Show priority actions. Show Sam's flag.
"Sam tells me the one thing that matters. No dashboards to check.
No data to compile. Just a decision."

## Act 5 — The Close (1 min)
"This is what I build for GTM-360 clients.
Not a deck. Not a recommendation.
A system that runs."
→ Show Ola's OKR view. Show system health. All green.
