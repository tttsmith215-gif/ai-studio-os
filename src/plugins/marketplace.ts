// ---------------------------------------------------------------------------
// AI Studio OS — Marketplace Registry
// ---------------------------------------------------------------------------
// Connects the App Store to a remote plugin registry, manages featured
// and community plugin listings, and handles discovery.
// ---------------------------------------------------------------------------

import type { PluginManifestFile } from "./manifest-schema";

// ---------------------------------------------------------------------------
// Marketplace listing
// ---------------------------------------------------------------------------
export interface MarketplaceListing {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  category: string;
  tags: string[];
  downloads: number;
  rating: number;
  isFeatured: boolean;
  isVerified: boolean;
  isCommunity: boolean;
  homepage?: string;
  repository?: string;
  license?: string;
  updatedAt: string;
  /** Full manifest (available when loaded) */
  manifest?: PluginManifestFile;
  /** Screenshot URLs */
  screenshots?: string[];
}

// ---------------------------------------------------------------------------
// Marketplace registry
// ---------------------------------------------------------------------------
type SearchCallback = (listings: MarketplaceListing[]) => void;

class MarketplaceRegistry {
  private listings = new Map<string, MarketplaceListing>();
  private searchCallbacks: SearchCallback[] = [];
  private registryUrl = "https://api.ai-studio-os.com/v1/plugins";
  private useLocalFallback = true;

  // -----------------------------------------------------------------------
  // Seed data: built-in known plugins
  // -----------------------------------------------------------------------
  private seedPlugins: MarketplaceListing[] = [
    {
      id: "com.aios.motion-studio",
      name: "Motion Studio",
      description: "Professional motion graphics and animation with keyframe timeline, AI-assisted animation, and export to MP4/GIF.",
      version: "1.0.0",
      author: "AI Studio OS Team",
      icon: "🎬",
      category: "motion",
      tags: ["animation", "keyframe", "motion-graphics"],
      downloads: 15420,
      rating: 4.8,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-07-15",
    },
    {
      id: "com.aios.video-editor",
      name: "Video Editor",
      description: "Multi-track video editing with transitions, trimming, effects, and AI-powered scene detection.",
      version: "0.5.0",
      author: "AI Studio OS Team",
      icon: "🎥",
      category: "video",
      tags: ["video", "editing", "transitions"],
      downloads: 12340,
      rating: 4.6,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-07-10",
    },
    {
      id: "com.aios.thumbnail-studio",
      name: "Thumbnail Studio",
      description: "Design eye-catching thumbnails with smart crop, text overlays, and template presets.",
      version: "0.4.0",
      author: "AI Studio OS Team",
      icon: "🖼️",
      category: "image",
      tags: ["thumbnail", "design", "templates"],
      downloads: 8920,
      rating: 4.5,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-07-08",
    },
    {
      id: "com.aios.image-studio",
      name: "Image Studio",
      description: "Photo editing with filters, adjustments, layers, masking, and AI upscaling.",
      version: "0.6.0",
      author: "AI Studio OS Team",
      icon: "🎨",
      category: "image",
      tags: ["photo", "editing", "filters"],
      downloads: 11030,
      rating: 4.7,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-07-12",
    },
    {
      id: "com.aios.presentation-studio",
      name: "Presentation Studio",
      description: "AI-powered slide decks with transitions, themes, speaker notes, and export to PDF/PPTX.",
      version: "0.2.0",
      author: "AI Studio OS Team",
      icon: "📽️",
      category: "text",
      tags: ["presentation", "slides", "design"],
      downloads: 7650,
      rating: 4.4,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-07-05",
    },
    {
      id: "com.aios.publishing",
      name: "Publishing",
      description: "Export and publish content across platforms — YouTube, Vimeo, and social media.",
      version: "1.0.0",
      author: "AI Studio OS Team",
      icon: "📡",
      category: "manage",
      tags: ["publish", "export", "social"],
      downloads: 5430,
      rating: 4.3,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-07-01",
    },
    {
      id: "com.aios.analytics",
      name: "Analytics",
      description: "Usage insights, render benchmarks, and content performance tracking.",
      version: "1.0.0",
      author: "AI Studio OS Team",
      icon: "📊",
      category: "manage",
      tags: ["analytics", "insights", "metrics"],
      downloads: 4320,
      rating: 4.2,
      isFeatured: true,
      isVerified: true,
      isCommunity: false,
      license: "MIT",
      updatedAt: "2026-06-28",
    },
    // Community plugins
    {
      id: "com.dev.script-writer",
      name: "Script Writer",
      description: "AI-assisted script writing with templates for YouTube, TikTok, and short-form content.",
      version: "0.3.0",
      author: "dev-creative",
      icon: "📝",
      category: "text",
      tags: ["script", "writing", "ai"],
      downloads: 3210,
      rating: 4.1,
      isFeatured: false,
      isVerified: false,
      isCommunity: true,
      repository: "https://github.com/dev-creative/script-writer",
      license: "MIT",
      updatedAt: "2026-06-20",
    },
    {
      id: "com.musiclab.voice-gen",
      name: "Voice Generator",
      description: "Text-to-speech and voice cloning using ElevenLabs and local models.",
      version: "0.4.0",
      author: "MusicLab",
      icon: "🎤",
      category: "audio",
      tags: ["tts", "voice", "clone"],
      downloads: 5670,
      rating: 4.3,
      isFeatured: false,
      isVerified: false,
      isCommunity: true,
      repository: "https://github.com/musiclab/voice-gen",
      license: "MIT",
      updatedAt: "2026-07-02",
    },
    {
      id: "com.beatlab.music-gen",
      name: "Music Generator",
      description: "AI music composition and beat generation for background tracks and intros.",
      version: "0.2.0",
      author: "BeatLab",
      icon: "🎵",
      category: "audio",
      tags: ["music", "beat", "ai"],
      downloads: 2890,
      rating: 3.9,
      isFeatured: false,
      isVerified: false,
      isCommunity: true,
      repository: "https://github.com/beatlab/music-gen",
      license: "MIT",
      updatedAt: "2026-06-15",
    },
    {
      id: "com.socialpilot.scheduler",
      name: "Social Scheduler",
      description: "Schedule and publish content across social media platforms with analytics.",
      version: "0.1.0",
      author: "SocialPilot",
      icon: "📅",
      category: "manage",
      tags: ["social", "schedule", "publish"],
      downloads: 1560,
      rating: 3.7,
      isFeatured: false,
      isVerified: false,
      isCommunity: true,
      repository: "https://github.com/socialpilot/scheduler",
      license: "MIT",
      updatedAt: "2026-06-10",
    },
    {
      id: "com.vfxlab.transition-pack",
      name: "Transition Pack Pro",
      description: "50+ premium video transitions including glitch, morph, light leaks, and 3D flips.",
      version: "1.2.0",
      author: "VFX Lab",
      icon: "✨",
      category: "video",
      tags: ["transitions", "effects", "vfx"],
      downloads: 4230,
      rating: 4.6,
      isFeatured: false,
      isVerified: true,
      isCommunity: true,
      license: "CC-BY-4.0",
      updatedAt: "2026-07-14",
    },
    {
      id: "com.typefoundry.font-manager",
      name: "Font Manager",
      description: "Browse, install, and manage fonts. Preview with live text overlays.",
      version: "0.5.0",
      author: "TypeFoundry",
      icon: "🔤",
      category: "text",
      tags: ["fonts", "typography", "design"],
      downloads: 2340,
      rating: 4.0,
      isFeatured: false,
      isVerified: false,
      isCommunity: true,
      repository: "https://github.com/typefoundry/font-manager",
      license: "MIT",
      updatedAt: "2026-06-25",
    },
    {
      id: "com.aistudio.upscaler",
      name: "AI Upscaler",
      description: "Upscale images and video frames 2x-4x with AI super-resolution models.",
      version: "0.3.0",
      author: "AI Studio Community",
      icon: "🔍",
      category: "image",
      tags: ["upscale", "ai", "super-resolution"],
      downloads: 6780,
      rating: 4.5,
      isFeatured: false,
      isVerified: false,
      isCommunity: true,
      repository: "https://github.com/aistudio-community/upscaler",
      license: "AGPL-3.0",
      updatedAt: "2026-07-11",
    },
  ];

