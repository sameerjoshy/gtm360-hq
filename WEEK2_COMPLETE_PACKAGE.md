# WEEK 2 COMPLETE PACKAGE ✅

**All 14 agents refactored and ready to copy into your repo.**

---

## FILES GENERATED (23 files total)

### Framework (3 files)
```
week2_llm.py → backend/utils/llm.py
week2_supabase_client.py → backend/utils/supabase_client.py
week2_base_agent.py → backend/agents/base_agent.py
```

### Orchestrator & API (3 files)
```
week2_orchestrator.py → backend/agents/orchestrator.py
week2_agents_api.py → backend/api/agents.py
week2_scheduler.py → backend/scheduler.py
```

### Phase 1 Agents (4 files) ✅
```
week2_lead_qualification_agent.py → backend/agents/phase1/lead_qualification.py
week2_deal_risk_agent.py → backend/agents/phase1/deal_risk.py
week2_competitive_intel_agent.py → backend/agents/phase1/competitive_intel.py
week2_deal_review_agent.py → backend/agents/phase1/deal_review.py
```

### Phase 2 Agents (7 files) ✅
```
week2_success_plan_agent.py → backend/agents/phase2/success_plan.py
week2_early_health_agent.py → backend/agents/phase2/early_health.py
week2_support_triage_agent.py → backend/agents/phase2/support_triage.py
week2_ae_cs_handover_agent.py → backend/agents/phase2/ae_cs_handover.py
week2_churn_risk_agent.py → backend/agents/phase2/churn_risk.py
week2_ebr_prep_agent.py → backend/agents/phase2/ebr_prep.py
week2_stakeholder_coverage_agent.py → backend/agents/phase2/stakeholder_coverage.py
```

### Phase 3 Agents (3 files) ✅
```
week2_upsell_signal_agent.py → backend/agents/phase3/upsell_signal.py
week2_renewal_agent.py → backend/agents/phase3/renewal.py
week2_advocacy_agent.py → backend/agents/phase3/advocacy.py
```

### Database (1 file)
```
week2_agent_tables_migration.sql → migrations/004_agent_tables.sql
```

### Documentation (2 files)
```
WEEK2_INTEGRATION_GUIDE.md → Reference guide (step-by-step)
WEEK2_SUMMARY.md → Overview and architecture
```

---

## QUICK START (30 MINUTES)

### Step 1: Create Directories
```bash
cd C:\GTM360\gtm360-hq
mkdir backend\agents\phase1
mkdir backend\agents\phase2
mkdir backend\agents\phase3
```

### Step 2: Copy Framework Files
```bash
# From outputs folder, copy these to your repo:
week2_llm.py → backend/utils/llm.py
week2_supabase_client.py → backend/utils/supabase_client.py
week2_base_agent.py → backend/agents/base_agent.py
week2_orchestrator.py → backend/agents/orchestrator.py
week2_agents_api.py → backend/api/agents.py
week2_scheduler.py → backend/scheduler.py
```

### Step 3: Copy All 14 Agent Files
```bash
# Phase 1
week2_lead_qualification_agent.py → backend/agents/phase1/lead_qualification.py
week2_deal_risk_agent.py → backend/agents/phase1/deal_risk.py
week2_competitive_intel_agent.py → backend/agents/phase1/competitive_intel.py
week2_deal_review_agent.py → backend/agents/phase1/deal_review.py

# Phase 2
week2_success_plan_agent.py → backend/agents/phase2/success_plan.py
week2_early_health_agent.py → backend/agents/phase2/early_health.py
week2_support_triage_agent.py → backend/agents/phase2/support_triage.py
week2_ae_cs_handover_agent.py → backend/agents/phase2/ae_cs_handover.py
week2_churn_risk_agent.py → backend/agents/phase2/churn_risk.py
week2_ebr_prep_agent.py → backend/agents/phase2/ebr_prep.py
week2_stakeholder_coverage_agent.py → backend/agents/phase2/stakeholder_coverage.py

# Phase 3
week2_upsell_signal_agent.py → backend/agents/phase3/upsell_signal.py
week2_renewal_agent.py → backend/agents/phase3/renewal.py
week2_advocacy_agent.py → backend/agents/phase3/advocacy.py
```

