import { useState, useRef, useEffect } from "react";
import { useStore } from "../store/context";
import { chat, buildEndpoint } from "../ai";
import type { AIChatMessage } from "../ai";

interface AgentDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  systemPrompt: string;
}

const agents: AgentDef[] = [
  {
    id: "motion-assistant",
    name: "Motion Assistant",
    desc: "Helps with keyframes, animations, and motion design",
    icon: "🎬",
    systemPrompt: "You are a motion graphics expert. Help users create animations, keyframes, and motion design. Keep answers concise and practical.",
  },
  {
    id: "script-writer",
    name: "Script Writer",
    desc: "Generates and refines video scripts and narration",
    icon: "✍️",
    systemPrompt: "You are a professional script writer. Help users write, refine, and structure video scripts, narration, and dialog. Be creative and concise.",
  },
  {
    id: "color-pro",
    name: "Color Pro",
    desc: "Suggests color palettes, grading, and design themes",
    icon: "🎨",
    systemPrompt: "You are a color theory expert. Suggest color palettes, grading strategies, and visual design themes. Provide hex codes and rationale.",
  },
];

export function AIAgents() {
  const { state } = useStore();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<Record<string, "idle" | "connecting" | "online" | "offline">>(
    Object.fromEntries(agents.map((a) => [a.id, "idle"])),
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const agent = agents.find((a) => a.id === activeAgent);

  const testConnection = async (agentId: string) => {
    setAgentStatus((prev) => ({ ...prev, [agentId]: "connecting" }));
    try {
      const endpoint = buildEndpoint(state.settings.aiProvider, state.settings.aiEndpoint);
      await chat(endpoint, state.settings.aiModel, {
        messages: [{ role: "user", content: "ping" }],
        maxTokens: 1,
      });
      setAgentStatus((prev) => ({ ...prev, [agentId]: "online" }));
    } catch {
      setAgentStatus((prev) => ({ ...prev, [agentId]: "offline" }));
    }
  };

  const selectAgent = (id: string) => {
    setActiveAgent(id);
    setMessages([]);
    testConnection(id);
  };

  const sendMessage = async () => {
    if (!input.trim() || !agent || loading) return;
    const userMsg: AIChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const endpoint = buildEndpoint(state.settings.aiProvider, state.settings.aiEndpoint);
      const res = await chat(endpoint, state.settings.aiModel, {
        messages: [
          { role: "system", content: agent.systemPrompt },
          ...messages,
          userMsg,
        ],
        temperature: 0.7,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.text }]);
      setAgentStatus((prev) => ({ ...prev, [agent.id]: "online" }));
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ Error: ${err.message}` },
      ]);
      setAgentStatus((prev) => ({ ...prev, [agent.id]: "offline" }));
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "online": return "Online";
      case "connecting": return "Connecting...";
      case "offline": return "Offline";
      default: return "Idle";
    }
  };

  const statusClass = (s: string) => {
    switch (s) {
      case "online": return "badge-success";
      case "connecting": return "badge-warning";
      case "offline": return "";
      default: return "badge-default";
    }
  };

  return (
    <div className="panel-container">
      <div className="panel-header">
        <h1 className="panel-title">AI Agents</h1>
        <p className="panel-subtitle">
          AI assistants · Provider: {state.settings.aiProvider} · Model: {state.settings.aiModel}
        </p>
      </div>

      <div className="panel-grid mb-20">
        {agents.map((a) => (
          <div
            key={a.id}
            className={`panel-card ${activeAgent === a.id ? "theme-card-active" : ""}`}
            onClick={() => selectAgent(a.id)}
          >
            <div className="panel-card-icon" style={{ background: "var(--accent-muted)" }}>{a.icon}</div>
            <div className="panel-card-title">{a.name}</div>
            <div className="panel-card-desc">{a.desc}</div>
            <span className={`badge mt-8 ${statusClass(agentStatus[a.id])}`} style={{ marginTop: 8 }}>
              {statusLabel(agentStatus[a.id])}
            </span>
          </div>
        ))}
      </div>

      {agent && (
        <div className="settings-section" style={{ overflow: "hidden" }}>
          <div className="font-semibold" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)" }}>
            {agent.icon} {agent.name}
          </div>

          <div className="console-panel" style={{ border: "none", borderRadius: 0, height: 300, padding: 12 }}>
            {messages.length === 0 && (
              <div className="text-muted" style={{ textAlign: "center", paddingTop: 60 }}>
                Ask {agent.name} a question about {agent.desc.toLowerCase()}.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className="console-line"
                style={{
                  color: m.role === "assistant" ? undefined : "var(--accent)",
                  marginBottom: 8,
                  whiteSpace: "pre-wrap",
                }}
              >
                <strong>{m.role === "assistant" ? "🤖" : "👤"}</strong> {m.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-8" style={{ padding: "8px 12px", borderTop: "1px solid var(--border-color)" }}>
            <input
              className="input flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Ask ${agent.name}...`}
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}