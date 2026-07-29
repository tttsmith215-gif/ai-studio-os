// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: AI Provider Extension Point
// ---------------------------------------------------------------------------
// AI providers wrap LLM/GenAI services (local or remote). The host uses
// them for: text generation, image generation, video generation, captioning,
// upscaling, inpainting, etc.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Model descriptor — a single model offered by a provider.
// ---------------------------------------------------------------------------
export interface AIModel {
  id: string;
  name: string;
  /** Capabilities this model supports */
  capabilities: AICapability[];
  /** Context window in tokens, if known */
  contextWindow?: number;
  /** Whether this model is a "fast/cheap" model suitable for real-time use */
  isFast?: boolean;
  /** Whether this model is multimodal (vision) */
  multimodal?: boolean;
  /** Pricing info (display only) */
  pricing?: { input: string; output: string };
}

export type AICapability =
  | "text-generation"
  | "image-generation"
  | "video-generation"
  | "audio-generation"
  | "image-understanding"
  | "image-editing"
  | "image-upscale"
  | "inpainting"
  | "outpainting"
  | "captioning"
  | "transcription"
  | "translation"
  | "embedding"
  | "custom";

// ---------------------------------------------------------------------------
// Request/response types for each capability.
// ---------------------------------------------------------------------------
export interface AITextRequest {
  prompt: string;
  systemPrompt?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  images?: string[]; // data URIs or URLs (for multimodal)
}

export interface AITextResponse {
  text: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AIImageRequest {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  count?: number;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
}

export interface AIImageResponse {
  images: string[]; // data URIs
  seed?: number;
}

export interface AIVideoRequest {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  duration?: number; // seconds
  fps?: number;
  seed?: number;
}

export interface AIVideoResponse {
  /** URL or file path to the generated video */
  url: string;
  duration: number;
}

// ---------------------------------------------------------------------------
// Streaming callbacks
// ---------------------------------------------------------------------------
export interface AIStreamCallbacks {
  onToken(token: string): void;
  onDone(): void;
  onError(error: Error): void;
}

// ---------------------------------------------------------------------------
// AI provider — wraps a service (Ollama, OpenAI-compatible, local model, etc.)
// ---------------------------------------------------------------------------
export interface AIProvider {
  id: string;
  name: string;
  description?: string;
  /** Whether this provider can be configured per-endpoint (e.g. Ollama) */
  configurableEndpoint?: boolean;
  /** Default endpoint URL, if applicable */
  defaultEndpoint?: string;
  /** Models offered by this provider */
  models: AIModel[];

  /** Optional config UI shown in Settings */
  SettingsComponent?: ComponentType;

  /** Capability methods — a provider implements the ones it supports */
  generateText?(request: AITextRequest): Promise<AITextResponse>;
  generateTextStream?(request: AITextRequest, callbacks: AIStreamCallbacks): Promise<void>;
  generateImage?(request: AIImageRequest): Promise<AIImageResponse>;
  generateVideo?(request: AIVideoRequest): Promise<AIVideoResponse>;
  /** Custom capability — for future or provider-specific features */
  custom?(capability: string, params: Record<string, unknown>): Promise<unknown>;
}