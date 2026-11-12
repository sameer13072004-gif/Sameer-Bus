export interface DateOption {
  isoDate: string;
  dayShort: string;
  dayNumber: string;
  monthShort: string;
  tag?: string;
}

export function getTodayIsoDate(now: Date = new Date()): string {
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

export function buildUpcomingDateOptions(days = 7, now: Date = new Date()): DateOption[] {
  const todayIso = getTodayIsoDate(now);
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

export function formatShortDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function parseTimeToMinutes(timeLabel: string): number | null {
  const match = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'AM') {
    if (hours === 12) hours = 0;
  } else if (period === 'PM') {
    if (hours !== 12) hours += 12;
  }

  return hours * 60 + minutes;
}

export function hasTripDepartedForDate(
  isoDate: string,
  departureTime: string,
  now: Date = new Date()
): boolean {
  const todayIso = getTodayIsoDate(now);
  if (isoDate < todayIso) return true;
  if (isoDate > todayIso) return false;

  const departureMinutes = parseTimeToMinutes(departureTime);
  if (departureMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= departureMinutes;
}

export function formatBoardedTimestamp(timestampMs?: number | null): string {
  if (!timestampMs) return 'Earlier today';
  try {
    return new Date(timestampMs).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Earlier today';
  }
}
