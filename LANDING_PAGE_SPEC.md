# GTM360 HQ — Landing Page Specification
Version: 1.0 | File: src/pages/Landing.jsx

---

# THE CONCEPT
"We didn't build AI tools. We built a company."

The landing page is an interactive org chart of a fully staffed 
AI-native GTM organization. Every role has a job profile, KRAs, 
daily outputs, and communication flows to other agents.

Visitor experience:
Land → See the org → Click any agent → Job profile slides in →
Scroll → See agents talking to each other →
Feel: "This is a real operating company. I want this."
CTA: "Request a Demo"

---

# DESIGN DIRECTION

## Aesthetic
- Dark luxury operator grade
- NOT startup landing page
- Think: McKinsey org chart meets Minority Report war room
- Feels like walking into a real company headquarters
- Premium, confident, operator-built

## Visual Language
- Background: #0A0A0F with subtle animated mesh/grid
- Agent cards: glass morphism — dark glass with orange glow on hover
- Org lines: animated — pulse like a live org chart
- Active agent: glows orange, pulses subtly
- Typography: Bebas Neue for names/roles, DM Sans for content
- Status indicators: green pulse dots = live agents, 
  amber dots = coming soon

## Animations
- Hero: text reveals staggered on load
- Org chart: nodes fade in from center outward
- Agent cards: 3D tilt on hover (CSS transform)
- Connection lines: animated dash — data flowing between agents
- Job profile panel: slides in from right on click
- Scroll sections: fade + translate up on enter

---

# FULL ORG STRUCTURE

## C-SUITE (Top Row)
SAMEER JOSHI — Founder & CEO (human, center top)

## OPERATIONS ARM (Left branch from CEO)
SAM — Chief of Staff (reports to CEO)
OLA — COO (reports to CEO)

## REVENUE ARM (Right branch from CEO, through Sam)
REX — CRO (reports to Sam)
ANDY — CMO (reports to Sam)  
FINN — CFO (reports to Sam)

## REVENUE EXECUTION (Under Rex)
MEMO — Meeting Intelligence (reports to Rex)
OZ — Outreach Execution (reports to Rex)
PIP — Prospector (reports to Rex)
NARA — Nurture Monitor (reports to Rex)
PROP — Proposal Writer (reports to Rex)

## CONTENT EXECUTION (Under Andy)
ARIA — Trend Researcher (reports to Andy)

## OPERATIONS EXECUTION (Under Ola)
CLEO — CRM Cleanup (reports to Ola)

---

# AGENT PROFILES (complete for all 12)

## SAMEER JOSHI — Founder & CEO
Type: Human
Status: Always On
Role: Strategic decisions, client relationships, final approvals
The only human in the org. Sameer sets direction, approves outputs,
and closes deals. Everything else runs autonomously.

## SAM — Chief of Staff
Department: Executive
Status: LIVE
Reports to: Sameer
Feeds: All agents
Fed by: All agents

OWNS:
- Daily morning brief
- Cross-agent orchestration
- Escalation management
- Priority setting

