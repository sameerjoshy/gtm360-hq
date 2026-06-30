-- GTM360 HQ Initial Schema
CREATE TABLE IF NOT EXISTS customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deals (
  deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(customer_id),
  deal_name TEXT NOT NULL,
  amount DECIMAL(15, 2),
  stage TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_customer_id ON deals(customer_id);
