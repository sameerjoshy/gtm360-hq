-- Feedback table
CREATE TABLE IF NOT EXISTS user_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  escalation_id UUID REFERENCES escalations(escalation_id),
  action_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_actions_customer_id ON user_actions(customer_id);
