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
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  HOLD_DURATION_MS,
  PRICE_PER_SEAT,
  type BusRoute,
} from '@/config/busConfig';
import type {
  AuthUserProfile,
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
let cachedAuth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Check NEXT_PUBLIC_FIREBASE_* variables in .env.local.'
    );
  }
  cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getRealtimeDb(): Database {
  if (cachedDb) return cachedDb;
  cachedDb = getDatabase(getFirebaseApp());
  return cachedDb;
}

export function getFirebaseAuthInstance(): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = getAuth(getFirebaseApp());
  return cachedAuth;
}

function toAuthProfile(user: User | null): AuthUserProfile | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

function formatAuthError(error: unknown): Error {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new Error('Sign-in popup was closed before completing.');
    case 'auth/popup-blocked':
      return new Error('Pop-up blocked by browser. Please allow pop-ups and try again.');
    case 'auth/operation-not-allowed':
      return new Error(
        'This sign-in method is not enabled yet in Firebase Authentication Console.'
      );
    case 'auth/unauthorized-domain':
      return new Error(
        'This domain is not authorized in Firebase Authentication settings.'
      );
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new Error('Incorrect email or password. Please check and try again.');
    case 'auth/invalid-email':
      return new Error('Please enter a valid email address.');
    case 'auth/email-already-in-use':
      return new Error('An account already exists with this email. Use Sign In instead.');
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters long.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Please wait a minute and try again.');
    default:
      return error instanceof Error
        ? error
        : new Error('Unable to sign in right now. Please try again.');
  }
}

export function subscribeToAuth(
  onUserChange: (user: AuthUserProfile | null) => void
): () => void {
  if (!isFirebaseConfigured()) {
    onUserChange(null);
    return () => {};
  }
  const auth = getFirebaseAuthInstance();
  return onAuthStateChanged(auth, (user) => {
    onUserChange(toAuthProfile(user));
  });
}

export async function signInWithGoogle(): Promise<AuthUserProfile> {
  try {
    const auth = getFirebaseAuthInstance();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const profile = toAuthProfile(credential.user);
    if (!profile) {
      throw new Error('Google sign-in did not return an account.');
    }
    return profile;
  } catch (error) {
    throw formatAuthError(error);
  }
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthUserProfile> {
  try {
    const auth = getFirebaseAuthInstance();
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = toAuthProfile(credential.user);
    if (!profile) {
      throw new Error('Sign-in failed.');
    }
    return profile;
  } catch (error) {
    throw formatAuthError(error);
  }
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUserProfile> {
  try {
    const auth = getFirebaseAuthInstance();
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && displayName.trim().length > 0) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    const profile = toAuthProfile(credential.user);
    if (!profile) {
      throw new Error('Account creation failed.');
    }
    return profile;
  } catch (error) {
    throw formatAuthError(error);
  }
}

export async function logoutAccount(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const auth = getFirebaseAuthInstance();
  await signOut(auth);
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
      return undefined;
    }

    const isExpired =
      current?.status === 'held' &&
      Boolean(current.holdExpiresAt && current.holdExpiresAt < txNow);

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

    if (
      current &&
      current.status === 'held' &&
      current.heldBy !== currentSessionId &&
      !isExpired
    ) {
      detectedConflict = 'conflict_held';
      return undefined;
    }

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
    holdExpiresAt:
      finalVal?.holdExpiresAt ??
      (desiredAction === 'held' ? nextHoldExpiresAt : null),
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
  userId?: string | null;
  userEmail?: string | null;
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
    ...(params.userId ? { userId: params.userId } : {}),
    ...(params.userEmail ? { userEmail: params.userEmail } : {}),
    status: 'PAID',
    boarded: false,
    boardedAt: null,
    sessionId: params.currentSessionId,
    createdAt: Date.now(),
  };

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

export interface MarkBoardedResult {
  outcome: 'marked_boarded' | 'already_boarded' | 'not_found';
  booking: BookingRecord | null;
}

export async function markBookingAsBoarded(
  rawBookingId: string
): Promise<MarkBoardedResult> {
  const bookingId = rawBookingId.trim().toUpperCase();
  if (!bookingId) return { outcome: 'not_found', booking: null };

  const db = getRealtimeDb();
  const existing = await getBookingById(bookingId);
  if (!existing) {
    return { outcome: 'not_found', booking: null };
  }
  if (existing.boarded === true) {
    return { outcome: 'already_boarded', booking: existing };
  }

  const boardedRef = ref(db, `bookings/${bookingId}/boarded`);
  const tx = await runTransaction(boardedRef, (current: boolean | null) => {
    if (current === true) {
      return undefined; // Abort: already boarded
    }
    return true;
  });

  if (!tx.committed) {
    const latest = await getBookingById(bookingId);
    return { outcome: 'already_boarded', booking: latest };
  }

  const boardedAt = Date.now();
  await set(ref(db, `bookings/${bookingId}/boardedAt`), boardedAt);

  return {
    outcome: 'marked_boarded',
    booking: {
      ...existing,
      boarded: true,
      boardedAt,
    },
  };
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

export async function findBookingsByUserId(
  userId: string
): Promise<BookingRecord[]> {
  if (!userId.trim()) return [];

  const db = getRealtimeDb();
  const bookingsRef = ref(db, 'bookings');

  try {
    const indexedQuery = query(
      bookingsRef,
      orderByChild('userId'),
      equalTo(userId)
    );
    const snapshot = await get(indexedQuery);
    if (!snapshot.exists()) return [];

    const records = Object.values(snapshot.val() as Record<string, BookingRecord>);
    return records.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('index not defined')) {
      const snapshot = await get(bookingsRef);
      if (!snapshot.exists()) return [];
      const all = Object.values(snapshot.val() as Record<string, BookingRecord>);
      return all
        .filter((item) => item?.userId === userId)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    throw error;
  }
}
