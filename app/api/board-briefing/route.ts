import Anthropic from "@anthropic-ai/sdk";
import type { BoardBriefingRequest, BoardBriefingResponse, AgentId } from "@/lib/types";
import { getAgent, getAllAgents } from "@/lib/agents";
import { getSemanticContext } from "@/lib/memory/semantic";
import { fetchSharedContext, formatContextForPrompt } from "@/lib/shared-context";
import { getActedOnMemories } from "@/lib/memory/agent-memory";

const anthropic = new Anthropic();

interface AgentBriefing {
  agentId: AgentId;
  name: string;
  role: string;
  response: string;
}

async function getAgentBriefing(
  agentId: AgentId,
  question: string,
  businessContext: string,
  mode: "brief" | "deep"
): Promise<AgentBriefing> {
  const agent = getAgent(agentId);
  const maxTokens = mode === "deep" ? 800 : 350;

  const boardInstruction = `BOARD BRIEFING MODE — RULES:
1. Respond ONLY from your domain (${agent.role}). Stay in your lane.
2. Lead with your position immediately. No preamble.
3. You MUST find at least one point of genuine disagreement with the obvious answer.
4. Your value is your UNIQUE perspective — not consensus building.
5. If your domain's answer contradicts what feels easy or obvious, say it.
6. End with ONE specific action item. Not a list.
7. Max 4 sentences in brief mode. Be ruthless about cutting.`;

  const completion = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: maxTokens,
    system: `${agent.systemPrompt}\n\n=== BUSINESS CONTEXT ===\n${businessContext}\n\n${boardInstruction}`,
    messages: [{
      role: "user",
      content: `BOARD BRIEFING: ${question}\n\nRespond from your domain as ${agent.title}. Find the tension. Be specific.`,
    }],
  });

  return {
    agentId,
    name: agent.name,
    role: agent.title,
    response: completion.content[0].type === "text" ? completion.content[0].text : "",
  };
}

async function synthesizeTension(
  question: string,
  briefings: AgentBriefing[]
): Promise<{ synthesis: string; tensionPoints: string[] }> {
  const briefingsText = briefings
    .map((b) => `${b.name} (${b.role}):\n${b.response}`)
    .join("\n\n---\n\n");

  const completion = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 500,
    system: `You are a board chair synthesizing an executive discussion. Your job is to surface genuine tensions — not manufacture false consensus.

RULES:
- Find where board members actually disagree (even implicitly)
- Name the trade-off explicitly: "Rex maximizes revenue but Priya's math shows it increases cash risk"
- Identify the ONE decision the operator must make
- Do not recommend. Frame the decision and its real trade-offs.
- Be specific about the tension, not diplomatically vague.
- 3-5 sentences maximum.`,
    messages: [{
      role: "user",
      content: `QUESTION: ${question}\n\nBOARD RESPONSES:\n${briefingsText}\n\nWhat are they disagreeing about (even implicitly)? What is the one decision that needs to be made?`,
    }],
  });

  const synthesis = completion.content[0].type === "text" ? completion.content[0].text : "";
  const tensionPoints = synthesis
    .split(/[.!?]+/)
    .filter((s) => /but|however|vs\.|tension|trade.off|disagree|conflict|risk|cost/i.test(s))
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 3);

  return { synthesis, tensionPoints };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as BoardBriefingRequest & { businessContext?: Record<string, string> };
    if (!body.question?.trim()) {
      return Response.json({ error: "Question required" }, { status: 400 });
    }

    const mode = body.mode ?? "brief";
    const ctx = getSemanticContext();

    // Fetch ELIOS shared intelligence (proof bank, ICPs, offers, voice)
    const sharedCtx = await fetchSharedContext();
    const sharedBlock = sharedCtx
      ? `\n=== ELIOS SHARED INTELLIGENCE ===\n${formatContextForPrompt(sharedCtx)}\n=== END ===\nUse proof bank entries, real client names, dollar amounts, and specific ICP pain points in your analysis. This is REAL data.`
      : "";

    // Build user's business context block if provided
    const userBizBlock = body.businessContext && Object.values(body.businessContext).some(v => v?.trim())
      ? [
          "\nUSER'S BUSINESS (who you're advising):",
          body.businessContext.companyName ? `Company: ${body.businessContext.companyName}` : "",
          body.businessContext.industry ? `Industry: ${body.businessContext.industry}` : "",
          body.businessContext.monthlyRevenue ? `Monthly Revenue: ${body.businessContext.monthlyRevenue}` : "",
          body.businessContext.teamSize ? `Team Size: ${body.businessContext.teamSize}` : "",
          body.businessContext.biggestChallenge ? `Challenge: ${body.businessContext.biggestChallenge}` : "",
          body.businessContext.goal ? `Goal: ${body.businessContext.goal}` : "",
          "Use these SPECIFIC numbers in your analysis. Run the math on THEIR business.",
        ].filter(Boolean).join("\n")
      : "";

    const businessContext = [
      `Operator: ${ctx.operator.fullName} — ${ctx.operator.description}`,
      `Principles: ${ctx.operator.principles.slice(0, 2).join(" | ")}`,
      ctx.clients.filter((c) => c.status === "active").length > 0
        ? `Active Clients: ${ctx.clients.filter((c) => c.status === "active").map((c) => `${c.name} (${c.industry})`).join(", ")}`
        : "",
      body.context ? `Context: ${body.context}` : "",
      userBizBlock,
      sharedBlock,
    ].filter(Boolean).join("\n");

    const agentIds: AgentId[] = ["rex", "maya", "nova", "priya", "cody"];

    // Inject each agent's proven memories into their briefing context
    const agentMemoryBlocks = await Promise.allSettled(
      agentIds.map(async (id) => {
        try {
          const proven = await getActedOnMemories(id, "default", 3);
          if (!proven.length) return { id, block: "" };
          const block = `\nYOUR PROVEN ADVICE FOR THIS OPERATOR (acted on, confirmed helpful):\n${proven.map(m => `- ${m.key_insight} → ${m.acted_on_result}`).join("\n")}`;
          return { id, block };
        } catch { return { id, block: "" }; }
      })
    );
    const memoryMap: Record<string, string> = {};
    agentMemoryBlocks.forEach(r => {
      if (r.status === "fulfilled") memoryMap[r.value.id] = r.value.block;
    });
    const briefings = await Promise.all(
      agentIds.map((id) => getAgentBriefing(id, body.question, businessContext + (memoryMap[id] ?? ""), mode === "tension" ? "deep" : mode))
    );

    let synthesis = "";
    let tensionPoints: string[] = [];
    if (mode === "deep" || mode === "tension") {
      const result = await synthesizeTension(body.question, briefings);
      synthesis = result.synthesis;
      tensionPoints = result.tensionPoints;
    }

    const response: BoardBriefingResponse = { briefings, synthesis, question: body.question, tensionPoints };
    return Response.json(response);
  } catch (error) {
    console.error("[board-briefing]", error);
    return Response.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
