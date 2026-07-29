type SaveHandler = (data: string) => Promise<void>;

interface AutoSaveOptions {
  interval: number;
  onSave: SaveHandler;
  onSaved?: () => void;
  onError?: (err: Error) => void;
}

export class AutoSaveManager {
  private interval: number;
  private onSave: SaveHandler;
  private onSaved?: () => void;
  private onError?: (err: Error) => void;
  private timer: ReturnType<typeof setInterval> | null = null;
  private dirty = false;
  private saving = false;
  private lastSaveAt = 0;

  constructor(opts: AutoSaveOptions) {
    this.interval = opts.interval * 1000;
    this.onSave = opts.onSave;
    this.onSaved = opts.onSaved;
    this.onError = opts.onError;
  }

  markDirty(): void { this.dirty = true; }
  isDirty(): boolean { return this.dirty; }
  isSaving(): boolean { return this.saving; }
  secondsSinceLastSave(): number { return (Date.now() - this.lastSaveAt) / 1000; }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  async flush(): Promise<void> {
    if (!this.dirty || this.saving) return;
    await this.save();
  }

  setInterval(seconds: number): void {
    this.interval = seconds * 1000;
    this.stop();
    this.start();
  }

  private async tick(): Promise<void> {
    if (!this.dirty || this.saving) return;
    await this.save();
  }

  private async save(): Promise<void> {
    this.saving = true;
    try {
      await this.onSave(JSON.stringify({ autosavedAt: new Date().toISOString() }));
      this.dirty = false;
      this.lastSaveAt = Date.now();
      this.onSaved?.();
    } catch (err: any) {
      this.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      this.saving = false;
    }
  }
}

export interface AutoSaveStatus {
  dirty: boolean;
  saving: boolean;
  lastSaveSec: number;
  active: boolean;
}

export function getAutoSaveStatus(manager: AutoSaveManager | null): AutoSaveStatus {
  if (!manager) return { dirty: false, saving: false, lastSaveSec: 0, active: false };
  return { dirty: manager.isDirty(), saving: manager.isSaving(), lastSaveSec: manager.secondsSinceLastSave(), active: true };
}