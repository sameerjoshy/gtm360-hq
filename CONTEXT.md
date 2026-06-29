# GTM360 HQ — Claude Code Context File
Read this before writing any code. This is the complete context
of what has been built, decided, and designed.

---

# WHAT THIS IS
GTM360 HQ is an enterprise-grade AI revenue operating system.
It is both Sameer's personal GTM operating system AND a demo
asset showcasing AI system design capabilities to potential clients.

One-person company (GTM-360) operating like a full team through
5 specialized AI agents running autonomously.

---

# WHAT'S ALREADY BUILT (DO NOT REBUILD)

## Backend Infrastructure
- Supabase project: dtqsnojfatzjsklsjzwj
- 12 tables: pipeline_snapshot, daily_brief, okr_tracker,
  content_queue, finance_tracker, escalations, error_log,
  automation_log, research_briefs, meeting_prep, qc_log,
  agent_memory
- All tables have real data

## Existing Cockpit (to be replaced by this app)
- Live at: gtm360-hq.sameerjoshy.workers.dev
- Single HTML file, basic dark theme
- Shows pipeline, OKRs, Sam's brief, Sam's flag
- This React app replaces it entirely

## Python Automation (runs on Windows Task Scheduler)
- C:\GTM360\gtm360_agents.py
- Runs daily: cleanup (5:59am), Rex (6:15am), Sam (6:30am)
- Runs weekly: Ola (Mon 6:30am), Finn (Mon 6:45am)
- Writes outputs to Supabase tables
- Sam's brief already running and writing to daily_brief table

## Make.com Automations
- GTM360 Morning Pipeline Sync (6am daily)
  HubSpot → Supabase pipeline_snapshot
- GTM360 Stale Deal Monitor (6:15am daily)
  Updates signal field on stale deals

## Claude Projects (5 agents operational)
- GTM360 HQ — Sam (Chief of Staff)
- GTM360 HQ — Rex (CRO)
- GTM360 HQ — Andy (CMO)
- GTM360 HQ — Finn (CFO)
- GTM360 HQ — Ola (COO)

---

# THE 5 AGENTS

## Sam — Chief of Staff
- Runs /today every morning automatically
- Generates: one_thing, sams_flag, priority_actions
- Writes to: daily_brief table
- Orchestrates all other agents
- Tone: warm, direct, pushes back, never sycophantic
- Sample output from today:
  ONE THING: "Execute discovery calls with the 5 appointment-scheduled
  prospects (revVana, Aligned, MeetRecord, Hook, Make) to move $59K
  pipeline toward proposals and hit O1 KR1 target"
  SAM'S FLAG: "We have $59K in pipeline but zero progress on any OKR—
  no calls completed, no proposals sent, no engagements signed."

## Rex — CRO
- Skills: /campaign, /research [company], /prep [company], /icp [company]
- Reads from: pipeline_snapshot, HubSpot, web search
- Writes to: research_briefs, meeting_prep tables + Notion
- Sample research output quality:
  For revVana: Found $2.8M ARR, 17 employees, Greg Lewis as founder/president,
  ICP score 7.4/10, specific conversation opener based on their growth trajectory
- This is the KILLER DEMO MOMENT: run /research on prospect's company live

## Andy — CMO
- Skills: /post, /email, /sequence, /newsletter, /capture, /repurpose
- Three post formats: Tactical Scene (Bennett), Market POV (Gerhardt),
  Lesson from Experience (Campbell/Welsh)
- Four tests before any draft: reader-first, utility, real observation, voice
- Never publishes without Sameer approval
- Sample post drafted today: founder sales problem post, Format 1 (Tactical Scene)
  QC score: 8/10, flagged one weakness honestly

## Finn — CFO
- Skills: /invoice, /price, /forecast, /pl, /commercial
- Pricing: DIAG $3K-$8K, FCRO $5K-$20K/mo, ROPS $4K-$15K
- Never discounts >15% without Sameer approval
- Current state: $0 revenue, $59K pipeline

## Ola — COO
- Skills: /okr, /health, /tools, /automate, /weekly
- Tracks Q2 2026 OKRs: 3 objectives, 9 KRs
- Current: O1 0%, O2 0%, O3 40%
- Monitors all automations and agent health

---

# CURRENT PIPELINE (real data in Supabase)
$59,000 across 10 Live deals — all Radar stage, no contact yet