  // -----------------------------------------------------------------------
  // Initialize
  // -----------------------------------------------------------------------
  constructor() {
    for (const plugin of this.seedPlugins) {
      this.listings.set(plugin.id, plugin);
    }
  }

  // -----------------------------------------------------------------------
  // Fetch listings from remote registry
  // -----------------------------------------------------------------------
  async fetchListings(): Promise<MarketplaceListing[]> {
    try {
      const response = await fetch(this.registryUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          for (const plugin of data) {
            this.listings.set(plugin.id, plugin);
          }
        }
      }
    } catch {
      // Fall back to seed data
    }
    return this.getAll();
  }

  // -----------------------------------------------------------------------
  // Get all listings
  // -----------------------------------------------------------------------
  getAll(): MarketplaceListing[] {
    return Array.from(this.listings.values());
  }

  // -----------------------------------------------------------------------
  // Get a single listing
  // -----------------------------------------------------------------------
  get(id: string): MarketplaceListing | undefined {
    return this.listings.get(id);
  }

  // -----------------------------------------------------------------------
  // Get featured listings
  // -----------------------------------------------------------------------
  getFeatured(): MarketplaceListing[] {
    return this.getAll().filter((p) => p.isFeatured);
  }

  // -----------------------------------------------------------------------
  // Get community listings
  // -----------------------------------------------------------------------
  getCommunity(): MarketplaceListing[] {
    return this.getAll().filter((p) => p.isCommunity);
  }

  // -----------------------------------------------------------------------
  // Get verified listings
  // -----------------------------------------------------------------------
  getVerified(): MarketplaceListing[] {
    return this.getAll().filter((p) => p.isVerified);
  }

  // -----------------------------------------------------------------------
  // Search listings
  // -----------------------------------------------------------------------
  search(query: string, category?: string): MarketplaceListing[] {
    const q = query.toLowerCase().trim();
    return this.getAll().filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }

  // -----------------------------------------------------------------------
  // Get by category
  // -----------------------------------------------------------------------
  getByCategory(category: string): MarketplaceListing[] {
    return this.getAll().filter((p) => p.category === category);
  }

  // -----------------------------------------------------------------------
  // Subscribe to search results
  // -----------------------------------------------------------------------
  subscribe(callback: SearchCallback): () => void {
    this.searchCallbacks.push(callback);
    return () => {
      this.searchCallbacks = this.searchCallbacks.filter((c) => c !== callback);
    };
  }

  // -----------------------------------------------------------------------
  // Notify subscribers
  // -----------------------------------------------------------------------
  private notify(listings: MarketplaceListing[]): void {
    for (const cb of this.searchCallbacks) {
      try { cb(listings); } catch {}
    }
  }
}

// Singleton
export const marketplace = new MarketplaceRegistry();