// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Voice Provider Extension Point
// ---------------------------------------------------------------------------
// Voice providers handle text-to-speech and voice cloning. The host uses
// them for voiceover generation, preview playback, and export.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Voice descriptor — a single voice offered by a provider.
// ---------------------------------------------------------------------------
export interface Voice {
  id: string;
  name: string;
  /** Gender / style descriptor for display */
  descriptor?: string;
  /** Language code (BCP-47, e.g. "en-US", "es-ES") */
  language?: string;
  /** Accent / region */
  accent?: string;
  /** Whether this is a cloned/custom voice */
  isCloned?: boolean;
  /** Whether this voice can be used for free */
  isFree?: boolean;
  /** Preview audio URL (for the voice picker) */
  previewUrl?: string;
}

// ---------------------------------------------------------------------------
// TTS request / response
// ---------------------------------------------------------------------------
export interface TTSRequest {
  text: string;
  voice: string;
  speed?: number; // 0.5–2.0
  pitch?: number; // 0.5–2.0
  format?: "mp3" | "wav" | "ogg" | "aac";
}

export interface TTSResponse {
  /** Audio data as ArrayBuffer or blob URL */
  data: ArrayBuffer;
  format: string;
  duration: number; // seconds
}

// ---------------------------------------------------------------------------
// Voice cloning
// ---------------------------------------------------------------------------
export interface VoiceCloneRequest {
  /** Audio samples for cloning (30s–5min recommended) */
  samples: ArrayBuffer[];
  /** Name for the new voice */
  name: string;
  /** Language of the samples */
  language?: string;
}

export interface VoiceCloneResponse {
  voice: Voice;
  /** Estimated time remaining for training */
  eta?: number;
}

// ---------------------------------------------------------------------------
// Voice provider
// ---------------------------------------------------------------------------
export interface VoiceProvider {
  id: string;
  name: string;
  description?: string;
  /** Whether this provider supports voice cloning */
  supportsCloning?: boolean;
  /** Voices available from this provider */
  voices: Voice[];

  /** Optional config UI */
  SettingsComponent?: ComponentType;

  /** Generate speech from text */
  synthesize(request: TTSRequest): Promise<TTSResponse>;
  /** Clone a voice from audio samples */
  cloneVoice?(request: VoiceCloneRequest): Promise<VoiceCloneResponse>;
  /** Get available voices (dynamic — may fetch from API) */
  listVoices?(language?: string): Promise<Voice[]>;
}