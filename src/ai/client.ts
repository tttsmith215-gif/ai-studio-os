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
  apiKey?: string,
): Promise<AIChatResponse> {
  return chatStream(endpoint, model, req, undefined, apiKey);
}

export async function chatStream(
  endpoint: string,
  model: string,
  req: AIChatRequest,
  onToken?: (token: string) => void,
  apiKey?: string,
): Promise<AIChatResponse> {
  const url = endpoint.replace(/\/+$/, "") + "/v1/chat/completions";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const body = {
    model: req.model || model,
    messages: req.messages,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? 1024,
    stream: !!onToken,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }

  if (!onToken) {
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model: data.model || model,
      usage: data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined,
    };
  }

  // Streaming: parse SSE from response body
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) {
          fullText += content;
          onToken(content);
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  return { text: fullText, model };
}

export function buildEndpoint(provider: string, customEndpoint: string): string {
  const defaults: Record<string, string> = {
    ollama: "http://localhost:11434",
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
    openrouter: "https://openrouter.ai/api/v1",
  };
  return customEndpoint || defaults[provider] || customEndpoint;
}

export function buildModel(provider: string, customModel: string): string {
  const defaults: Record<string, string> = {
    ollama: "llama3.2",
    openai: "gpt-4o-mini",
    anthropic: "claude-3-haiku-20240307",
    openrouter: "openai/gpt-4o-mini",
  };
  return customModel || defaults[provider] || customModel;
}