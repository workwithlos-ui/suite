"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type AgentId = "cody" | "rex" | "maya" | "nova" | "priya";

interface BusinessContext {
  companyName: string;
  industry: string;
  monthlyRevenue: string;
  teamSize: string;
  biggestChallenge: string;
  goal: string;
}

const EMPTY_CONTEXT: BusinessContext = {
  companyName: "",
  industry: "",
  monthlyRevenue: "",
  teamSize: "",
  biggestChallenge: "",
  goal: "",
};

const BIZ_FIELDS: { key: keyof BusinessContext; label: string; placeholder: string; type: "text" | "textarea" }[] = [
  { key: "companyName", label: "Company Name", placeholder: "Acme Corp", type: "text" },
  { key: "industry", label: "Industry", placeholder: "SaaS, Home Services, Agency...", type: "text" },
  { key: "monthlyRevenue", label: "Monthly Revenue", placeholder: "$52,000", type: "text" },
  { key: "teamSize", label: "Team Size", placeholder: "4", type: "text" },
  { key: "biggestChallenge", label: "Biggest Challenge Right Now", placeholder: "Client retention — losing 3-4 clients/month, stuck at 25% margins...", type: "textarea" },
  { key: "goal", label: "30-Day Goal", placeholder: "Close 3 new clients, hit $80K MRR, launch new offer...", type: "textarea" },
];

interface AgentInfo {
  id: AgentId;
  name: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId: AgentId;
  timestamp: string;
}

interface EpisodicEntry {
  id: string;
  agentId: AgentId;
  type: "interaction" | "decision" | "insight" | "task";
  summary: string;
  context: string;
  timestamp: string;
}

interface BoardBriefing {
  agentId: AgentId;
  name: string;
  role: string;
  response: string;
}

interface BoardResult {
  briefings: BoardBriefing[];
  synthesis: string;
  question: string;
  tensionPoints: string[];
}

const AGENTS: AgentInfo[] = [
  {
    id: "cody",
    name: "Cody",
    title: "Staff Engineer",
    description: "Architecture, TypeScript, debugging",
    icon: "terminal",
    color: "#06b6d4",
  },
  {
    id: "rex",
    name: "Rex",
    title: "Revenue Architect",
    description: "Pipeline, pricing, deal strategy",
    icon: "trending-up",
    color: "#c8f542",
  },
  {
    id: "maya",
    name: "Maya",
    title: "Growth Strategist",
    description: "Brand, content, growth, positioning",
    icon: "megaphone",
    color: "#a855f7",
  },
  {
    id: "nova",
    name: "Nova",
    title: "Operations Commander",
    description: "Process design, delivery, systems",
    icon: "settings",
    color: "#3b82f6",
  },
  {
    id: "priya",
    name: "Priya",
    title: "Financial Advisor",
    description: "Unit economics, cash flow, pricing",
    icon: "chart-bar",
    color: "#f59e0b",
  },
];

