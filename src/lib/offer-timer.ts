export function offerTimerMinutes(config: unknown): number | null {
  const value = config as { enabled?: boolean; countdown_min?: unknown } | null;
  const minutes = Number(value?.countdown_min);
  return value?.enabled && Number.isFinite(minutes) && minutes > 0 ? Math.min(1440, minutes) : null;
}
export function offerSecondsLeft(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}