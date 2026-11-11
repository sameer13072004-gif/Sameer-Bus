import type { BookingRecord } from '@/types/booking';

const SESSION_ID_KEY = 'sameer_bus_session_id';
const BOOKINGS_STORAGE_KEY = 'sameer_bus_bookings';
const BOOKINGS_UPDATED_EVENT = 'sameer-bus-bookings-updated';

let cachedRawBookings: string | null = null;
let cachedParsedBookings: BookingRecord[] = [];
const EMPTY_BOOKINGS: BookingRecord[] = [];

function generateRandomToken(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';

  try {
    const existing = window.localStorage.getItem(SESSION_ID_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }

    const generated =
      typeof window.crypto?.randomUUID === 'function'
        ? `sb_${window.crypto.randomUUID()}`
        : `sb_${Date.now()}_${generateRandomToken(12)}`;

    window.localStorage.setItem(SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return `sb_ephemeral_${Date.now()}_${generateRandomToken(8)}`;
  }
}

export function getSavedBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return EMPTY_BOOKINGS;

  try {
    const raw = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (raw === cachedRawBookings) {
      return cachedParsedBookings;
    }

    cachedRawBookings = raw;
    if (!raw) {
      cachedParsedBookings = EMPTY_BOOKINGS;
      return cachedParsedBookings;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedParsedBookings = EMPTY_BOOKINGS;
      return cachedParsedBookings;
    }

    cachedParsedBookings = parsed
      .filter((item): item is BookingRecord => Boolean(item && item.bookingId))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    return cachedParsedBookings;
  } catch {
    return EMPTY_BOOKINGS;
  }
}

export function getEmptyBookingsSnapshot(): BookingRecord[] {
  return EMPTY_BOOKINGS;
}

export function subscribeSavedBookings(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === BOOKINGS_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(BOOKINGS_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(BOOKINGS_UPDATED_EVENT, callback);
  };
}

export function saveBookingLocally(booking: BookingRecord): BookingRecord[] {
  if (typeof window === 'undefined') return [booking];

  try {
    const existing = getSavedBookings();
    const deduped = [
      booking,
      ...existing.filter((item) => item.bookingId !== booking.bookingId),
    ];
    const serialized = JSON.stringify(deduped);
    cachedRawBookings = serialized;
    cachedParsedBookings = deduped;
    window.localStorage.setItem(BOOKINGS_STORAGE_KEY, serialized);
    window.dispatchEvent(new Event(BOOKINGS_UPDATED_EVENT));
    return deduped;
  } catch {
    return [booking];
  }
}
