# GTM360 HQ — /intel Command Specification
Feature: Account Intelligence Package
Agent: Rex (CRO)
Version: 1.0

---

# WHAT THIS BUILDS

A single command `/intel [company]` that produces a complete
Account Intelligence Package — the same output Innovapptive
needed 3 people to generate manually, done autonomously in
under 60 seconds.

---

# DATA FLOW

```
User runs /intel [company domain]
          ↓
LAYER 1: Clay MCP
  → company enrichment (firmographics, funding, tech stack)
          ↓
LAYER 2: Apollo API
  → people search (CEO, CRO, CFO, VP Sales)
  → org structure
          ↓
LAYER 3: Web Search (Perplexity/Claude)
  → recent news (last 90 days)
  → funding announcements
  → hiring signals
  → financial signals
          ↓
LAYER 4: Claude API (synthesis)
  → financial pain hook
  → buying committee map
  → access strategy
  → recommended outreach sequence
          ↓
OUTPUT: Account Intelligence Package
  → Written to Supabase (research_briefs table)
  → Saved to Notion (Rex/Research Briefs)
  → Displayed in Rex view detail panel
```

---

# OUTPUT FORMAT

## Account Intelligence Package: [Company]
Generated: [timestamp] | Confidence: HIGH/MEDIUM/LOW

---

### 01. COMPANY SNAPSHOT
- Name: | Domain: | Founded: | HQ:
- Industry: | Employees: | Est. Revenue:
- Funding: [stage, amount, investors]
- Tech Stack: [key tools — CRM, marketing, sales]
- Business Model: B2B SaaS / Services / Marketplace
- ICP Fit Score: [X/10] — Strong/Moderate/Weak

### 02. FINANCIAL PAIN HOOK
[3-4 sentences written like a sharp operator, not a consultant]

Format:
"[Company] is at [revenue/stage] with [employees] people.
[Specific financial pressure based on their situation].
[What this means for their GTM motion].
[The quantified opportunity GTM-360 can unlock]."

Example output:
"revVana is at $2.8M ARR with 17 people, growing 75% YoY.
At this pace without a dedicated sales hire, Greg Lewis
is personally closing every deal — a ceiling that typically
hits around $4-5M ARR. Building a repeatable GTM motion now
could compress their path to $7M from 24 months to 12."

Source every claim. [NO DATA] if not found.

### 03. BUYING COMMITTEE

| Role | Name | Title | Priority | Why |
|------|------|-------|----------|-----|
| Economic Buyer | [name] | [title] | HIGH | Controls budget |
| Champion | [name] | [title] | HIGH | Feels the pain daily |
| Gatekeeper | [name] | [title] | MEDIUM | Controls access |
| Influencer | [name] | [title] | LOW | Technical evaluator |

For each person include:
- LinkedIn URL if found
- One sentence on their likely priority/pain
- Engagement recommendation

### 04. ACCESS STRATEGY

**Warm Paths:**
- [conference/event they attend or speak at]
- [mutual connections or partner channels]
- [content they engage with]
- [communities they're active in]

**Recommended Outreach Sequence:**
1. Day 1: [channel] — [specific hook]
2. Day 3: [channel] — [follow up angle]  
3. Day 7: [channel] — [value add]
4. Day 14: [channel] — [final attempt]

**Opening Line (use verbatim):**
"[Specific, researched, personalized opener based on
their actual situation — not generic]"

### 05. COMPETITIVE CONTEXT
- Main competitors they face: [list]
- Where GTM-360 fits vs alternatives they might consider
- Objections likely to raise + responses

---

# IMPLEMENTATION IN REX VIEW

## New button: [⚡ Intel] alongside [Research] and [Prep]

## UI Changes needed in RexView.jsx:
1. Add Intel button to detail panel header
2. Add Intel output panel (separate from Research panel)
3. Intel output streams in real time
4. Show data source badges per section
   (Clay / Apollo / Web / Claude)