DAILY OUTPUT:
- Morning brief at 6:30 AM (pipeline + OKRs + Sam's Flag)
- Escalation flags in real time
- Priority action list

KRAs:
1. Brief delivered by 6:30 AM every day
2. Zero escalations older than 24hrs unresolved
3. All agent outputs surfaced to Sameer within 1 hour

TALKS TO: Rex (pipeline), Andy (content queue), 
          Finn (invoices), Ola (OKRs), All escalations

## REX — Chief Revenue Officer
Department: Revenue
Status: LIVE
Reports to: Sam
Feeds: Memo, Oz, Prop
Fed by: Pip, Nara, HubSpot

OWNS:
- Pipeline intelligence
- Account research (/research)
- Account intelligence (/intel)
- Meeting preparation (/prep)
- Campaign planning (/campaign)

DAILY OUTPUT:
- Stale deal signals → escalations
- Research briefs on demand
- Meeting prep 2hrs before discovery calls
- Account Intelligence Package on demand

KRAs:
1. Every prospect researched before first contact
2. Pipeline data never more than 24hrs stale
3. Zero discovery calls without a pre-call brief

TALKS TO: Sam (escalations), Memo (post-call), 
          Oz (campaign execution), Prop (deal context)

## ANDY — Chief Marketing Officer
Department: Marketing
Status: LIVE
Reports to: Sam
Feeds: Content queue, Typefully
Fed by: Aria (trend data), Sameer (/capture)

OWNS:
- LinkedIn content strategy
- Post drafting and QC
- Voice consistency
- Newsletter

DAILY OUTPUT:
- Draft posts from observations
- QC scoring (4-test framework)
- Content queue management

KRAs:
1. 20 LinkedIn posts published per quarter
2. QC score never below 7/10 before Sameer sees it
3. Every observation captured → drafted within 48hrs

TALKS TO: Sam (approval flags), Aria (trend inputs),
          Sameer (content approval)

## FINN — Chief Financial Officer
Department: Finance
Status: LIVE
Reports to: Sam
Feeds: Escalations, Proposals
Fed by: Finance tracker, Active engagements

OWNS:
- Invoice tracking
- Pricing recommendations
- P&L visibility
- Commercial negotiation framework

WEEKLY OUTPUT:
- Invoice status report (Monday)
- Overdue invoice escalations
- Pricing recommendations per deal

KRAs:
1. Zero invoices overdue more than 7 days without escalation
2. Pricing recommendation ready before every proposal
3. MTD revenue visible in cockpit at all times

TALKS TO: Sam (invoice alerts), Prop (pricing),
          Sameer (commercial approvals)

## OLA — Chief Operating Officer
Department: Operations
Status: LIVE
Reports to: Sam
Feeds: OKR tracker, Error log
Fed by: All agents (health data)

OWNS:
- OKR tracking and pulse
- System health monitoring
- Automation scheduling
- Tool stack management

WEEKLY OUTPUT:
- OKR pulse report (Monday)
- System health check
- Agent status report
- Error log review

KRAs:
1. OKR data updated every Monday without fail
2. Zero agent failures undetected more than 1hr
3. All automations running on schedule

TALKS TO: Sam (OKR flags), All agents (health checks),
          Cleo (CRM quality)

## MEMO — Head of Meeting Intelligence
Department: Revenue
Status: COMING SOON
Reports to: Rex
Feeds: HubSpot, Sam brief, Prop
Fed by: Sameer (call notes/transcripts)

OWNS:
- Post-call intelligence extraction
- CRM updates post-meeting
- Follow-up email drafting
- Deal progression tracking

OUTPUT PER MEETING:
- Extracted: commitments, signals, objections, next steps
- HubSpot updated automatically
- Follow-up email drafted and presented
- Sam's brief updated with deal progression

KRAs:
1. Every call processed within 2hrs of ending
2. CRM updated same day as every meeting
3. Zero follow-up emails delayed more than 24hrs

TALKS TO: Rex (deal updates), Prop (discovery insights),
          Sam (deal progression flags)

## OZ — Head of Outreach
Department: Revenue
Status: COMING SOON
Reports to: Rex
Feeds: Outreach queue, HubSpot
Fed by: Rex (campaign plans), Nara (engagement signals)

OWNS:
- Multi-touch outreach sequence drafting
- Outreach queue management
- Response tracking
- Campaign execution

OUTPUT PER PROSPECT:
- 5-touch sequence (LinkedIn + email)
- Personalized per contact using Rex intel
- Queued with scheduled dates
- Presented for approval before sending

KRAs:
1. Zero messages sent without explicit approval
2. Every sequence personalized — no generic copy
3. All responses logged and escalated within 2hrs

TALKS TO: Rex (intel input), Nara (engagement triggers),
          Sam (approval flags)

## PROP — Head of Proposals
Department: Revenue
Status: COMING SOON
Reports to: Rex
Feeds: Proposal docs, Notion
Fed by: Memo (call notes), Rex (intel), Finn (pricing)

OWNS:
- Proposal writing
- Scope definition
- Investment framing
- Proposal versioning

OUTPUT PER DEAL:
- Problem statement (client's words)
- Proposed scope and deliverables
- Timeline and process
- Investment with structure
- Sent to Notion for review

KRAs:
1. Proposal ready within 24hrs of discovery call
2. Every proposal includes financial pain hook from Rex
3. Zero proposals sent without Finn's pricing approval

TALKS TO: Rex (intel), Memo (call context),
          Finn (pricing), Sameer (final approval)

## PIP — Head of Prospecting
Department: Revenue
Status: COMING SOON
Reports to: Rex
Feeds: prospect_signals, Pipeline
Fed by: Google News, Apify, Phantombuster

OWNS:
- ICP signal monitoring
- New prospect identification
- Signal scoring and qualification
- Pipeline proposals

WEEKLY OUTPUT:
- Funding signal scan (Wednesday)
- Hiring signal scan (Wednesday)
- Qualified prospects proposed to Sameer
- Never adds to pipeline without approval

KRAs:
1. 5+ qualified signals identified per week
2. ICP score 7+ before any prospect proposed
3. Zero duplicates with existing pipeline

TALKS TO: Rex (research trigger), Sam (weekly signal brief),
          Sameer (pipeline approval)

## NARA — Head of Nurture
Department: Revenue
Status: COMING SOON
Reports to: Rex
Feeds: Outreach queue, Escalations
Fed by: Gmail, Google Calendar, HubSpot

OWNS:
- Engagement signal monitoring
- Contextual follow-up drafting
- Stage movement recommendations
- Prospect activity tracking

DAILY OUTPUT:
- Email reply detection from prospect domains
- Meeting booking signals
- Engagement-triggered follow-up drafts
- Stage advancement recommendations

KRAs:
1. Every engagement signal detected within 2hrs
2. Follow-up draft ready before Sameer sees the signal
3. Zero warm prospects going cold undetected

TALKS TO: Rex (signal context), Oz (follow-up execution),
          Sam (escalation flags)

## ARIA — Head of Trend Research
Department: Marketing
Status: COMING SOON
Reports to: Andy
Feeds: content_queue, trend_reports
Fed by: Reddit, Google News, Google Trends, Substack

OWNS:
- Weekly trend monitoring
- Emerging vs crowded topic identification
- Content hook generation
- Market gap identification

WEEKLY OUTPUT:
- Trend report (Monday): Emerging / Crowded / Gaps
- 3-5 raw observations → Andy's content queue
- Hook angles for each trending topic

KRAs:
1. Trend report delivered every Monday
2. Minimum 3 actionable observations per week
3. Zero crowded topics drafted by Andy

TALKS TO: Andy (content queue), Sam (weekly trend brief),
          Sameer (topic approval)

## CLEO — Head of CRM Quality
Department: Operations
Status: COMING SOON
Reports to: Ola
Feeds: cleanup_reports, HubSpot
Fed by: pipeline_snapshot, HubSpot

OWNS:
- CRM data quality
- Duplicate detection
- Missing data flags
- Cleanup proposals

WEEKLY OUTPUT:
- CRM health report (Monday)
- Critical issues list
- Cleanup proposals (never auto-executes)
- Data quality score

KRAs:
1. Zero critical CRM issues undetected more than 7 days
2. Data quality score above 80% at all times
3. Never deletes or modifies without explicit approval

TALKS TO: Ola (health reports), Sam (quality flags),
          Rex (pipeline data accuracy)

---

# INTER-AGENT COMMUNICATION FLOWS (for visual)

## The Morning Flow (daily)
Make syncs HubSpot → Supabase [6:00 AM]
Rex checks stale deals → escalations [6:15 AM]
Sam reads everything → writes brief [6:30 AM]
Sameer opens cockpit → brief is ready

## The Content Flow
Aria finds trend → raw observation → content_queue
Andy picks up → drafts post → QC scores it
Sam flags: "Post awaiting approval"
Sameer approves → Andy schedules

## The Prospecting Flow
Pip finds signal (funding/hiring) → prospect_signals
Sam flags in brief: "Pip found 3 new prospects"
Sameer approves → Rex runs /research
Rex produces intel → Oz drafts 5-touch sequence
Sameer approves each message → sent

## The Deal Flow
Sameer has meeting → Memo processes transcript
Memo updates HubSpot → flags Sam
Rex uses call notes for follow-up intel
Prop generates proposal using Memo + Rex data
Finn prices it → Sameer approves → sent

---

# PAGE SECTIONS

## Section 1: HERO (full viewport)
Headline: "We didn't build AI tools."
          "We built a company."
Subline: "GTM360 HQ is a fully staffed AI-native commercial 
         organization. Every role. Every function. Running 24/7."
CTA: [Meet the Team →] [Request a Demo]
Background: Animated org chart nodes appearing in background

## Section 2: THE ORG CHART (full viewport, interactive)
Subtitle: "YOUR COMMERCIAL ORGANIZATION"
The full interactive org chart
Click any agent → job profile panel slides in from right
Live agents: orange glow, green status dot
Coming soon: amber glow, amber dot
Animated lines pulse between connected agents
Small data packets animate along connection lines

## Section 3: HOW THEY WORK TOGETHER
"The system runs itself."
Show the 3 key flows visually:
- Morning Flow (timeline)
- Content Flow (chain)
- Deal Flow (pipeline)

## Section 4: /intel FEATURE MOMENT
Big, dark, dramatic section
"Any company. 30 seconds. Complete intelligence."
Show the 4 outputs as cards:
Company Snapshot | Financial Pain Hook | 
Buying Committee | Access Strategy
"What took Innovapptive 3 people and 30 days — 
GTM360 HQ does on demand."

## Section 5: THE NUMBERS
5 Live Agents | 7 Coming Soon | 12 Automated Workflows
121 Tests Passing | $0 Monthly AI Cost | 1 Human Running It

## Section 6: BUILT FOR
"Early-stage founders who are still the sales team."
"Scale-up CROs who need to grow without headcount."

## Section 7: CTA
"See it running live."
"I'll run /research on your company. Live. In the room."
[Request a Demo →]
mailto:sameer@gtm-360.com?subject=GTM360 HQ Demo Request

## Section 8: FOOTER
GTM360 HQ | Built by Sameer Joshi | gtm-360.com
"One person. Twelve agents. Full commercial engine."

---

# TECHNICAL SPEC

## Routing
/ → Landing page (public)
/dashboard → Command Center (existing app)
Landing has "Enter HQ →" link top right for direct access

## Agent Card Component
Props: name, role, department, status, kras[], 
       talksTo[], reportsTo, description
States: default / hover (3D tilt) / active (job profile open)

## Job Profile Panel
Slides in from right (400px wide)
Shows: role, department, status, owns[], 
       daily_output[], kras[], talks_to[]
Close: click outside or X button

## Connection Lines
SVG lines between agent nodes
Animated stroke-dashoffset for data flow effect
Color: orange (#FF4D00) for live connections
       amber for coming soon

## Status Indicators
Live: green pulse dot + "LIVE" badge
Coming Soon: amber dot + "COMING SOON" badge

## Mobile
Org chart becomes vertical scroll on mobile
Cards stack in department groups
Job profiles become bottom sheet instead of side panel

---

# COPY TONE
Professional. Irreverent. Operator-driven.
Never: "AI-powered", "revolutionary", "game-changing"
Always: Specific, functional, outcome-focused
Voice: Senior operator showing the work, not selling

TAGLINE OPTIONS:
- "One person. Twelve agents. Full commercial engine."
- "We didn't build AI tools. We built a company."
- "Your GTM team. Running 24/7. Without the headcount."
