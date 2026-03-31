export type AgentId = "cody" | "rex" | "maya" | "nova";

export type AgentRole =
  | "engineer"
  | "revenue"
  | "marketing"
  | "operations";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  role: AgentRole;
  title: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
  capabilities: string[];
}

export interface ContextEnvelope {
  agent: AgentDefinition;
  semanticContext: SemanticContext;
  episodicMemory: EpisodicEntry[];
  conversationHistory: ConversationMessage[];
  timestamp: string;
}

export interface SemanticContext {
  operator: OperatorProfile;
  clients: ClientProfile[];
  products: ProductProfile[];
  rules: Rules;
  frameworks: Record<string, unknown>;
}

export interface OperatorProfile {
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  founder: string;
  principles: string[];
  voice: {
    tone: string;
    style: string;
    rules: string[];
  };
}

export interface ClientProfile {
  id: string;
  name: string;
  industry: string;
  market: string;
  stage: string;
  revenue: string;
  focus: string[];
  status: string;
}

export interface ProductProfile {
  id: string;
  name: string;
  description: string;
  stack: string[];
  status: string;
  url: string | null;
}

export interface Rules {
  engagement: string[];
  pricing: string[];
  delivery: string[];
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId: AgentId;
  timestamp: string;
}

export interface EpisodicEntry {
  id: string;
  agentId: AgentId;
  type: "interaction" | "decision" | "insight" | "task";
  summary: string;
  context: string;
  timestamp: string;
  metadata: Record<string, string>;
}

export interface AgentRequest {
  agentId: AgentId;
  message: string;
  conversationHistory: ConversationMessage[];
}

export interface AgentResponse {
  message: string;
  agentId: AgentId;
  episodicEntry: EpisodicEntry | null;
  timestamp: string;
}

export interface MemoryQueryRequest {
  agentId?: AgentId;
  type?: EpisodicEntry["type"];
  limit?: number;
  search?: string;
}

export interface MemoryWriteRequest {
  entry: Omit<EpisodicEntry, "id" | "timestamp">;
}
