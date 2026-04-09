-- Run this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/rcekhfscmyuiohxhdkzf/sql

CREATE TABLE IF NOT EXISTS agent_memory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  session_id text,
  operator_id text DEFAULT 'default',
  agent_id text NOT NULL,
  question text,
  key_insight text NOT NULL,
  context text,
  outcome text,
  acted_on boolean DEFAULT false,
  acted_on_result text,
  was_helpful boolean,
  tags text[]
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_operator ON agent_memory(operator_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_acted ON agent_memory(acted_on) WHERE acted_on = true;

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON agent_memory FOR ALL USING (true) WITH CHECK (true);
