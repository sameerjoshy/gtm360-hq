-- Escalations table
CREATE TABLE IF NOT EXISTS escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  agent_name TEXT NOT NULL,
  escalation_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  confidence DECIMAL(3, 2),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_escalations_customer_id ON escalations(customer_id);
