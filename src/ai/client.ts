// ─── AI Studio OS: AI Provider Client ────────────────────────────
// Minimal fetch-based client for any OpenAI-compatible API (Ollama, OpenAI, etc.)

export interface AIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIChatRequest {
  messages: AIChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIChatResponse {
  text: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export async function chat(
  endpoint: string,
  model: string,
  req: AIChatRequest,
): Promise<AIChatResponse> {
  const url = endpoint.replace(/\/+$/, "") + "/v1/chat/completions";
  const body = {
    model: req.model || model,
    messages: req.messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? 1024,
    stream: false,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    model: data.model || model,
    usage: data.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
      : undefined,
  };
}

export function buildEndpoint(provider: string, customEndpoint: string): string {
  const defaults: Record<string, string> = {
    ollama: "http://localhost:11434",
    openai: "https://api.openai.com",
    anthropic: "https://api.anthropic.com",
    openrouter: "https://openrouter.ai/api",
  };
  return customEndpoint || defaults[provider] || customEndpoint;
}