function AgentIcon({ icon, size = 20 }: { icon: string; size?: number }): React.ReactElement {
  const iconPaths: Record<string, React.ReactElement> = {
    terminal: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
    "trending-up": (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    megaphone: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    "chart-bar": (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  };

  return iconPaths[icon] ?? iconPaths.terminal;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMarkdown(text: string): string {
  let html = text;

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  html = html.replace(/\n{2,}/g, "</p><p>");
  html = `<p>${html}</p>`;

  html = html.replace(/<p>\s*(<h[123]>)/g, "$1");
  html = html.replace(/(<\/h[123]>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<pre>)/g, "$1");
  html = html.replace(/(<\/pre>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<ul>)/g, "$1");
  html = html.replace(/(<\/ul>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*(<blockquote>)/g, "$1");
  html = html.replace(/(<\/blockquote>)\s*<\/p>/g, "$1");
  html = html.replace(/<p>\s*<\/p>/g, "");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function TypingIndicator({ agent }: { agent: AgentInfo }): React.ReactElement {
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
      >
        <AgentIcon icon={agent.icon} size={16} />
      </div>
      <div className="flex items-center gap-1.5 pt-2">
        <div className="typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: agent.color }} />
        <div className="typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: agent.color }} />
        <div className="typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: agent.color }} />
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }): React.ReactElement {
  const colorMap: Record<string, { bg: string; text: string }> = {
    interaction: { bg: "#6366f120", text: "#818cf8" },
    decision: { bg: "#f59e0b20", text: "#fbbf24" },
    insight: { bg: "#10b98120", text: "#34d399" },
    task: { bg: "#8b5cf620", text: "#a78bfa" },
  };

  const colors = colorMap[type] ?? colorMap.interaction;

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {type}
    </span>
  );
}

export default function Home(): React.ReactElement {
  const [activeAgent, setActiveAgent] = useState<AgentId>("cody");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [memories, setMemories] = useState<EpisodicEntry[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBoard, setShowBoard] = useState(false);
  const [boardQuestion, setBoardQuestion] = useState("");
  const [boardResult, setBoardResult] = useState<BoardResult | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardMode, setBoardMode] = useState<"brief" | "deep" | "tension">("brief");
  const [bizCtx, setBizCtx] = useState<BusinessContext>(EMPTY_CONTEXT);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkStep, setWalkStep] = useState(0);

  // Load saved business context from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quorum_biz_ctx");
      if (saved) {
        const parsed = JSON.parse(saved) as BusinessContext;
        setBizCtx(parsed);
        setOnboardingDone(true);
      } else {
        const walkthroughSeen = localStorage.getItem("suite_onboarding_seen");
        if (!walkthroughSeen) {
          setShowWalkthrough(true);
        } else {
          setShowOnboarding(true);
        }
      }
    } catch {
      setShowOnboarding(true);
    }
  }, []);

  // Auto-advance walkthrough steps
  useEffect(() => {
    if (!showWalkthrough) return;
    const timer = setInterval(() => {
      setWalkStep((prev) => {
        if (prev >= 2) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [showWalkthrough]);

  const dismissWalkthrough = () => {
    setShowWalkthrough(false);
    setWalkStep(0);
    localStorage.setItem("suite_onboarding_seen", "true");
    setShowOnboarding(true);
  };

  const saveBizCtx = (ctx: BusinessContext) => {
    setBizCtx(ctx);
    setOnboardingDone(true);
    setShowOnboarding(false);
    localStorage.setItem("quorum_biz_ctx", JSON.stringify(ctx));
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentAgent = AGENTS.find((a) => a.id === activeAgent) ?? AGENTS[0];

  const scrollToBottom = useCallback((): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [activeAgent]);

  const fetchMemories = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/memory?limit=50`);
      if (res.ok) {
        const data = (await res.json()) as { episodes: EpisodicEntry[] };
        setMemories(data.episodes);
      }
    } catch {
      // Memory fetch failure is non-critical
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const sendBoardBriefing = async (): Promise<void> => {
    const trimmed = boardQuestion.trim();
    if (!trimmed || boardLoading) return;
    setBoardLoading(true);
    setBoardResult(null);
    try {
      const res = await fetch("/api/board-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, mode: boardMode, businessContext: onboardingDone ? bizCtx : undefined }),
      });
      if (!res.ok) {
        const errData = (await res.json()) as { error: string };
        throw new Error(errData.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as BoardResult;
      setBoardResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Board briefing failed");
    } finally {
      setBoardLoading(false);
    }
  };

  const sendMessage = async (): Promise<void> => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setError(null);

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: trimmed,
      agentId: activeAgent,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const agentMessages = messages.filter((m) => m.agentId === activeAgent);
      const conversationHistory = agentMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agentId: m.agentId,
        timestamp: m.timestamp,
      }));

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: activeAgent,
          message: trimmed,
          conversationHistory,
          businessContext: onboardingDone ? bizCtx : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error: string };
        throw new Error(errorData.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        message: string;
        agentId: AgentId;
        timestamp: string;
      };

      const assistantMessage: Message = {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        content: data.message,
        agentId: activeAgent,
        timestamp: data.timestamp,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      fetchMemories();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to reach agent";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeMessages = messages.filter((m) => m.agentId === activeAgent);
  const agentMemories = memories.filter((m) => m.agentId === activeAgent);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#0a0a12" }}>
      {/* Agent Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r" style={{ borderColor: "#2a2a40", background: "#0e0e1a" }}>
        <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "#2a2a40" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold" style={{ color: "#e8e8f0" }}>ELIOS</h1>
            <p className="text-xs" style={{ color: "#6b7280" }}>Agent OS</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider" style={{ color: "#6b7280" }}>
            Agents
          </p>
          {AGENTS.map((agent) => {
            const isActive = activeAgent === agent.id;
            const agentMsgCount = messages.filter(
              (m) => m.agentId === agent.id && m.role === "assistant"
            ).length;

            return (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent.id)}
                className="group flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all"
                style={{
                  background: isActive ? `${agent.color}15` : "transparent",
                  border: `1px solid ${isActive ? `${agent.color}40` : "transparent"}`,
                  borderLeft: `3px solid ${isActive ? agent.color : "transparent"}`,
                  boxShadow: isActive ? `inset 0 0 20px ${agent.color}08` : "none",
                }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                  style={{
                    backgroundColor: isActive ? `${agent.color}25` : `${agent.color}10`,
                    color: isActive ? agent.color : `${agent.color}99`,
                  }}
                >
                  <AgentIcon icon={agent.icon} size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: isActive ? "#e8e8f0" : "#9ca3af" }}
                    >
                      {agent.name}
                    </span>
                    {agentMsgCount > 0 && (
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                        style={{
                          backgroundColor: `${agent.color}20`,
                          color: agent.color,
                        }}
                      >
                        {agentMsgCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium" style={{ color: isActive ? `${agent.color}cc` : "#6b7280" }}>
                    {agent.title}
                  </p>
                  <p className="truncate text-xs mt-0.5" style={{ color: "#4b5563" }}>
                    {agent.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="border-t p-3 flex flex-col gap-1" style={{ borderColor: "#2a2a40" }}>
          {onboardingDone && bizCtx.companyName && (
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
              style={{ background: "transparent", color: "#6b7280" }}
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {bizCtx.companyName}
              </span>
              <span className="text-xs" style={{ color: "#4b5563" }}>{bizCtx.monthlyRevenue || "edit"}</span>
            </button>
          )}
          <button
            onClick={() => { setShowBoard(!showBoard); if (!showBoard) setShowMemory(false); }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              background: showBoard ? "#f59e0b15" : "transparent",
              color: showBoard ? "#fbbf24" : "#9ca3af",
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Board Briefing
            </span>
          </button>
          <button
            onClick={() => { setShowMemory(!showMemory); if (!showMemory) setShowBoard(false); }}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
            style={{
              background: showMemory ? "#6366f115" : "transparent",
              color: showMemory ? "#818cf8" : "#9ca3af",
            }}
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              Memory
            </span>
            <span className="text-xs" style={{ color: "#6b7280" }}>
              {memories.length}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Agent Header */}
        <header
          className="flex items-center justify-between border-b px-6 py-3"
          style={{ borderColor: "#2a2a40", background: "#0e0e1a" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${currentAgent.color}20`, color: currentAgent.color }}
            >
              <AgentIcon icon={currentAgent.icon} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#e8e8f0" }}>
                {currentAgent.name}
              </h2>
              <p className="text-xs" style={{ color: "#6b7280" }}>
                {currentAgent.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
              style={{ backgroundColor: `${currentAgent.color}15`, color: currentAgent.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: currentAgent.color }} />
              Online
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ background: "#0a0a12" }}>
          {activeMessages.length === 0 && !isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ backgroundColor: `${currentAgent.color}15`, color: currentAgent.color }}
              >
                <AgentIcon icon={currentAgent.icon} size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold" style={{ color: "#e8e8f0" }}>
                  {currentAgent.name}, {currentAgent.title}
                </h3>
                <p className="mt-1 max-w-md text-sm" style={{ color: "#6b7280" }}>
                  {currentAgent.description}. Ready to work.
                </p>
              </div>
              <div className="mt-4 grid max-w-lg grid-cols-2 gap-2">
                {getStarterPrompts(currentAgent.id).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(prompt);
                      inputRef.current?.focus();
                    }}
                    className="rounded-lg border px-3 py-2 text-left text-xs transition-colors hover:border-transparent"
                    style={{
                      borderColor: "#2a2a40",
                      color: "#9ca3af",
                      background: "#12121e",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl py-6">
              {activeMessages.map((msg) => (
                <div key={msg.id} className="px-6 py-3">
                  {msg.role === "user" ? (
                    <div className="flex items-start justify-end gap-3">
                      <div
                        className="max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3"
                        style={{ background: "#1a1a2e" }}
                      >
                        <p className="text-sm leading-relaxed" style={{ color: "#e8e8f0" }}>
                          {msg.content}
                        </p>
                        <p className="mt-1.5 text-right text-xs" style={{ color: "#4b5563" }}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${currentAgent.color}20`,
                          color: currentAgent.color,
                        }}
                      >
                        <AgentIcon icon={currentAgent.icon} size={16} />
                      </div>
                      <div
                        className="max-w-[85%] rounded-xl px-4 py-3"
                        style={{
                          background: "#0f0f1a",
                          borderLeft: `3px solid ${currentAgent.color}`,
                        }}
                      >
                        <div
                          className="prose-agent text-sm leading-relaxed"
                          style={{ color: "#d1d5db" }}
                          dangerouslySetInnerHTML={{
                            __html: renderMarkdown(msg.content),
                          }}
                        />
                        <p className="mt-1.5 text-xs" style={{ color: "#4b5563" }}>
                          {currentAgent.name} &middot; {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && <TypingIndicator agent={currentAgent} />}
              {error && (
                <div className="mx-6 my-3 rounded-lg border px-4 py-3" style={{ borderColor: "#ef444440", background: "#ef444410" }}>
                  <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t px-6 py-4" style={{ borderColor: "#2a2a40", background: "#0e0e1a" }}>
          <div
            className="mx-auto flex max-w-3xl items-end gap-3 rounded-xl border px-4 py-3"
            style={{ borderColor: "#2a2a40", background: "#12121e" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentAgent.name}...`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-gray-600"
              style={{ color: "#e8e8f0", maxHeight: "160px" }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-30"
              style={{
                backgroundColor: input.trim() ? currentAgent.color : "transparent",
                color: input.trim() ? "#ffffff" : "#6b7280",
              }}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-xs" style={{ color: "#4b5563" }}>
            Shift+Enter for new line. Powered by Claude.
          </p>
        </div>
      </main>

      {/* Memory Panel */}
      {showMemory && (
        <aside className="flex w-80 shrink-0 flex-col border-l overflow-hidden" style={{ borderColor: "#2a2a40", background: "#0e0e1a" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#2a2a40" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#e8e8f0" }}>Episodic Memory</h3>
            <button
              onClick={() => setShowMemory(false)}
              className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-gray-300"
              aria-label="Close memory panel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex border-b px-4 py-2" style={{ borderColor: "#2a2a40" }}>
            <div className="flex gap-1">
              {(["all", "interaction", "decision", "insight", "task"] as const).map((filter) => (
                <button
                  key={filter}
                  className="rounded px-2 py-1 text-xs capitalize transition-colors"
                  style={{ color: "#9ca3af", background: "#12121e" }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {agentMemories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: "#1a1a2e" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  No memories for {currentAgent.name} yet.
                </p>
                <p className="mt-1 text-xs" style={{ color: "#4b5563" }}>
                  Memories form as you interact.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {agentMemories.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border p-3"
                    style={{ borderColor: "#2a2a40", background: "#12121e" }}
                  >
                    <div className="flex items-center justify-between">
                      <TypeBadge type={entry.type} />
                      <span className="text-xs" style={{ color: "#4b5563" }}>
                        {new Date(entry.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed" style={{ color: "#d1d5db" }}>
                      {entry.summary}
                    </p>
                    {entry.context && (
                      <p className="mt-1 truncate text-xs" style={{ color: "#6b7280" }}>
                        {entry.context}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: "#2a2a40" }}>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {memories.length} total memories
              </span>
              <span className="text-xs" style={{ color: "#6b7280" }}>
                {agentMemories.length} for {currentAgent.name}
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* Board Briefing Panel */}
      {showBoard && (
        <aside className="flex w-96 shrink-0 flex-col border-l overflow-hidden" style={{ borderColor: "#2a2a40", background: "#0e0e1a" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "#2a2a40" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#e8e8f0" }}>Board Briefing</h3>
            <button
              onClick={() => setShowBoard(false)}
              className="flex h-6 w-6 items-center justify-center rounded text-gray-500 hover:text-gray-300"
              aria-label="Close board panel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Mode selector */}
          <div className="flex border-b px-4 py-2 gap-1" style={{ borderColor: "#2a2a40" }}>
            {(["brief", "deep", "tension"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setBoardMode(m)}
                className="rounded px-2.5 py-1 text-xs capitalize transition-colors"
                style={{
                  color: boardMode === m ? "#fbbf24" : "#9ca3af",
                  background: boardMode === m ? "#f59e0b15" : "#12121e",
                  border: `1px solid ${boardMode === m ? "#f59e0b40" : "transparent"}`,
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Question input */}
          <div className="border-b px-4 py-3" style={{ borderColor: "#2a2a40" }}>
            <textarea
              value={boardQuestion}
              onChange={(e) => setBoardQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendBoardBriefing(); } }}
              placeholder="Ask all 5 agents a strategic question..."
              rows={2}
              className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-600"
              style={{ color: "#e8e8f0", borderColor: "#2a2a40", background: "#12121e" }}
              disabled={boardLoading}
            />
            <button
              onClick={sendBoardBriefing}
              disabled={!boardQuestion.trim() || boardLoading}
              className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-medium transition-all disabled:opacity-30"
              style={{ background: "#f59e0b", color: "#000" }}
            >
              {boardLoading ? "Consulting the board..." : "Run Board Briefing"}
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-3">
            {boardLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <div className="typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  <div className="typing-dot h-2 w-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                </div>
                <p className="text-xs" style={{ color: "#6b7280" }}>5 agents deliberating...</p>
              </div>
            )}

            {boardResult && !boardLoading && (
              <div className="flex flex-col gap-3">
                {/* Synthesis */}
                {boardResult.synthesis && (
                  <div className="rounded-lg border p-3" style={{ borderColor: "#f59e0b40", background: "#f59e0b08" }}>
                    <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#f59e0b" }}>Board Synthesis</p>
                    <div className="text-xs leading-relaxed" style={{ color: "#d1d5db" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(boardResult.synthesis) }} />
                    {boardResult.tensionPoints.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {boardResult.tensionPoints.map((t, i) => (
                          <p key={i} className="text-xs rounded px-2 py-1" style={{ background: "#ef444415", color: "#f87171" }}>
                            ⚡ {t}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Individual briefings */}
                {boardResult.briefings.map((b) => {
                  const agentInfo = AGENTS.find((a) => a.id === b.agentId);
                  const color = agentInfo?.color || "#6b7280";
                  const firstSentence = b.response.split(/[.!?]\s/)[0] + ".";
                  const restOfResponse = b.response.slice(firstSentence.length).trim();
                  return (
                    <div key={b.agentId} className="rounded-lg border p-3" style={{ borderColor: `${color}30`, borderLeft: `4px solid ${color}`, background: "#111118" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          <AgentIcon icon={agentInfo?.icon || "terminal"} size={12} />
                        </div>
                        <span className="text-xs font-semibold" style={{ color }}>{b.name}</span>
                        <span className="text-xs" style={{ color: "#6b7280" }}>{b.role}</span>
                      </div>
                      <p className="text-xs font-semibold mb-1" style={{ color: "#e8e8f0" }}>{firstSentence}</p>
                      {restOfResponse && <div className="text-xs leading-relaxed" style={{ color: "#d1d5db" }} dangerouslySetInnerHTML={{ __html: renderMarkdown(restOfResponse) }} />}
                    </div>
                  );
                })}
              </div>
            )}

            {!boardResult && !boardLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "#1a1a2e" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <p className="text-sm" style={{ color: "#6b7280" }}>Ask a strategic question</p>
                <p className="mt-1 text-xs" style={{ color: "#4b5563" }}>All 5 agents respond from their domain, then synthesis highlights tensions.</p>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Walkthrough Overlay */}
      {showWalkthrough && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(5,5,10,0.95)" }}>
          <div className="w-full max-w-md text-center px-6">
            {walkStep === 0 && (
              <div key="step0">
                <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "#6b7280" }}>Welcome to SUITE</p>
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#e8e8f0" }}>Your Executive Board</h2>
                <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>5 AI executives, each an expert in their domain. Always available. Always opinionated.</p>
                <div className="flex justify-center gap-3 mb-8">
                  {AGENTS.map((a, i) => (
                    <div
                      key={a.id}
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${a.color}20`,
                        color: a.color,
                        opacity: 1,
                        animationDelay: `${i * 200}ms`,
                      }}
                    >
                      <AgentIcon icon={a.icon} size={20} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {walkStep === 1 && (
              <div key="step1">
                <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "#6b7280" }}>Mode 1</p>
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#e8e8f0" }}>1:1 Advice</h2>
                <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>Pick any officer for focused counsel. Rex on revenue. Maya on growth. Cody on architecture. Deep, contextual advice from one expert at a time.</p>
                <div className="mx-auto w-64 rounded-xl border p-4" style={{ borderColor: "#2a2a40", background: "#0e0e1a" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded flex items-center justify-center" style={{ backgroundColor: "#c8f54220", color: "#c8f542" }}>
                      <AgentIcon icon="trending-up" size={12} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#c8f542" }}>Rex</span>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: "#0f0f1a", borderLeft: "3px solid #c8f542" }}>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>Here is your custom pipeline strategy...</p>
                  </div>
                </div>
              </div>
            )}
            {walkStep === 2 && (
              <div key="step2">
                <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: "#6b7280" }}>Mode 2</p>
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#e8e8f0" }}>Board Briefing</h2>
                <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>Get all 5 perspectives at once on any question. They disagree. They debate. You get the full picture.</p>
                <div className="flex justify-center gap-2 mb-4">
                  {AGENTS.map((a) => (
                    <div
                      key={a.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${a.color}25`, color: a.color }}
                    >
                      <AgentIcon icon={a.icon} size={14} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2].map((i) => (
                <button key={i} onClick={() => setWalkStep(i)} className="h-1.5 rounded-full transition-all" style={{ width: walkStep === i ? 24 : 8, backgroundColor: walkStep === i ? "#e8e8f0" : "#2a2a40" }} />
              ))}
            </div>
            <button
              onClick={dismissWalkthrough}
              className="rounded-xl px-8 py-2.5 text-sm font-medium transition-all"
              style={{ background: "#6366f1", color: "#fff" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-xl border p-6" style={{ background: "#0e0e1a", borderColor: "#2a2a40" }}>
            <h2 className="text-lg font-semibold mb-1" style={{ color: "#e8e8f0" }}>Tell the board about your business</h2>
            <p className="text-xs mb-5" style={{ color: "#6b7280" }}>The more context you give, the sharper the advice. Every agent uses this.</p>
            <div className="flex flex-col gap-3">
              {BIZ_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "#9ca3af" }}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={bizCtx[f.key]}
                      onChange={(e) => setBizCtx(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={2}
                      className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-600"
                      style={{ color: "#e8e8f0", borderColor: "#2a2a40", background: "#12121e" }}
                    />
                  ) : (
                    <input
                      value={bizCtx[f.key]}
                      onChange={(e) => setBizCtx(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-600"
                      style={{ color: "#e8e8f0", borderColor: "#2a2a40", background: "#12121e" }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => saveBizCtx(bizCtx)}
                disabled={!bizCtx.companyName.trim()}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-30"
                style={{ background: "#6366f1", color: "#fff" }}
              >
                Start Session
              </button>
              <button
                onClick={() => { setShowOnboarding(false); setOnboardingDone(false); }}
                className="rounded-lg px-4 py-2.5 text-sm font-medium"
                style={{ background: "transparent", color: "#6b7280", border: "1px solid #2a2a40" }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStarterPrompts(agentId: AgentId): string[] {
  const prompts: Record<AgentId, string[]> = {
    cody: [
      "Should I build or buy my tech stack?",
      "How do I architect for scale?",
      "What's the fastest path to an MVP?",
    ],
    rex: [
      "How do I build a $100K/month pipeline?",
      "What pricing model maximizes LTV?",
      "How do I close deals faster?",
    ],
    maya: [
      "What content strategy drives B2B inbound?",
      "How do I build a personal brand that converts?",
      "What's the best organic growth channel?",
    ],
    nova: [
      "How do I scale without hiring?",
      "What processes should I automate first?",
      "How do I reduce client delivery time?",
    ],
    priya: [
      "What's a healthy LTV:CAC ratio for my business?",
      "How should I price my services?",
      "When should I raise prices?",
    ],
  };

  return prompts[agentId];
}
