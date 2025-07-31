-- Essential Popstar Power System Database Schema
-- Run this script in your Supabase SQL editor

-- Users table mirrors your app's user ids
CREATE TABLE app_users (
  id TEXT PRIMARY KEY, -- Using TEXT instead of UUID for custom user IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now()
);

-- Configuration you can change without an app release
CREATE TABLE power_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,  -- always one row
  max_power INT NOT NULL DEFAULT 24,
  refill_amount INT NOT NULL DEFAULT 1, -- e.g., +1 per interval
  refill_interval_minutes INT NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_config CHECK (id = TRUE)
);

-- Current snapshot + timestamp to compute refills on the fly
CREATE TABLE power_balances (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id),
  base_power INT NOT NULL DEFAULT 0,        -- power at last_update
  last_update TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only ledger (purchases, spends, refunds, grants)
CREATE TABLE power_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  delta INT NOT NULL,                        -- +8 for coffee, -N when spending
  reason TEXT NOT NULL,                      -- "purchase:coffee_1", "spend:action", "refund"
  external_txn_id TEXT,                      -- RevenueCat/Apple transaction id
  idempotency_key TEXT,                      -- ensure once per event
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

-- Insert default configuration
INSERT INTO power_config (max_power, refill_amount, refill_interval_minutes) 
VALUES (24, 1, 30)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_power_balances_user_id ON power_balances(user_id);
CREATE INDEX idx_power_ledger_user_id ON power_ledger(user_id);
CREATE INDEX idx_power_ledger_created_at ON power_ledger(created_at);
CREATE INDEX idx_power_ledger_idempotency ON power_ledger(idempotency_key);

-- Enable Row Level Security (RLS)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_config ENABLE ROW LEVEL SECURITY;

-- Create policies for app_users
CREATE POLICY "Users can view their own record" ON app_users
  FOR SELECT USING (true); -- Allow reading for API

CREATE POLICY "Users can insert their own record" ON app_users
  FOR INSERT WITH CHECK (true); -- Allow API to create users

-- Create policies for power_balances
CREATE POLICY "Users can view their own balance" ON power_balances
  FOR SELECT USING (true); -- Allow API to read

CREATE POLICY "Users can manage their own balance" ON power_balances
  FOR ALL USING (true); -- Allow API to manage

-- Create policies for power_ledger
CREATE POLICY "Users can view their own ledger" ON power_ledger
  FOR SELECT USING (true); -- Allow API to read

CREATE POLICY "Users can insert to their own ledger" ON power_ledger
  FOR INSERT WITH CHECK (true); -- Allow API to insert

-- Create policies for power_config
CREATE POLICY "Anyone can read config" ON power_config
  FOR SELECT USING (true); -- Allow API to read config

CREATE POLICY "Admin can update config" ON power_config
  FOR UPDATE USING (true); -- Allow admin updates through API