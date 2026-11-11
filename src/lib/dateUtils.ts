export interface DateOption {
  isoDate: string;
  dayShort: string;
  dayNumber: string;
  monthShort: string;
  tag?: string;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysIsoDate(baseIsoDate: string, daysToAdd: number): string {
  const [y, m, d] = baseIsoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysToAdd);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildUpcomingDateOptions(days = 7): DateOption[] {
  const todayIso = getTodayIsoDate();
  return Array.from({ length: days }, (_, idx) => {
    const isoDate = addDaysIsoDate(todayIso, idx);
    const [y, m, d] = isoDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    return {
      isoDate,
      dayShort: dateObj.toLocaleDateString('en-IN', { weekday: 'short' }),
      dayNumber: String(d).padStart(2, '0'),
      monthShort: dateObj.toLocaleDateString('en-IN', { month: 'short' }),
      tag: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : undefined,
    };
  });
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCountdown(msRemaining: number): string {
  const clampedSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const mins = Math.floor(clampedSec / 60);
  const secs = clampedSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
