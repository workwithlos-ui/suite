import { promises as fs } from "fs";
import path from "path";
import type { AgentId, EpisodicEntry } from "@/lib/types";

const MEMORY_DIR = path.join(process.cwd(), ".memory");
const EPISODES_FILE = path.join(MEMORY_DIR, "episodes.json");

async function ensureMemoryDir(): Promise<void> {
  try {
    await fs.access(MEMORY_DIR);
  } catch {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
  }
}

async function readEpisodes(): Promise<EpisodicEntry[]> {
  await ensureMemoryDir();
  try {
    const data = await fs.readFile(EPISODES_FILE, "utf-8");
    return JSON.parse(data) as EpisodicEntry[];
  } catch {
    return [];
  }
}

async function writeEpisodes(episodes: EpisodicEntry[]): Promise<void> {
  await ensureMemoryDir();
  await fs.writeFile(EPISODES_FILE, JSON.stringify(episodes, null, 2), "utf-8");
}

function generateId(): string {
  return `ep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function addEpisode(
  entry: Omit<EpisodicEntry, "id" | "timestamp">
): Promise<EpisodicEntry> {
  const episodes = await readEpisodes();

  const newEntry: EpisodicEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  episodes.push(newEntry);

  const maxEpisodes = 500;
  const trimmedEpisodes =
    episodes.length > maxEpisodes
      ? episodes.slice(episodes.length - maxEpisodes)
      : episodes;

  await writeEpisodes(trimmedEpisodes);
  return newEntry;
}

export async function getEpisodes(filters?: {
  agentId?: AgentId;
  type?: EpisodicEntry["type"];
  limit?: number;
  search?: string;
}): Promise<EpisodicEntry[]> {
  let episodes = await readEpisodes();

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
  const episodes = await readEpisodes();
  const index = episodes.findIndex((e) => e.id === id);

  if (index === -1) {
    return false;
  }

  episodes.splice(index, 1);
  await writeEpisodes(episodes);
  return true;
}

export async function clearEpisodes(agentId?: AgentId): Promise<number> {
  if (!agentId) {
    const episodes = await readEpisodes();
    const count = episodes.length;
    await writeEpisodes([]);
    return count;
  }

  const episodes = await readEpisodes();
  const filtered = episodes.filter((e) => e.agentId !== agentId);
  const removedCount = episodes.length - filtered.length;
  await writeEpisodes(filtered);
  return removedCount;
}

export async function getEpisodeStats(): Promise<{
  total: number;
  byAgent: Record<string, number>;
  byType: Record<string, number>;
}> {
  const episodes = await readEpisodes();

  const byAgent: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const ep of episodes) {
    byAgent[ep.agentId] = (byAgent[ep.agentId] ?? 0) + 1;
    byType[ep.type] = (byType[ep.type] ?? 0) + 1;
  }

  return {
    total: episodes.length,
    byAgent,
    byType,
  };
}