| Company | Service | Amount | ICP |
|---------|---------|--------|-----|
| revVana | FCRO | $20,000 | Strong (7.4/10) |
| Aligned | DIAG | $8,000 | Strong |
| MeetRecord | DIAG | $6,000 | Moderate |
| Hook | DIAG | $6,000 | Strong |
| Make | ROPS | $5,000 | ⚠️ Non-ICP |
| Bounti.ai | DIAG | $4,000 | Strong |
| Momentum | DIAG | $3,000 | Strong |
| Tracxn | ROPS | $3,000 | ⚠️ Non-ICP |
| Founderpath | DIAG | $2,000 | Moderate |
| Common Room | DIAG | $2,000 | Strong |

---

# Q2 2026 OKRs (real data in Supabase)

O1: Get first 3 paying clients
  KR1: 10 discovery calls [0/10]
  KR2: 3 proposals sent [0/3]
  KR3: 1 signed engagement [0/1]

O2: Build awareness and thought leadership
  KR1: 20 LinkedIn posts [0/20]
  KR2: 500 LinkedIn followers [0/500]
  KR3: 100 newsletter subscribers [0/100]

O3: Build GTM360 HQ system
  KR1: 5 agents operational [2/5 per tracker, actually 5/5]
  KR2: Daily brief running [Live ✅]
  KR3: Zero manual entry [Partial]

---

# ICP DEFINITION
Primary: Early-stage B2B founders (Seed-B, 10-150 employees, $1M-$15M ARR)
Secondary: Scale-up CROs (100-500 employees, $15M-$100M ARR)
Geography: India, US, GCC
Vertical: B2B SaaS and B2B Services only. No B2C.
Entry service: GTM Diagnostic (proof of value first)

---

# BRAND & VOICE
Three words: Professional. Irreverent. Operator-driven.
- Speak like a senior operator who has seen it all
- No manufactured insight — everything grounded in real observation
- Short sentences carry the load
- First person always

---

# SUPABASE SCHEMA (key tables for the app)

pipeline_snapshot:
  deal_id, deal_name, company_name, company_domain,
  contact_name, contact_email, stage, amount, close_date,
  days_in_stage, last_activity_date, icp_score, icp_fit,
  service_line, signal, gtm360_record_type, snapshot_date

daily_brief:
  brief_date, one_thing, sams_flag, priority_actions (jsonb),
  meetings (jsonb), pipeline_pulse (jsonb), okr_status (jsonb),
  open_escalations (jsonb), status

okr_tracker:
  quarter, objective_number, objective_text,
  kr_number, kr_text, kr_target, kr_current, status

content_queue:
  raw_observation, post_format, voice_blend, draft,
  qc_score, qc_notes, status, channel,
  approved_at, published_at, scheduled_for

finance_tracker:
  record_type, client_name, service_line, amount,
  issue_date, due_date, payment_date, status

escalations:
  raised_by, escalation_type, description,
  decision_needed, sams_recommendation,
  sameer_decision, status

---

# PIPELINE STAGE MAPPING
HubSpot internal → Display label:
appointmentscheduled → Radar
qualifiedtobuy → Connected
presentationscheduled → Engaged
decisionmakerboughtin → Discovery
contractsent → Proposal
closedwon → Active

---

# SERVICE LINE CODES
DIAG = GTM Diagnostic
FCRO = Fractional CRO
ROPS = RevOps Audit

---

# WHAT TO BUILD (Product Spec Summary)
Full spec in GTM360_PRODUCT_SPEC.md

6 views with left sidebar navigation:
1. Command Center (/) — home, Sam's brief, pipeline overview
2. Sam (/sam) — split: structured brief left + chat right
3. Rex (/rex) — pipeline table + company detail + research output
4. Andy (/andy) — content queue + draft editor + chat
5. Finn (/finn) — financial dashboard + chat
6. Ola (/ola) — OKR tracker + system health + chat

Global: Header with Cmd+K command palette, notification bell

UX feel: HubSpot layout + Linear/Gong aesthetics
Dark mode only. Operator-grade. Demo-ready.

---

# DEMO FLOW (memorize this)
1. Command Center — show Sam's live brief ($59K pipeline, Sam's flag)
2. Rex view — type prospect's company, run /research, watch it stream
3. Andy view — show draft post, QC score, approve button
4. Sam chat — run /today live, show orchestration
5. Ola view — show system health, all agents green

The killer moment: run /research on the prospect's own company live in the room.
