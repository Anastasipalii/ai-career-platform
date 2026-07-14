// ============================================================================
// monitoring/polling — a tiny, testable auto-refresh interval controller
// ----------------------------------------------------------------------------
// Guarantees at most ONE active interval (no duplicate timers on repeated
// start), and clean teardown on stop. Timer primitives are injectable so the
// behaviour can be unit-tested without real time. Pure logic; no React, no
// Supabase. It only schedules a callback — it never deletes any data.
// ============================================================================

type IntervalId = ReturnType<typeof setInterval>;

export interface PollingDeps {
  setInterval?: (fn: () => void, ms: number) => IntervalId;
  clearInterval?: (id: IntervalId) => void;
}

export class PollingController {
  private id: IntervalId | null = null;
  private readonly intervalMs: number;
  private readonly onTick: () => void;
  private readonly _set: (fn: () => void, ms: number) => IntervalId;
  private readonly _clear: (id: IntervalId) => void;

  constructor(intervalMs: number, onTick: () => void, deps: PollingDeps = {}) {
    this.intervalMs = intervalMs;
    this.onTick = onTick;
    this._set = deps.setInterval ?? ((fn, ms) => setInterval(fn, ms));
    this._clear = deps.clearInterval ?? ((id) => clearInterval(id));
  }

  isRunning(): boolean {
    return this.id !== null;
  }

  /** Start ticking. Calling start again while already running is a no-op — it
   *  never creates a second timer. */
  start(): void {
    if (this.id !== null) return;
    this.id = this._set(() => this.onTick(), this.intervalMs);
  }

  /** Stop ticking and release the timer. Safe to call when already stopped. */
  stop(): void {
    if (this.id === null) return;
    this._clear(this.id);
    this.id = null;
  }
}
