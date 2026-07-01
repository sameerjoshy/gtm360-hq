-- migrations/004_agent_tables.sql
-- GTM360 Agent Tables (Phase 1, 2, 3)

-- Phase 1: Prospecting & Deal Management

-- Lead Qualifications
CREATE TABLE IF NOT EXISTS lead_qualifications (
    id BIGSERIAL PRIMARY KEY,
    lead_email TEXT NOT NULL UNIQUE,
    lead_name TEXT NOT NULL,
    company_domain TEXT,
    discovery_responses JSONB,
    qualification_score FLOAT CHECK (qualification_score >= 0 AND qualification_score <= 10),
    routed_to_sameer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_qualifications_routed ON lead_qualifications(routed_to_sameer);
CREATE INDEX IF NOT EXISTS idx_lead_qualifications_score ON lead_qualifications(qualification_score DESC);

-- Deal Risks
CREATE TABLE IF NOT EXISTS deal_risks (
    id BIGSERIAL PRIMARY KEY,
    deal_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    engagement_gap_days INTEGER,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    last_activity TIMESTAMPTZ,
    escalated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_risks_level ON deal_risks(risk_level);
CREATE INDEX IF NOT EXISTS idx_deal_risks_escalated ON deal_risks(escalated);

-- Competitive Intel
CREATE TABLE IF NOT EXISTS competitive_intel (
    id BIGSERIAL PRIMARY KEY,
    company_domain TEXT NOT NULL,
    competitor_name TEXT NOT NULL,
    intel_source TEXT,
    intel_text JSONB,
    intel_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitive_intel_company ON competitive_intel(company_domain);

-- Deal Reviews
CREATE TABLE IF NOT EXISTS deal_reviews (
    id BIGSERIAL PRIMARY KEY,
    deal_id TEXT NOT NULL,
    deal_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    review_date DATE,
    meddic_score FLOAT CHECK (meddic_score >= 0 AND meddic_score <= 10),
    review_text JSONB,
    status TEXT DEFAULT 'ready',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deal_reviews_meddic ON deal_reviews(meddic_score DESC);

-- Phase 2: Post-Sales & Onboarding

-- Success Plans
CREATE TABLE IF NOT EXISTS success_plans (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    plan_90_day JSONB,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Early Health Checks
CREATE TABLE IF NOT EXISTS early_health_checks (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    health_score FLOAT CHECK (health_score >= 0 AND health_score <= 10),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    check_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_early_health_score ON early_health_checks(health_score);
CREATE INDEX IF NOT EXISTS idx_early_health_customer ON early_health_checks(customer_id);

-- Support Triage
CREATE TABLE IF NOT EXISTS support_triage (
    id BIGSERIAL PRIMARY KEY,
    ticket_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    subject TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT,
    escalate_to TEXT,
    triaged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_triage_severity ON support_triage(severity);
CREATE INDEX IF NOT EXISTS idx_support_triage_escalate ON support_triage(escalate_to);

-- AE→CS Handovers
CREATE TABLE IF NOT EXISTS ae_cs_handovers (
    id BIGSERIAL PRIMARY KEY,
    deal_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    handover_ready BOOLEAN DEFAULT FALSE,
    gaps JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Churn Risks
CREATE TABLE IF NOT EXISTS churn_risks (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    churn_risk_score FLOAT CHECK (churn_risk_score >= 0 AND churn_risk_score <= 10),
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS churn_risks_score ON churn_risks(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS churn_risks_flagged ON churn_risks(flagged);

-- EBR Preps
CREATE TABLE IF NOT EXISTS ebr_preps (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    quarter TEXT,
    ebr_agenda JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stakeholder Coverage
CREATE TABLE IF NOT EXISTS stakeholder_coverage (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    coverage_score FLOAT CHECK (coverage_score >= 0 AND coverage_score <= 10),
    gaps JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stakeholder_coverage_score ON stakeholder_coverage(coverage_score);

-- Phase 3: Expansion & Retention

-- Upsell Signals
CREATE TABLE IF NOT EXISTS upsell_signals (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    upsell_opportunity BOOLEAN DEFAULT FALSE,
    trigger TEXT,
    expansion_potential FLOAT CHECK (expansion_potential >= 0 AND expansion_potential <= 10),
    recommended_offer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upsell_signals_opportunity ON upsell_signals(upsell_opportunity);

-- Renewals
CREATE TABLE IF NOT EXISTS renewals (
    id BIGSERIAL PRIMARY KEY,
    contract_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    arr FLOAT,
    renewal_date DATE,
    renewal_confidence TEXT CHECK (renewal_confidence IN ('low', 'medium', 'high')),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    recommended_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewals_risk ON renewals(risk_level);
CREATE INDEX IF NOT EXISTS idx_renewals_date ON renewals(renewal_date);

-- Advocacy
CREATE TABLE IF NOT EXISTS advocacy (
    id BIGSERIAL PRIMARY KEY,
    customer_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    advocacy_score FLOAT CHECK (advocacy_score >= 0 AND advocacy_score <= 10),
    advocate_tier TEXT CHECK (advocate_tier IN ('supporter', 'promoter', 'champion')),
    recommended_ask TEXT,
    pitch TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advocacy_tier ON advocacy(advocate_tier);
CREATE INDEX IF NOT EXISTS idx_advocacy_score ON advocacy(advocacy_score DESC);

-- Escalations (if not already created in week 1)
CREATE TABLE IF NOT EXISTS escalations (
    id BIGSERIAL PRIMARY KEY,
    raised_by TEXT NOT NULL,
    escalation_type TEXT NOT NULL,
    description TEXT,
    decision_needed TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_escalations_type ON escalations(escalation_type);

-- Agent Execution Log (for monitoring)
CREATE TABLE IF NOT EXISTS agent_execution_log (
    id BIGSERIAL PRIMARY KEY,
    agent_name TEXT NOT NULL,
    phase INTEGER,
    status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    items_processed INTEGER,
    total_items INTEGER,
    error_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_execution_agent ON agent_execution_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_execution_status ON agent_execution_log(status);
CREATE INDEX IF NOT EXISTS idx_agent_execution_date ON agent_execution_log(created_at DESC);
