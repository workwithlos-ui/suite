import type { AgentId, EpisodicEntry } from "@/lib/types";

// In-memory episodic store — survives within a single serverless invocation
// and across warm instances, but resets on cold start.
// Future: migrate to Supabase for true persistence.
let _episodes: EpisodicEntry[] = [];

function generateId(): string {
  return `ep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function addEpisode(
  entry: Omit<EpisodicEntry, "id" | "timestamp">
): Promise<EpisodicEntry> {
  const newEntry: EpisodicEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  _episodes.push(newEntry);

  const maxEpisodes = 500;
  if (_episodes.length > maxEpisodes) {
    _episodes = _episodes.slice(_episodes.length - maxEpisodes);
  }

  return newEntry;
}

export async function getEpisodes(filters?: {
  agentId?: AgentId;
  type?: EpisodicEntry["type"];
  limit?: number;
  search?: string;
}): Promise<EpisodicEntry[]> {
  let episodes = [..._episodes];

  if (filters?.agentId) {
    episodes = episodes.filter((e) => e.agentId === filters.agentId);
  }

  if (filters?.type) {
    episodes = episodes.filter((e) => e.type === filters.type);
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    episodes = episodes.filter(
      (e) =>
        e.summary.toLowerCase().includes(searchLower) ||
        e.context.toLowerCase().includes(searchLower)
    );
  }

  episodes.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (filters?.limit) {
    episodes = episodes.slice(0, filters.limit);
  }

  return episodes;
}

export async function getRecentEpisodes(
  agentId: AgentId,
  limit: number = 10
): Promise<EpisodicEntry[]> {
  return getEpisodes({ agentId, limit });
}

export async function deleteEpisode(id: string): Promise<boolean> {
  const index = _episodes.findIndex((e) => e.id === id);
  if (index === -1) return false;
  _episodes.splice(index, 1);
  return true;
}

export async function clearEpisodes(agentId?: AgentId): Promise<number> {
  if (!agentId) {
    const count = _episodes.length;
    _episodes = [];
    return count;
  }

  const before = _episodes.length;
  _episodes = _episodes.filter((e) => e.agentId !== agentId);
  return before - _episodes.length;
}

export async function getEpisodeStats(): Promise<{
  total: number;
  byAgent: Record<string, number>;
  byType: Record<string, number>;
}> {
  const byAgent: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const ep of _episodes) {
    byAgent[ep.agentId] = (byAgent[ep.agentId] ?? 0) + 1;
    byType[ep.type] = (byType[ep.type] ?? 0) + 1;
  }

  return { total: _episodes.length, byAgent, byType };
}
