"use client";
import { useState } from "react";

interface ActedOnButtonProps {
  memoryId: string;
  agentId: string;
  agentColor?: string;
}

export function ActedOnButton({ memoryId, agentId, agentColor = "#c8f542" }: ActedOnButtonProps) {
  const [state, setState] = useState<"idle" | "open" | "saving" | "saved">("idle");
  const [outcome, setOutcome] = useState("");
  const [helpful, setHelpful] = useState(true);

  const save = async () => {
    if (!outcome.trim()) return;
    setState("saving");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "outcome", memoryId, outcome, wasHelpful: helpful }),
      });
      if (res.ok) setState("saved");
      else setState("idle");
    } catch {
      setState("idle");
    }
  };

  if (state === "saved") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: agentColor, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em" }}>
          ✓ {agentId.charAt(0).toUpperCase() + agentId.slice(1)} will remember this
        </span>
      </div>
    );
  }

  if (state === "open" || state === "saving") {
    return (
      <div style={{ marginTop: 10, padding: "12px 14px", background: `${agentColor}0a`, border: `1px solid ${agentColor}25`, borderRadius: 8 }}>
        <p style={{ fontSize: 10, color: agentColor, fontFamily: "monospace", marginBottom: 8, letterSpacing: "0.1em" }}>
          WHAT HAPPENED WHEN YOU ACTED ON THIS?
        </p>
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g. Raised prices 20% — close rate held, revenue up $8K/month"
          rows={2}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none",
            color: "#f0ede8", fontSize: 13, lineHeight: 1.5, resize: "none",
            fontFamily: "DM Sans, sans-serif",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1px solid #1a1a1a" }}>
          <button onClick={() => setHelpful(true)} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, border: `1px solid ${helpful ? agentColor + "60" : "#333"}`, background: helpful ? agentColor + "15" : "transparent", color: helpful ? agentColor : "#555", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}>
            WORKED
          </button>
          <button onClick={() => setHelpful(false)} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 4, border: `1px solid ${!helpful ? "#ff444460" : "#333"}`, background: !helpful ? "#ff444415" : "transparent", color: !helpful ? "#ff6666" : "#555", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}>
            DIDN&apos;T WORK
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setState("idle")} style={{ fontSize: 10, color: "#444", background: "transparent", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={save} disabled={state === "saving" || !outcome.trim()} style={{ fontSize: 10, fontWeight: 700, padding: "4px 14px", borderRadius: 4, background: outcome.trim() ? agentColor : "#222", color: outcome.trim() ? "#050505" : "#444", border: "none", cursor: outcome.trim() ? "pointer" : "not-allowed", fontFamily: "monospace", letterSpacing: "0.08em" }}>
            {state === "saving" ? "SAVING..." : "LOG OUTCOME"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("open")}
      style={{ marginTop: 8, fontSize: 10, color: "#3a3a3a", background: "transparent", border: "1px solid #1e1e1e", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.08em", transition: "all 0.15s" }}
      onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "#555"; (e.target as HTMLElement).style.borderColor = "#333"; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "#3a3a3a"; (e.target as HTMLElement).style.borderColor = "#1e1e1e"; }}
    >
      + I ACTED ON THIS
    </button>
  );
}
