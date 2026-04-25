import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function calculateMinutesBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const dStart = new Date(start);
  const dEnd = new Date(end);
  if (isNaN(dStart.getTime()) || isNaN(dEnd.getTime())) return 0;
  const diffMs = dEnd.getTime() - dStart.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}
