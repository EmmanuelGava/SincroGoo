export const PACING_GAP_MIN_MS = 800;
export const PACING_IDLE_MS = 120_000;
export const PACING_WINDOW_MS = 60_000;
export const PACING_MAX_PER_WINDOW = 20;
export const PACING_DEFER_MIN_MS = 20_000;
export const PACING_GAP_SPAN_MS = 1700;
export const PACING_DEFER_SPAN_MS = 20_000;

export type SendPacingDecision =
  | { action: 'send'; delayMs: number }
  | { action: 'defer'; delayMs: number };

type UserPacingState = {
  lastSentAt: number | null;
  sentAt: number[];
};

export function nextSendDelayMs(
  lastSentAt: number | null,
  now: number = Date.now(),
  random: () => number = Math.random
): number {
  if (!lastSentAt || now - lastSentAt > PACING_IDLE_MS) return 0;
  return PACING_GAP_MIN_MS + Math.floor(random() * PACING_GAP_SPAN_MS);
}

export class SendPacer {
  private readonly states = new Map<string, UserPacingState>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly random: () => number = Math.random
  ) {}

  decide(userId: string): SendPacingDecision {
    const now = this.now();
    const state = this.states.get(userId) ?? { lastSentAt: null, sentAt: [] };
    const recent = state.sentAt.filter((t) => t > now - PACING_WINDOW_MS);

    if (recent.length >= PACING_MAX_PER_WINDOW) {
      return {
        action: 'defer',
        delayMs: PACING_DEFER_MIN_MS + Math.floor(this.random() * PACING_DEFER_SPAN_MS),
      };
    }

    return {
      action: 'send',
      delayMs: nextSendDelayMs(state.lastSentAt, now, this.random),
    };
  }

  recordSent(userId: string): void {
    const now = this.now();
    const prev = this.states.get(userId);
    const sentAt = [...(prev?.sentAt ?? []).filter((t) => t > now - PACING_WINDOW_MS), now];
    this.states.set(userId, { lastSentAt: now, sentAt });
  }
}
