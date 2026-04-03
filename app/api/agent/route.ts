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

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as AgentRequest & { businessContext?: Record<string, string> };

    if (!body.agentId || !isValidAgentId(body.agentId)) {
      return Response.json(
        { error: "Invalid or missing agentId. Valid: cody, rex, maya, nova, priya" },
        { status: 400 }
      );
    }

    if (!body.message || body.message.trim().length === 0) {
      return Response.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const conversationHistory: ConversationMessage[] =
      body.conversationHistory ?? [];

    const envelope = await assembleContext(
      body.agentId,
      conversationHistory,
      body.message
    );

    let systemPrompt = buildSystemPrompt(envelope);

    // Inject user's business context if provided
    if (body.businessContext && Object.values(body.businessContext).some(v => v?.trim())) {
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
        "CRITICAL: Use these SPECIFIC numbers and details in your response. Reference their actual revenue, team size, and challenge. Do NOT give generic advice — run the math on THEIR business.",
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

    const episodicCandidate = extractEpisodicCandidate(
      body.agentId,
      body.message,
      assistantMessage
    );

    let episodicEntry = null;
    if (episodicCandidate) {
      episodicEntry = await addEpisode(episodicCandidate);
    }

    const response: AgentResponse = {
      message: assistantMessage,
      agentId: body.agentId,
      episodicEntry,
      timestamp: new Date().toISOString(),
    };

    return Response.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Agent API error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
