import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
  set,
  get,
  query,
  orderByChild,
  equalTo,
  type Database,
  type Unsubscribe,
} from 'firebase/database';
import {
  HOLD_DURATION_MS,
  PRICE_PER_SEAT,
  type BusRoute,
} from '@/config/busConfig';
import type {
  BookingRecord,
  EffectiveSeatState,
  SeatRecord,
  TripSeatsMap,
} from '@/types/booking';

function normalizeDatabaseUrl(rawUrl?: string, projectId?: string): string {
  const trimmed = (rawUrl ?? '').trim();

  if (trimmed.includes('console.firebase.google.com')) {
    const match = trimmed.match(/\/database\/([^/]+)/);
    if (match?.[1]) {
      return `https://${match[1]}.firebaseio.com`;
    }
  }

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed.replace(/\/+$/, '');
  }

  if (projectId) {
    return `https://${projectId}-default-rtdb.firebaseio.com`;
  }

  return '';
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
const databaseURL = normalizeDatabaseUrl(
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId
);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.databaseURL
  );
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Database | null = null;

export function getRealtimeDb(): Database {
  if (cachedDb) return cachedDb;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase Realtime Database is not configured. Check NEXT_PUBLIC_FIREBASE_* variables in .env.local.'
    );
  }

  cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  cachedDb = getDatabase(cachedApp);
  return cachedDb;
}

export function isSeatEffectivelyAvailable(
  seat: SeatRecord | null | undefined,
  now = Date.now()
): boolean {
  if (!seat) return true;
  if (seat.status === 'available') return true;
  if (seat.status === 'held' && seat.holdExpiresAt && seat.holdExpiresAt < now) {
    return true;
  }
  return false;
}

export function getEffectiveSeatState(
  seat: SeatRecord | null | undefined,
  currentSessionId: string,
  now = Date.now()
): EffectiveSeatState {
  if (!seat || seat.status === 'available') return 'available';
  if (seat.status === 'booked') return 'booked';
  if (seat.status === 'held') {
    if (seat.holdExpiresAt && seat.holdExpiresAt < now) {
      return 'available';
    }
    return seat.heldBy === currentSessionId ? 'selected' : 'held_by_other';
  }
  return 'available';
}

export function subscribeToTripSeats(
  tripId: string,
  onSeatsUpdate: (seats: TripSeatsMap) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const db = getRealtimeDb();
  const tripRef = ref(db, `trips/${tripId}`);

  return onValue(
    tripRef,
    (snapshot) => {
      const val = snapshot.val() as { seats?: TripSeatsMap } | null;
      onSeatsUpdate(val?.seats ?? {});
    },
    (error) => {
      if (onError) onError(error);
    }
  );
}

export interface ToggleSeatResult {
  outcome: 'held' | 'released' | 'conflict_booked' | 'conflict_held';
  holdExpiresAt: number | null;
}

export async function toggleSeatHold(
  tripId: string,
  seatId: string,
  currentSessionId: string
): Promise<ToggleSeatResult> {
  const db = getRealtimeDb();
  const seatRef = ref(db, `trips/${tripId}/seats/${seatId}`);
  const now = Date.now();
  const nextHoldExpiresAt = now + HOLD_DURATION_MS;

  let detectedConflict: 'conflict_booked' | 'conflict_held' | null = null;
  let desiredAction: 'held' | 'released' | null = null;

  const result = await runTransaction(seatRef, (current: SeatRecord | null) => {
    const txNow = Date.now();
    detectedConflict = null;
    desiredAction = null;

    if (current && current.status === 'booked') {
      detectedConflict = 'conflict_booked';
      return undefined; // Abort transaction
    }

    const isExpired =
      current?.status === 'held' &&
      Boolean(current.holdExpiresAt && current.holdExpiresAt < txNow);

    // If currently held by THIS session and NOT expired -> toggle OFF (release)
    if (
      current &&
      current.status === 'held' &&
      current.heldBy === currentSessionId &&
      !isExpired
    ) {
      desiredAction = 'released';
      return {
        status: 'available',
        heldBy: null,
        holdExpiresAt: null,
        bookingId: null,
      } satisfies SeatRecord;
    }

    // If held by another session and NOT expired -> conflict
    if (
      current &&
      current.status === 'held' &&
      current.heldBy !== currentSessionId &&
      !isExpired
    ) {
      detectedConflict = 'conflict_held';
      return undefined; // Abort transaction
    }

    // Available or expired hold -> acquire 5-minute lock
    desiredAction = 'held';
    return {
      status: 'held',
      heldBy: currentSessionId,
      holdExpiresAt: txNow + HOLD_DURATION_MS,
      bookingId: null,
    } satisfies SeatRecord;
  });

  if (!result.committed) {
    return {
      outcome: detectedConflict ?? 'conflict_held',
      holdExpiresAt: null,
    };
  }

  const finalVal = result.snapshot.val() as SeatRecord | null;
  return {
    outcome: desiredAction === 'released' ? 'released' : 'held',
    holdExpiresAt: finalVal?.holdExpiresAt ?? (desiredAction === 'held' ? nextHoldExpiresAt : null),
  };
}

export async function releaseSeatsForSession(
  tripId: string,
  seatIds: string[],
  currentSessionId: string
): Promise<void> {
  if (seatIds.length === 0) return;
  const db = getRealtimeDb();

  await Promise.all(
    seatIds.map((seatId) => {
      const seatRef = ref(db, `trips/${tripId}/seats/${seatId}`);
      return runTransaction(seatRef, (current: SeatRecord | null) => {
        if (!current) return undefined;
        if (current.status === 'held' && current.heldBy === currentSessionId) {
          return {
            status: 'available',
            heldBy: null,
            holdExpiresAt: null,
            bookingId: null,
          } satisfies SeatRecord;
        }
        return undefined;
      });
    })
  );
}

