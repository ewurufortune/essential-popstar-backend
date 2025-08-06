-- Fix NPC profiles table to handle missing usernames
-- Run this in your Supabase SQL editor

-- Remove NOT NULL constraint from username
ALTER TABLE npc_profiles ALTER COLUMN username DROP NOT NULL;

-- Update any existing NPCs that have null usernames
UPDATE npc_profiles 
SET username = CONCAT('@', LOWER(REPLACE(name, ' ', '')))
WHERE username IS NULL OR username = '';

-- Update any empty fields with defaults
UPDATE npc_profiles 
SET 
  twitter_bio = COALESCE(twitter_bio, ''),
  description = COALESCE(description, ''),
  currently_feeling = COALESCE(currently_feeling, 'neutral'),
  your_relationship = COALESCE(your_relationship, 'stranger'),
  relationship_score = COALESCE(relationship_score, 0)
WHERE twitter_bio IS NULL 
   OR description IS NULL 
   OR currently_feeling IS NULL 
   OR your_relationship IS NULL 
   OR relationship_score IS NULL;