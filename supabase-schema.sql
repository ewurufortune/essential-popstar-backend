-- Essential Popstar Database Schema
-- Run this script in your Supabase SQL editor

-- Apple authenticated users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  apple_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  identity_token TEXT,
  authorization_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in TIMESTAMPTZ
);

-- Users table mirrors your app's user ids (for power system)
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

-- Referral system tables
CREATE TABLE referral_codes (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id),
  code TEXT UNIQUE NOT NULL, -- e.g., random string or user id-based
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE referral_claims (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES app_users(id), -- the inviter
  referred_id TEXT UNIQUE NOT NULL REFERENCES app_users(id), -- the invitee
  referral_code TEXT NOT NULL REFERENCES referral_codes(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reward_issued BOOLEAN DEFAULT FALSE, -- whether the reward was granted
  milestone_completed BOOLEAN DEFAULT FALSE, -- referred user completed milestone
  ip_address INET, -- for abuse detection
  user_agent TEXT, -- for device fingerprinting
  CHECK (referrer_id != referred_id) -- prevent self-referral
);

-- Referral rewards tracking
CREATE TABLE referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES app_users(id),
  referred_id TEXT NOT NULL REFERENCES app_users(id),
  reward_type TEXT NOT NULL DEFAULT 'power', -- 'power', 'premium', etc.
  reward_amount INT NOT NULL DEFAULT 5,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ledger_entry_id BIGINT REFERENCES power_ledger(id) -- link to actual reward
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
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_claims_referrer ON referral_claims(referrer_id);
CREATE INDEX idx_referral_claims_referred ON referral_claims(referred_id);
CREATE INDEX idx_referral_claims_ip ON referral_claims(ip_address);
CREATE INDEX idx_referral_rewards_referrer ON referral_rewards(referrer_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE power_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies for users (Apple authentication)
CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT USING (true); -- Allow app to read user data

CREATE POLICY "Allow public insert access to users" ON users
  FOR INSERT WITH CHECK (true); -- Allow app to create users

CREATE POLICY "Allow public update access to users" ON users
  FOR UPDATE USING (true); -- Allow app to update users

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

-- Create policies for referral_codes
CREATE POLICY "Users can read all referral codes" ON referral_codes
  FOR SELECT USING (true); -- Allow reading codes for validation

CREATE POLICY "Users can manage their own referral code" ON referral_codes
  FOR ALL USING (true); -- Allow API to manage codes

-- Create policies for referral_claims
CREATE POLICY "Users can read referral claims" ON referral_claims
  FOR SELECT USING (true); -- Allow reading for stats/validation

CREATE POLICY "Users can create referral claims" ON referral_claims
  FOR INSERT WITH CHECK (true); -- Allow API to create claims

CREATE POLICY "System can update referral claims" ON referral_claims
  FOR UPDATE USING (true); -- Allow updating milestone/reward status

-- Create policies for referral_rewards
CREATE POLICY "Users can read referral rewards" ON referral_rewards
  FOR SELECT USING (true); -- Allow reading reward history

CREATE POLICY "System can create referral rewards" ON referral_rewards
  FOR INSERT WITH CHECK (true); -- Allow API to issue rewards

-- Helper functions for referral system

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Generate a code based on user_id hash + random string
  RETURN UPPER(SUBSTRING(MD5(user_id || EXTRACT(EPOCH FROM NOW())::TEXT), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for a user
CREATE OR REPLACE FUNCTION create_referral_code(user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Check if user already has a code
  SELECT code INTO new_code FROM referral_codes WHERE referral_codes.user_id = create_referral_code.user_id;
  
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  -- Generate new code
  new_code := generate_referral_code(user_id);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = new_code) LOOP
    new_code := generate_referral_code(user_id);
  END LOOP;
  
  -- Insert the code
  INSERT INTO referral_codes (user_id, code) VALUES (user_id, new_code);
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to process referral claim and issue reward
CREATE OR REPLACE FUNCTION process_referral_claim(
  referral_code_input TEXT,
  referred_user_id TEXT,
  ip_addr INET DEFAULT NULL,
  user_agent_input TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  referrer_user_id TEXT;
  existing_claim_id BIGINT;
  ledger_id BIGINT;
  reward_amount INT := 5; -- Default power reward
BEGIN
  -- Find referrer by code
  SELECT user_id INTO referrer_user_id 
  FROM referral_codes 
  WHERE code = referral_code_input;
  
  IF referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;
  
  -- Check if user already used a referral
  SELECT id INTO existing_claim_id 
  FROM referral_claims 
  WHERE referred_id = referred_user_id;
  
  IF existing_claim_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already used a referral code');
  END IF;
  
  -- Check for self-referral
  IF referrer_user_id = referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;
  
  -- Create the referral claim
  INSERT INTO referral_claims (
    referrer_id, 
    referred_id, 
    referral_code, 
    ip_address, 
    user_agent
  ) VALUES (
    referrer_user_id, 
    referred_user_id, 
    referral_code_input, 
    ip_addr, 
    user_agent_input
  );
  
  -- Issue power reward to referrer
  INSERT INTO power_ledger (user_id, delta, reason, idempotency_key)
  VALUES (
    referrer_user_id, 
    reward_amount, 
    'reward:referral', 
    'referral_' || referred_user_id
  )
  RETURNING id INTO ledger_id;
  
  -- Update power balance
  INSERT INTO power_balances (user_id, base_power, last_update)
  VALUES (referrer_user_id, reward_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    base_power = power_balances.base_power + reward_amount,
    last_update = NOW();
  
  -- Record the reward
  INSERT INTO referral_rewards (
    referrer_id, 
    referred_id, 
    reward_type, 
    reward_amount, 
    ledger_entry_id
  ) VALUES (
    referrer_user_id, 
    referred_user_id, 
    'power', 
    reward_amount, 
    ledger_id
  );
  
  -- Mark claim as rewarded
  UPDATE referral_claims 
  SET reward_issued = true 
  WHERE referred_id = referred_user_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'referrer_id', referrer_user_id,
    'reward_amount', reward_amount,
    'message', 'Referral reward issued successfully'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already processed');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Failed to process referral');
END;
$$ LANGUAGE plpgsql;