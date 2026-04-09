import Anthropic from "@anthropic-ai/sdk";
import type { AgentRequest, AgentResponse, ConversationMessage } from "@/lib/types";
import { isValidAgentId } from "@/lib/agents";
import {
  assembleContext,
  buildSystemPrompt,
  buildMessages,
  extractEpisodicCandidate,
} from "@/lib/context-engine/assembler";
import { addEpisode } from "@/lib/memory/episodic";
import { fetchSharedContext, formatContextForPrompt } from "@/lib/shared-context";
import {
  getAgentMemories,
  getActedOnMemories,
  formatMemoriesForPrompt,
  saveAgentMemory,
} from "@/lib/memory/agent-memory";

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as AgentRequest & {
      businessContext?: Record<string, string>;
      sessionId?: string;
      operatorId?: string;
    };

    if (!body.agentId || !isValidAgentId(body.agentId)) {
      return Response.json(
        { error: "Invalid or missing agentId. Valid: cody, rex, maya, nova, priya" },
        { status: 400 }
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    const conversationHistory: ConversationMessage[] = body.conversationHistory ?? [];
    const envelope = await assembleContext(body.agentId, conversationHistory, body.message);
    let systemPrompt = buildSystemPrompt(envelope);

    // Layer 1: ELIOS shared intelligence (proof bank, ICPs, offers, voice)
    const sharedCtx = await fetchSharedContext();
    if (sharedCtx) {
      systemPrompt += `\n\n=== ELIOS SHARED INTELLIGENCE ===\n${formatContextForPrompt(sharedCtx)}\n=== END SHARED INTELLIGENCE ===\n\nCRITICAL: Use the proof bank entries, specific client names, dollar amounts, and metrics above in your responses. Reference actual offers with real pricing. Address the specific ICP pain points. This is REAL business data — use it.`;
    }

    // Layer 2: Persistent agent memory — what this agent has learned from this operator
    const operatorId = body.operatorId
      ?? body.businessContext?.companyName?.toLowerCase().replace(/\s+/g, "-")
      ?? "default";

    try {
      const [recentMems, provenMems] = await Promise.all([
        getAgentMemories(body.agentId, operatorId, 8),
        getActedOnMemories(body.agentId, operatorId, 5),
      ]);
      const allMems = [...provenMems, ...recentMems.filter((m) => !m.acted_on)].slice(0, 10);
      if (allMems.length > 0) {
        systemPrompt += formatMemoriesForPrompt(allMems);
      }
    } catch {
      // Memory read failure is non-critical — continue without it
    }

    // Layer 3: User's specific business context
    if (body.businessContext && Object.values(body.businessContext).some((v) => v?.trim())) {
      const bc = body.businessContext;
      const bizBlock = [
        "\n=== USER'S BUSINESS (this is who you're advising) ===",
        bc.companyName ? `Company: ${bc.companyName}` : "",
        bc.industry ? `Industry: ${bc.industry}` : "",
        bc.monthlyRevenue ? `Monthly Revenue: ${bc.monthlyRevenue}` : "",
        bc.teamSize ? `Team Size: ${bc.teamSize}` : "",
        bc.biggestChallenge ? `Biggest Challenge: ${bc.biggestChallenge}` : "",
        bc.goal ? `30-Day Goal: ${bc.goal}` : "",
        "",
        "CRITICAL: Use these SPECIFIC numbers in your response. Run the math on THEIR business. No generic advice.",
      ].filter(Boolean).join("\n");
      systemPrompt += bizBlock;
    }

    const messages = buildMessages(envelope, body.message);

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const assistantMessage =
      completion.content[0].type === "text"
        ? completion.content[0].text
        : "Unable to generate response.";

    // Save this interaction to persistent memory
    let savedMemoryId: string | undefined;
    try {
      const keyInsight = assistantMessage
        .replace(/[#*`]/g, "")
        .split("\n")
        .find((l) => l.trim().length > 30)
        ?.trim()
        .slice(0, 200) ?? assistantMessage.slice(0, 200);

      const saved = await saveAgentMemory({
        agent_id: body.agentId,
        session_id: body.sessionId,
        operator_id: operatorId,
        question: body.message.slice(0, 300),
        key_insight: keyInsight,
        context: body.businessContext
          ? `Company: ${body.businessContext.companyName ?? "unknown"}, Revenue: ${body.businessContext.monthlyRevenue ?? "unknown"}`
          : undefined,
      });
      savedMemoryId = saved?.id;
    } catch {
      // Memory save failure is non-critical
    }

    // Local episodic memory (existing system)
    const episodicCandidate = extractEpisodicCandidate(body.agentId, body.message, assistantMessage);
    let episodicEntry = null;
    if (episodicCandidate) {
      episodicEntry = await addEpisode(episodicCandidate);
    }

    const response: AgentResponse & { memoryId?: string } = {
      message: assistantMessage,
      agentId: body.agentId,
      episodicEntry,
      timestamp: new Date().toISOString(),
      memoryId: savedMemoryId,
    };

    return Response.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Agent API error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
