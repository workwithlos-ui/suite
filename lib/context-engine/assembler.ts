import type {
  AgentId,
  ContextEnvelope,
  ConversationMessage,
} from "@/lib/types";
import { getAgent } from "@/lib/agents";
import { getSemanticContext, searchSemanticContext } from "@/lib/memory/semantic";
import { getRecentEpisodes } from "@/lib/memory/episodic";

export async function assembleContext(
  agentId: AgentId,
  conversationHistory: ConversationMessage[],
  currentMessage: string
): Promise<ContextEnvelope> {
  const agent = getAgent(agentId);
  const semanticContext = getSemanticContext();
  const episodicMemory = await getRecentEpisodes(agentId, 15);

  return {
    agent,
    semanticContext,
    episodicMemory,
    conversationHistory,
    timestamp: new Date().toISOString(),
  };
}

export function buildSystemPrompt(envelope: ContextEnvelope): string {
  const { agent, semanticContext, episodicMemory } = envelope;

  const operatorContext = [
    `You are part of ${semanticContext.operator.fullName}.`,
    `Tagline: "${semanticContext.operator.tagline}"`,
    `Mission: ${semanticContext.operator.description}`,
    "",
    "OPERATOR PRINCIPLES:",
    ...semanticContext.operator.principles.map((p, i) => `${i + 1}. ${p}`),
    "",
    "VOICE RULES:",
    ...semanticContext.operator.voice.rules.map((r) => `- ${r}`),
  ].join("\n");

  const clientContext = semanticContext.clients
    .filter((c) => c.status === "active")
    .map(
      (c) =>
        `- ${c.name}: ${c.industry} | ${c.market} | ${c.stage} stage | Revenue: ${c.revenue} | Focus: ${c.focus.join(", ")}`
    )
    .join("\n");

  const productContext = semanticContext.products
    .map(
      (p) =>
        `- ${p.name}: ${p.description} | Status: ${p.status}${p.url ? ` | ${p.url}` : ""}`
    )
    .join("\n");

  const episodicContext =
    episodicMemory.length > 0
      ? episodicMemory
          .slice(0, 10)
          .map(
            (e) =>
              `[${e.type.toUpperCase()}] ${e.summary} (${new Date(e.timestamp).toLocaleDateString()})`
          )
          .join("\n")
      : "No prior interactions recorded.";

  const ruleContext = [
    "ENGAGEMENT RULES:",
    ...semanticContext.rules.engagement.map((r) => `- ${r}`),
    "",
    "DELIVERY RULES:",
    ...semanticContext.rules.delivery.map((r) => `- ${r}`),
  ].join("\n");

  return [
    agent.systemPrompt,
    "",
    "=== OPERATOR CONTEXT ===",
    operatorContext,
    "",
    "=== ACTIVE CLIENTS ===",
    clientContext,
    "",
    "=== PRODUCTS & PLATFORMS ===",
    productContext,
    "",
    "=== RECENT MEMORY ===",
    episodicContext,
    "",
    "=== RULES ===",
    ruleContext,
    "",
    `Current date: ${new Date().toISOString().split("T")[0]}`,
    `Current time: ${new Date().toLocaleTimeString()}`,
  ].join("\n");
}

export function buildMessages(
  envelope: ContextEnvelope,
  currentMessage: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const historyMessages = envelope.conversationHistory
    .slice(-20)
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

  return [...historyMessages, { role: "user" as const, content: currentMessage }];
}

export function extractEpisodicCandidate(
  agentId: AgentId,
  userMessage: string,
  assistantResponse: string
): {
  agentId: AgentId;
  type: "interaction" | "decision" | "insight" | "task";
  summary: string;
  context: string;
  metadata: Record<string, string>;
} | null {
  const lowerMessage = userMessage.toLowerCase();

  const isDecision =
    lowerMessage.includes("decide") ||
    lowerMessage.includes("choose") ||
    lowerMessage.includes("which") ||
    lowerMessage.includes("should we");

  const isTask =
    lowerMessage.includes("build") ||
    lowerMessage.includes("create") ||
    lowerMessage.includes("implement") ||
    lowerMessage.includes("deploy") ||
    lowerMessage.includes("fix");

  const isInsight =
    lowerMessage.includes("why") ||
    lowerMessage.includes("analyze") ||
    lowerMessage.includes("what if") ||
    lowerMessage.includes("insight");

  let type: "interaction" | "decision" | "insight" | "task" = "interaction";
  if (isDecision) type = "decision";
  else if (isTask) type = "task";
  else if (isInsight) type = "insight";

  const summary =
    userMessage.length > 120
      ? userMessage.substring(0, 117) + "..."
      : userMessage;

  const responsePreview =
    assistantResponse.length > 200
      ? assistantResponse.substring(0, 197) + "..."
      : assistantResponse;

  return {
    agentId,
    type,
    summary,
    context: responsePreview,
    metadata: {
      messageLength: String(userMessage.length),
      responseLength: String(assistantResponse.length),
    },
  };
}
