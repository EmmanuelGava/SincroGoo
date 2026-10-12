export const INSTAGRAM_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isInstagramWindowOpen(
  lastIncomingAt: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!lastIncomingAt) return false;
  const ts = new Date(lastIncomingAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return now.getTime() - ts < INSTAGRAM_REPLY_WINDOW_MS;
}
