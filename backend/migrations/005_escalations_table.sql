-- Add to existing 004_agent_tables.sql

CREATE TABLE IF NOT EXISTS escalations (
  id BIGSERIAL PRIMARY KEY,
  agent_name TEXT NOT NULL,
  escalation_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  entity_id TEXT,
  entity_type TEXT,
  data JSONB,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by TEXT
);

CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_escalations_agent ON escalations(agent_name);