export interface ExtendHoldResult {
  ok: boolean;
  lostSeats: string[];
  newHoldExpiresAt: number;
}

export async function verifyAndExtendHeldSeats(
  tripId: string,
  seatIds: string[],
  currentSessionId: string
): Promise<ExtendHoldResult> {
  const db = getRealtimeDb();
  const extendedUntil = Date.now() + HOLD_DURATION_MS;
  const lostSeats: string[] = [];

  await Promise.all(
    seatIds.map(async (seatId) => {
      const seatRef = ref(db, `trips/${tripId}/seats/${seatId}`);
      const tx = await runTransaction(seatRef, (current: SeatRecord | null) => {
        const txNow = Date.now();
        if (!current || current.status !== 'held') {
          return undefined;
        }
        if (current.heldBy !== currentSessionId) {
          return undefined;
        }
        if (current.holdExpiresAt && current.holdExpiresAt < txNow) {
          return undefined;
        }
        return {
          status: 'held',
          heldBy: currentSessionId,
          holdExpiresAt: txNow + HOLD_DURATION_MS,
          bookingId: null,
        } satisfies SeatRecord;
      });

      if (!tx.committed) {
        lostSeats.push(seatId);
      }
    })
  );

  return {
    ok: lostSeats.length === 0,
    lostSeats,
    newHoldExpiresAt: extendedUntil,
  };
}

const BOOKING_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function createCandidateBookingId(): string {
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * BOOKING_ID_ALPHABET.length);
    code += BOOKING_ID_ALPHABET[idx];
  }
  return `SB-${code}`;
}

export async function generateUniqueBookingId(): Promise<string> {
  const db = getRealtimeDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = createCandidateBookingId();
    const existing = await get(ref(db, `bookings/${candidate}`));
    if (!existing.exists()) {
      return candidate;
    }
  }
  return createCandidateBookingId();
}

export interface FinalizeBookingParams {
  tripId: string;
  date: string;
  route: BusRoute;
  seats: string[];
  passengerName: string;
  passengerPhone: string;
  currentSessionId: string;
  paymentMethod: 'razorpay' | 'demo';
  razorpayPaymentId?: string;
}

export async function finalizeBooking(
  params: FinalizeBookingParams
): Promise<BookingRecord> {
  const db = getRealtimeDb();
  const bookingId = await generateUniqueBookingId();
  const sortedSeats = [...params.seats].sort((a, b) => {
    const rowA = parseInt(a, 10);
    const rowB = parseInt(b, 10);
    if (rowA !== rowB) return rowA - rowB;
    return a.localeCompare(b);
  });

  const bookingData: BookingRecord = {
    bookingId,
    tripId: params.tripId,
    date: params.date,
    routeId: params.route.id,
    routeLabel: params.route.routeLabel,
    originStop: params.route.originStop,
    destinationStop: params.route.destinationStop,
    departureTime: params.route.departureTime,
    arrivalTime: params.route.arrivalTime,
    seats: sortedSeats,
    passengerName: params.passengerName.trim(),
    passengerPhone: params.passengerPhone.trim(),
    amountPaid: sortedSeats.length * PRICE_PER_SEAT,
    pricePerSeat: PRICE_PER_SEAT,
    currency: 'INR',
    paymentMethod: params.paymentMethod,
    ...(params.razorpayPaymentId
      ? { razorpayPaymentId: params.razorpayPaymentId }
      : {}),
    status: 'PAID',
    sessionId: params.currentSessionId,
    createdAt: Date.now(),
  };

  // Mark seats as booked in trips/{tripId}/seats/{seatId}
  await Promise.all(
    sortedSeats.map((seatId) =>
      set(ref(db, `trips/${params.tripId}/seats/${seatId}`), {
        status: 'booked',
        bookingId,
        heldBy: params.currentSessionId,
        holdExpiresAt: null,
      } satisfies SeatRecord)
    )
  );

  // Persist booking record to bookings/{bookingId}
  await set(ref(db, `bookings/${bookingId}`), bookingData);

  return bookingData;
}

export async function getBookingById(
  rawBookingId: string
): Promise<BookingRecord | null> {
  const normalized = rawBookingId.trim().toUpperCase();
  if (!normalized) return null;

  const db = getRealtimeDb();
  const snapshot = await get(ref(db, `bookings/${normalized}`));
  if (!snapshot.exists()) return null;
  return snapshot.val() as BookingRecord;
}

export async function findBookingsByPhone(
  rawPhone: string
): Promise<BookingRecord[]> {
  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length !== 10) return [];

  const db = getRealtimeDb();
  const bookingsRef = ref(db, 'bookings');

  try {
    const indexedQuery = query(
      bookingsRef,
      orderByChild('passengerPhone'),
      equalTo(cleanPhone)
    );
    const snapshot = await get(indexedQuery);
    if (!snapshot.exists()) return [];

    const records = Object.values(snapshot.val() as Record<string, BookingRecord>);
    return records.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Fallback if RTDB security rules do not yet declare ".indexOn": ["passengerPhone"]
    if (message.toLowerCase().includes('index not defined')) {
      const snapshot = await get(bookingsRef);
      if (!snapshot.exists()) return [];
      const all = Object.values(snapshot.val() as Record<string, BookingRecord>);
      return all
        .filter((item) => item?.passengerPhone === cleanPhone)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    throw error;
  }
}
