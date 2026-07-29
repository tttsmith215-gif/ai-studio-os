// ---------------------------------------------------------------------------
// AI Studio OS — Plugin SDK: Caption Engine Extension Point
// ---------------------------------------------------------------------------
// Caption engines generate subtitles from audio, translate captions,
// or style existing captions. The host uses them in the video editor
// and export pipeline.
// ---------------------------------------------------------------------------

import type { ComponentType } from "react";

// ---------------------------------------------------------------------------
// Caption segment — a single timed subtitle.
// ---------------------------------------------------------------------------
export interface CaptionSegment {
  start: number; // seconds
  end: number;   // seconds
  text: string;
  /** Optional per-word timing for word-level highlighting */
  words?: CaptionWord[];
}

export interface CaptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Caption format — the output format for export.
// ---------------------------------------------------------------------------
export type CaptionFormat =
  | "srt"
  | "vtt"
  | "ass"
  | "ssa"
  | "json"
  | "text";

// ---------------------------------------------------------------------------
// Caption style — visual styling for burned-in captions.
// ---------------------------------------------------------------------------
export interface CaptionStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  position?: "top" | "bottom" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  alignment?: "left" | "center" | "right";
  outline?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

// ---------------------------------------------------------------------------
// Caption engine
// ---------------------------------------------------------------------------
export interface CaptionEngine {
  id: string;
  name: string;
  description?: string;
  /** Languages this engine supports (BCP-47 codes) */
  supportedLanguages?: string[];

  /** Optional config UI */
  SettingsComponent?: ComponentType;

  /** Transcribe audio to captions */
  transcribe(audio: ArrayBuffer, language?: string): Promise<CaptionSegment[]>;

  /** Translate captions to another language */
  translate?(segments: CaptionSegment[], targetLanguage: string): Promise<CaptionSegment[]>;

  /** Format captions for export */
  format(segments: CaptionSegment[], format: CaptionFormat): Promise<string>;

  /** Apply visual styling (for burned-in export) */
  applyStyle?(segments: CaptionSegment[], style: CaptionStyle): CaptionSegment[];
}