5. Add confidence indicator per section
6. "Copy Hook" button on Financial Pain Hook section
   (copies hook text to clipboard for outreach)
7. "Save to Notion" saves full package to Rex/Research Briefs

## Loading states:
- "Fetching company data..." (Clay)
- "Finding stakeholders..." (Apollo)
- "Researching signals..." (Web)
- "Building intelligence package..." (Claude)
Each step shows as it completes — not all at once.

---

# API INTEGRATION SPECS

## Clay MCP (already connected)
Use existing Clay MCP connection.
Call: find-and-enrich-company
Input: company domain
Output: firmographics, funding, tech stack, headcount

## Apollo API (new)
Base URL: https://api.apollo.io/v1
Key: stored in Supabase Vault as apollo_api_key

Endpoint: POST /mixed_people/search
Headers:
  Content-Type: application/json
  Cache-Control: no-cache
  X-Api-Key: [from vault]

Body:
{
  "organization_domains": ["[company_domain]"],
  "person_titles": ["CEO", "Founder", "CRO", 
                    "VP Sales", "CFO", "COO",
                    "President", "Chief Revenue Officer"],
  "page": 1,
  "per_page": 10
}

Response fields to extract:
  - first_name, last_name
  - title
  - linkedin_url
  - email (if available on free tier)
  - organization.name
  - organization.estimated_num_employees

## Supabase Vault — keys needed:
- apollo_api_key ← ADD THIS (you just did)
- claude_api_key ← already exists
- supabase_service_key ← already exists

---

# CLAUDE SYNTHESIS PROMPT

System:
"You are Rex, CRO at GTM360 HQ. You produce account
intelligence packages for B2B revenue consultancy GTM-360.
Be precise. Cite sources. Never fabricate.
Output structured JSON only."

User prompt template:
"Company: [name]
Domain: [domain]

Clay Data:
[clay enrichment output]

Apollo People:
[apollo people results]

Web Research:
[recent news, signals]

ICP: B2B SaaS/Services, $1M-$100M ARR founders and CROs.
Service: GTM Diagnostic ($3-8K), Fractional CRO ($5-20K/mo)

Generate Account Intelligence Package JSON:
{
  financial_pain_hook: string (3-4 sentences, operator voice),
  buying_committee: [{role, name, title, priority, why, linkedin}],
  access_strategy: {
    warm_paths: string[],
    sequence: [{day, channel, hook}],
    opening_line: string
  },
  competitive_context: {
    competitors: string[],
    gtm360_positioning: string,
    likely_objections: [{objection, response}]
  },
  confidence: HIGH|MEDIUM|LOW,
  data_sources: string[]
}"

---

# SUPABASE STORAGE

Store Intel package in research_briefs table:
  company_name: string
  company_domain: string
  icp_fit: string
  icp_score: number
  recommended_entry: string
  notion_page_url: string
  status: string
  
Add new columns (migration needed):
  financial_pain_hook: text
  buying_committee: jsonb
  access_strategy: jsonb
  competitive_context: jsonb
  intel_generated_at: timestamptz
  intel_confidence: text
  data_sources: text[]

---

# DEMO SCRIPT FOR /intel

Setup: revVana selected in Rex view.
Prospect in the room.

1. "Let me show you what Rex does in 30 seconds."
2. Click [⚡ Intel] button
3. Watch loading steps tick through in real time
4. "Clay is pulling their company data..."
5. "Apollo is finding the buying committee..."
6. "Rex is building the financial hook..."
7. Package appears.
8. Point to Financial Pain Hook:
   "This is what you'd say to Greg Lewis. 
    Researched. Specific. Ready to use."
9. Click "Copy Hook" — one click, ready to paste.
10. Point to Buying Committee:
    "Economic buyer, champion, gatekeeper — mapped.
     Never go in blind again."

KILL LINE:
"This took Innovapptive a team of 3 people and 30 days
to do at scale. Rex does it for any company in 30 seconds."
