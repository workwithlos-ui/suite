/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import type { AgentId } from '@/lib/types';

let _client: any = null;
function db(): any {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    _client = createClient(url, key);
  }
  return _client;
}

export interface AgentMemory {
  id?: string;
  created_at?: string;
  updated_at?: string;
  session_id?: string;
  operator_id?: string;
  agent_id: AgentId;
  question?: string;
  key_insight: string;
  context?: string;
  outcome?: string;
  acted_on?: boolean;
  acted_on_result?: string;
  was_helpful?: boolean;
  tags?: string[];
}

export async function saveAgentMemory(memory: AgentMemory): Promise<AgentMemory | null> {
  const client = db();
  if (!client) return null;
  try {
    const { data, error } = await client.from('agent_memory').insert([memory]).select().single();
    if (error) { console.warn('[agent_memory] save:', error.message); return null; }
    return data as AgentMemory;
  } catch { return null; }
}

export async function getAgentMemories(agentId: AgentId, operatorId = 'default', limit = 10): Promise<AgentMemory[]> {
  const client = db();
  if (!client) return [];
  try {
    const { data, error } = await client.from('agent_memory').select('*').eq('agent_id', agentId).eq('operator_id', operatorId).order('created_at', { ascending: false }).limit(limit);
    if (error) { console.warn('[agent_memory] read:', error.message); return []; }
    return (data ?? []) as AgentMemory[];
  } catch { return []; }
}

export async function getActedOnMemories(agentId: AgentId, operatorId = 'default', limit = 20): Promise<AgentMemory[]> {
  const client = db();
  if (!client) return [];
  try {
    const { data, error } = await client.from('agent_memory').select('*').eq('agent_id', agentId).eq('operator_id', operatorId).eq('acted_on', true).order('created_at', { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []) as AgentMemory[];
  } catch { return []; }
}

export async function recordOutcome(memoryId: string, outcome: string, wasHelpful: boolean): Promise<boolean> {
  const client = db();
  if (!client) return false;
  try {
    const { error } = await client.from('agent_memory').update({ acted_on: true, acted_on_result: outcome, was_helpful: wasHelpful, updated_at: new Date().toISOString() }).eq('id', memoryId);
    if (error) { console.warn('[agent_memory] outcome:', error.message); return false; }
    return true;
  } catch { return false; }
}

export function formatMemoriesForPrompt(memories: AgentMemory[]): string {
  if (!memories.length) return '';
  const recent = memories.slice(0, 5).map(m => {
    const outcome = m.acted_on && m.acted_on_result
      ? `\n  OUTCOME: ${m.acted_on_result} (${m.was_helpful ? 'helpful' : 'not helpful'})`
      : '';
    return `[${new Date(m.created_at!).toLocaleDateString()}] ${m.key_insight}${outcome}`;
  }).join('\n');

  const actedOn = memories.filter(m => m.acted_on && m.was_helpful).slice(0, 3);
  const proven = actedOn.length
    ? '\nPROVEN ADVICE (operator acted on this and it worked):\n' +
      actedOn.map(m => `- ${m.key_insight} → ${m.acted_on_result}`).join('\n')
    : '';

  return `\n=== YOUR MEMORY WITH THIS OPERATOR ===\nRecent interactions:\n${recent}${proven}\n`;
}
