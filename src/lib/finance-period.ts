export function financePeriod(days: number, now = new Date()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  if (days === -1) { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
  else if (days > 0) start.setDate(start.getDate() - days + 1);
  return { start, end, includes: (date: string) => days === 0 || (new Date(date) >= start && new Date(date) < end) };
}