### Step 4: Create __init__.py Files
```bash
# In each directory:
touch backend/agents/__init__.py
touch backend/agents/phase1/__init__.py
touch backend/agents/phase2/__init__.py
touch backend/agents/phase3/__init__.py
```

### Step 5: Update backend/app.py
```python
# Add these imports at the top:
from backend.api.agents import agents_bp
from backend.scheduler import start_scheduler

# Register blueprint:
app.register_blueprint(agents_bp)

# Add scheduler startup:
@app.before_request
def startup():
    if not hasattr(app, 'scheduler_started'):
        start_scheduler()
        app.scheduler_started = True
```

### Step 6: Update requirements.txt
```
Add: apscheduler==3.10.4
```

### Step 7: Run Migration in Supabase
```bash
# Copy SQL from:
week2_agent_tables_migration.sql

# Paste into Supabase SQL Editor and execute
```

### Step 8: Test Locally
```bash
# Test agents import
python -c "from backend.agents.orchestrator import get_orchestrator; print('✅ Orchestrator loaded')"

# Test API
curl -X POST http://localhost:5000/api/agents/lead_qualification/run

# Should return 200 with agent results
```

### Step 9: Commit & Push
```bash
git add .
git commit -m "Week 2: Add orchestrator framework with 14 refactored agents"
git push origin main
```

GitHub Actions will run tests and deploy automatically.

---

## WHAT YOU GET

✅ **Unified Agent Framework**
- All 14 agents now use BaseAgent pattern
- Shared LLM utilities (no duplication)
- Consistent error handling and escalations
- Single orchestrator managing all agents

✅ **On-Demand API**
- Trigger any agent via HTTP
- Run single agent, phase, or all agents
- Get real-time results and status

✅ **Automatic Scheduling**
- Agents run on defined cadences
- Lead Qual every hour
- Deal Risk/Review/Comp Intel daily
- Churn Risk + Health checks daily
- EBR/Advocacy/Stakeholder weekly
- Support Triage every 15 minutes

✅ **Database & Monitoring**
- 15 new tables created
- Agent execution log for monitoring
- Escalations tracked and surfaced

✅ **Production Ready**
- Error handling & logging
- Mock data for MVP testing
- Integrates with Groq LLM
- Integrates with Serper API
- Integrates with Supabase

---

## API ENDPOINTS (AFTER INTEGRATION)

```bash
# List all agents
GET http://localhost:5000/api/agents

# Get single agent status
GET http://localhost:5000/api/agents/lead_qualification

# Get agents by phase
GET http://localhost:5000/api/agents/phase/1

# Run single agent
POST http://localhost:5000/api/agents/lead_qualification/run

# Run all agents in phase
POST http://localhost:5000/api/agents/phase/1/run

# Run all 14 agents
POST http://localhost:5000/api/agents/run

# Get scheduler status
GET http://localhost:5000/api/health/scheduler
```

---

## VERIFY INTEGRATION

After copying files, test these:

```bash
# Should return agent list
curl http://localhost:5000/api/agents

# Should run single agent
curl -X POST http://localhost:5000/api/agents/lead_qualification/run

# Should run all 14 agents
curl -X POST http://localhost:5000/api/agents/run
```

All three should return 200 with results.

---

## TROUBLESHOOTING

**"ModuleNotFoundError: orchestrator"**
→ Make sure __init__.py files exist in all phase directories

**"SUPABASE_KEY not set"**
→ Verify .env file has SUPABASE_KEY and GROQ_API_KEY

**"Agent table does not exist"**
→ Run the migration in Supabase (week2_agent_tables_migration.sql)

**"Scheduler not running"**
→ Check apscheduler is installed: `pip install apscheduler==3.10.4`

---

## NEXT: WEEK 3

Once this is live and tests pass:
1. Dashboard for monitoring agent execution
2. Webhook integration for escalations → Slack
3. Real HubSpot pipeline data instead of mock
4. Email parsing for lead qualification
5. Advanced competitive intelligence
6. Customer pilot launch

---

**Status: Ready to integrate** ✅

All refactored agents are in /mnt/user-data/outputs/

Copy them in using the Quick Start above, test locally, and push to GitHub.

Questions? Check WEEK2_INTEGRATION_GUIDE.md for detailed steps.
