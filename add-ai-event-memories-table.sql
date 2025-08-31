-- Add AI Event Memories table to existing database
-- Run this in Supabase SQL editor

CREATE TABLE ai_event_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id),
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  attendee_names TEXT[],
  conversation_summary JSONB,
  outcome JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE ai_event_memories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read their own event memories" ON ai_event_memories
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own event memories" ON ai_event_memories
  FOR INSERT WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_ai_event_memories_user_id ON ai_event_memories(user_id);
CREATE INDEX idx_ai_event_memories_created_at ON ai_event_memories(created_at);