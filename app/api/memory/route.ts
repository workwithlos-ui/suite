import type { MemoryQueryRequest, MemoryWriteRequest } from "@/lib/types";
import { isValidAgentId } from "@/lib/agents";
import {
  getEpisodes,
  addEpisode,
  deleteEpisode,
  getEpisodeStats,
} from "@/lib/memory/episodic";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const type = searchParams.get("type");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search");
    const stats = searchParams.get("stats");

    if (stats === "true") {
      const episodeStats = await getEpisodeStats();
      return Response.json(episodeStats);
    }

    const filters: MemoryQueryRequest = {};

    if (agentId) {
      if (!isValidAgentId(agentId)) {
        return Response.json(
          { error: "Invalid agentId" },
          { status: 400 }
        );
      }
      filters.agentId = agentId;
    }

    if (type) {
      const validTypes = ["interaction", "decision", "insight", "task"];
      if (!validTypes.includes(type)) {
        return Response.json(
          { error: `Invalid type. Valid: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
      filters.type = type as MemoryQueryRequest["type"];
    }

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return Response.json(
          { error: "Limit must be a positive integer" },
          { status: 400 }
        );
      }
      filters.limit = parsedLimit;
    }

    if (search) {
      filters.search = search;
    }

    const episodes = await getEpisodes(filters);
    return Response.json({ episodes, count: episodes.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as MemoryWriteRequest;

    if (!body.entry) {
      return Response.json(
        { error: "Entry is required" },
        { status: 400 }
      );
    }

    if (!body.entry.agentId || !isValidAgentId(body.entry.agentId)) {
      return Response.json(
        { error: "Valid agentId is required" },
        { status: 400 }
      );
    }

    if (!body.entry.summary || body.entry.summary.trim().length === 0) {
      return Response.json(
        { error: "Summary is required" },
        { status: 400 }
      );
    }

    const episode = await addEpisode(body.entry);
    return Response.json({ episode }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "Episode id is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteEpisode(id);
    if (!deleted) {
      return Response.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
