-- NPC Profiles table for Twitter and Calendar functionality
-- Add this to your existing Supabase schema

-- NPC profiles table
CREATE TABLE npc_profiles (
  id TEXT PRIMARY KEY, -- matches NPC ID from frontend
  name TEXT NOT NULL,
  age_in_2024 INT,
  pronoun TEXT,
  possessive TEXT,
  objective TEXT,
  fans BIGINT DEFAULT 0,
  genre TEXT,
  country TEXT,
  awards INT DEFAULT 0,
  nominations INT DEFAULT 0,
  username TEXT NOT NULL, -- Twitter username (without @)
  twitter_bio TEXT,
  description TEXT,
  currently_feeling TEXT,
  your_relationship TEXT,
  relationship_score INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_npc_profiles_username ON npc_profiles(username);
CREATE INDEX idx_npc_profiles_name ON npc_profiles(name);
CREATE INDEX idx_npc_profiles_genre ON npc_profiles(genre);
CREATE INDEX idx_npc_profiles_relationship_score ON npc_profiles(relationship_score);

-- Enable RLS
ALTER TABLE npc_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading NPC profiles
CREATE POLICY "Anyone can read NPC profiles" ON npc_profiles
  FOR SELECT USING (true);

-- Create policy to allow API to manage NPC profiles
CREATE POLICY "System can manage NPC profiles" ON npc_profiles
  FOR ALL USING (true);

-- Function to update NPC relationship score
CREATE OR REPLACE FUNCTION update_npc_relationship(
  npc_id TEXT,
  score_change INT,
  feeling TEXT DEFAULT NULL,
  relationship TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_score INT;
  new_score INT;
BEGIN
  -- Get current relationship score
  SELECT relationship_score INTO current_score
  FROM npc_profiles WHERE id = npc_id;
  
  IF current_score IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NPC not found');
  END IF;
  
  -- Calculate new score (clamp between -100 and 100)
  new_score := GREATEST(-100, LEAST(100, current_score + score_change));
  
  -- Update the NPC
  UPDATE npc_profiles 
  SET 
    relationship_score = new_score,
    currently_feeling = COALESCE(feeling, currently_feeling),
    your_relationship = COALESCE(relationship, your_relationship),
    updated_at = NOW()
  WHERE id = npc_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'npc_id', npc_id,
    'previous_score', current_score,
    'new_score', new_score,
    'change', score_change
  );
END;
$$ LANGUAGE plpgsql;