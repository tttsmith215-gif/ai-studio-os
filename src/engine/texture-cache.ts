// ─── WebGL2 Texture Cache ────────────────────────────────────────
// LRU cache for GPU textures. Textures are shared across frames so we
// don't re-upload on every render — only when layer content changes.
// ponytail: simple Map + frame-based LRU, proper eviction when memory matters

export interface CachedTexture {
  texture: WebGLTexture;
  width: number;
  height: number;
  lastUsed: number;
}

export class TextureCache {
  private textures = new Map<string, CachedTexture>();
  private maxTextures: number;
  private frameCount = 0;

  constructor(maxTextures = 128) {
    this.maxTextures = maxTextures;
  }

  get(key: string): CachedTexture | undefined {
    const entry = this.textures.get(key);
    if (entry) {
      entry.lastUsed = this.frameCount;
      return entry;
    }
    return undefined;
  }

  set(key: string, texture: WebGLTexture, width: number, height: number): void {
    // Evict oldest if at max
    if (this.textures.size >= this.maxTextures) {
      let oldest: string | null = null;
      let oldestFrame = Infinity;
      for (const [k, v] of this.textures) {
        if (v.lastUsed < oldestFrame) {
          oldestFrame = v.lastUsed;
          oldest = k;
        }
      }
      if (oldest) this.delete(oldest);
    }
    this.textures.set(key, { texture, width, height, lastUsed: this.frameCount });
  }

  delete(key: string): void {
    this.textures.delete(key);
  }

  markFrame(): void {
    this.frameCount++;
  }

  clear(): void {
    this.textures.clear();
  }

  get size(): number {
    return this.textures.size;
  }
}