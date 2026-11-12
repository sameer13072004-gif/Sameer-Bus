'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  AlertTriangle,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  BRAND_NAME,
  CURRENCY_SYMBOL,
  STAFF_VERIFY_PIN,
} from '@/config/busConfig';
import {
  formatBoardedTimestamp,
  formatDisplayDate,
} from '@/lib/dateUtils';
import { getBookingById, markBookingAsBoarded } from '@/lib/firebase';
import type { BookingRecord } from '@/types/booking';

interface StaffVerifyViewProps {
  initialBookingId?: string;
  expectedSeatCount?: number | null;
}

const STAFF_PIN_STORAGE_KEY = 'sameer_bus_staff_pin_verified';
const STAFF_PIN_EVENT = 'sameer-bus-staff-pin-changed';

function subscribeStaffAuth(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STAFF_PIN_STORAGE_KEY) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(STAFF_PIN_EVENT, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(STAFF_PIN_EVENT, callback);
  };
}

function getStaffUnlockedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STAFF_PIN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function normalizeBookingId(rawId: string): string {
  const trimmed = rawId.trim().toUpperCase();
  if (!trimmed) return '';
  return trimmed.startsWith('SB-') ? trimmed : `SB-${trimmed}`;
}

export function StaffVerifyView({
  initialBookingId = '',
  expectedSeatCount = null,
}: StaffVerifyViewProps) {
  const isStaffUnlocked = useSyncExternalStore(
    subscribeStaffAuth,
    getStaffUnlockedSnapshot,
    () => false
  );

  const normalizedInitialId = normalizeBookingId(initialBookingId);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [bookingIdInput, setBookingIdInput] = useState(normalizedInitialId);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isMarkingBoarded, setIsMarkingBoarded] = useState(false);

  const [lookupResult, setLookupResult] = useState<{
    checkedId: string;
    booking: BookingRecord | null;
    error: string | null;
  }>({
    checkedId: '',
    booking: null,
    error: null,
  });

  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Automatic initial lookup when opening /staff-verify?id=SB-XXXXXX (no synchronous setState inside effect)
  useEffect(() => {
    if (!isStaffUnlocked || !normalizedInitialId) return;

    let cancelled = false;
    getBookingById(normalizedInitialId)
      .then((record) => {
        if (cancelled) return;
        setLookupResult({
          checkedId: normalizedInitialId,
          booking: record,
          error: record
            ? null
            : `No ticket found for Booking ID "${normalizedInitialId}".`,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setLookupResult({
          checkedId: normalizedInitialId,
          booking: null,
          error:
            err instanceof Error
              ? err.message
              : 'Unable to check database right now.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isStaffUnlocked, normalizedInitialId]);

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeBookingId(bookingIdInput);
    if (!normalized) {
      setLookupResult({
        checkedId: '',
        booking: null,
        error: 'Enter a Booking ID (e.g. SB-8K4P9Q).',
      });
      return;
    }

    setBookingIdInput(normalized);
    setActionBanner(null);
    setIsManualLoading(true);

    try {
      const record = await getBookingById(normalized);
      setLookupResult({
        checkedId: normalized,
        booking: record,
        error: record
          ? null
          : `No ticket found for Booking ID "${normalized}".`,
      });
    } catch (err) {
      setLookupResult({
        checkedId: normalized,
        booking: null,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to check database right now.',
      });
    } finally {
      setIsManualLoading(false);
    }
  };

  const unlockWithPin = (candidate: string) => {
    if (candidate === STAFF_VERIFY_PIN) {
      try {
        window.localStorage.setItem(STAFF_PIN_STORAGE_KEY, 'true');
        window.dispatchEvent(new Event(STAFF_PIN_EVENT));
      } catch {
        // Fallback ignored
      }
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('Incorrect 4-digit Staff PIN. Try again.');
    }
  };

  const handleLockDevice = () => {
    try {
      window.localStorage.removeItem(STAFF_PIN_STORAGE_KEY);
      window.dispatchEvent(new Event(STAFF_PIN_EVENT));
    } catch {
      // Ignore storage error
    }
    setLookupResult({ checkedId: '', booking: null, error: null });
    setActionBanner(null);
  };

  const handleMarkBoarded = async () => {
    const activeBooking = lookupResult.booking;
    if (!activeBooking) return;

    setIsMarkingBoarded(true);
    setActionBanner(null);

    try {
      const res = await markBookingAsBoarded(activeBooking.bookingId);
      if (res.booking) {
        setLookupResult({
          checkedId: activeBooking.bookingId,
          booking: res.booking,
          error: null,
        });
      }
      if (res.outcome === 'marked_boarded') {
        setActionBanner('Passenger marked as BOARDED.');
      } else if (res.outcome === 'already_boarded') {
        setActionBanner('This ticket was ALREADY boarded earlier.');
      }
    } catch (err) {
      setLookupResult((prev) => ({
        ...prev,
        error:
          err instanceof Error
            ? err.message
            : 'Could not mark ticket as boarded. Check Firebase database rules.',
      }));
    } finally {
      setIsMarkingBoarded(false);
    }
  };

  if (!isStaffUnlocked) {
    return (
      <div className="mx-auto max-w-md pt-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="bg-[#0F172A] px-6 py-6 text-center text-white">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#D84E55] text-white shadow-sm">
              <Lock className="size-7" aria-hidden="true" />
            </div>
            <h1 className="mt-3 text-xl font-extrabold">
              {BRAND_NAME} Staff Check
            </h1>
            <p className="mt-1 text-xs text-slate-300">
              Enter 4-digit conductor PIN once on this phone to scan QR tickets.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              unlockWithPin(pinInput);
            }}
            className="space-y-4 p-6"
          >
            <div>
              <label
                htmlFor="staff-pin-input"
                className="block text-center text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                4-Digit Staff PIN
              </label>
              <input
                id="staff-pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinInput(digits);
                  if (pinError) setPinError(null);
                  if (digits.length === 4 && digits === STAFF_VERIFY_PIN) {
                    unlockWithPin(digits);
                  }
                }}
                className="mt-2 min-h-14 w-full rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 text-center text-2xl font-extrabold tracking-[0.5em] text-[#0F172A] focus:border-[#D84E55] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
              />
            </div>

            {pinError ? (
              <p
                role="alert"
                className="rounded-xl bg-[#FFF1F2] p-3 text-center text-xs font-bold text-[#B91C1C]"
              >
                {pinError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pinInput.length !== 4}
              className="inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-[#D84E55] px-5 py-3 text-base font-extrabold text-white shadow-sm transition-colors hover:bg-[#B91C1C] disabled:opacity-50"
            >
              Unlock Conductor Mode
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isAutoLoading = Boolean(
    isStaffUnlocked &&
      normalizedInitialId &&
      lookupResult.checkedId === ''
  );
  const isLoading = isManualLoading || isAutoLoading;
  const booking = lookupResult.booking;
  const lookupError = lookupResult.error;

  const isAlreadyBoarded = booking?.boarded === true;
  const seatCount = booking?.seats.length ?? expectedSeatCount ?? 1;
  const passengerCountHeading = `${seatCount} ${
    seatCount === 1 ? 'PASSENGER' : 'PASSENGERS'
  }`;

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Staff Top Strip */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#D84E55] text-white">
            <Bus className="size-4" aria-hidden="true" />
          </div>
          <span className="text-sm font-extrabold text-[#0F172A]">
            Conductor Verification
          </span>
        </div>

        <button
          type="button"
          onClick={handleLockDevice}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
        >
          <Lock className="size-3.5" aria-hidden="true" />
          <span>Lock</span>
        </button>
      </div>

      {/* Verification Status Result */}
      {isLoading ? (
        <div
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"
        >
          <Loader2
            className="size-10 animate-spin text-[#D84E55]"
            aria-hidden="true"
          />
          <p className="mt-3 text-base font-bold text-[#0F172A]">
            Checking Ticket...
          </p>
        </div>
      ) : booking ? (
        isAlreadyBoarded ? (
          /* BIG RED SCREEN: ALREADY USED / BOARDED */
          <section
            aria-label="Ticket already boarded"
            className="overflow-hidden rounded-3xl border-4 border-[#DC2626] bg-white shadow-xl"
          >
            <div className="bg-[#DC2626] px-5 py-7 text-center text-white">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-[#DC2626] shadow-md">
                <AlertTriangle className="size-10 stroke-[2.5]" aria-hidden="true" />
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                ALREADY USED / BOARDED
              </h2>
              <p className="mt-1.5 text-sm font-semibold text-red-100">
                Do not allow entry again with a screenshot.
              </p>
              <div className="mt-3 inline-flex rounded-xl bg-red-950/40 px-4 py-1.5 text-xs font-bold text-white">
                Boarded: {formatBoardedTimestamp(booking.boardedAt)}
              </div>
            </div>

            <div className="space-y-4 p-5">
              {actionBanner ? (
                <p
                  role="status"
                  className="rounded-xl bg-red-50 p-2.5 text-center text-xs font-bold text-red-900"
                >
                  {actionBanner}
                </p>
              ) : null}

              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-center">
                <p className="text-xl font-black text-[#991B1B]">
                  {passengerCountHeading} ({seatCount === 1 ? 'Seat' : 'Seats'}:{' '}
                  {booking.seats.join(', ')})
                </p>
                <p className="mt-1 text-xs font-bold text-red-800">
                  Ticket ID: {booking.bookingId}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Passenger
                  </span>
                  <p className="font-extrabold text-[#0F172A]">
                    {booking.passengerName}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Mobile
                  </span>
                  <p className="font-extrabold text-[#0F172A]">
                    +91 {booking.passengerPhone}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Trip
                  </span>
                  <p className="font-bold text-[#0F172A]">
                    {booking.routeLabel} • {formatDisplayDate(booking.date)} •{' '}
                    {booking.departureTime}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* BIG GREEN SCREEN: VERIFIED TICKET */
          <section
            aria-label="Verified ticket"
            className="overflow-hidden rounded-3xl border-4 border-[#059669] bg-white shadow-xl"
          >
            <div className="bg-[#059669] px-5 py-7 text-center text-white">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white text-[#059669] shadow-md">
                <CheckCircle2 className="size-10 stroke-[2.5]" aria-hidden="true" />
              </div>
              <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                <span>
                  Paid {CURRENCY_SYMBOL}
                  {booking.amountPaid}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                VERIFIED TICKET
              </h2>
              <p className="mt-1 text-sm font-bold text-emerald-100">
                Booking ID: {booking.bookingId}
              </p>
            </div>

            <div className="space-y-4 p-5">
              {/* Huge Unmistakable Passenger Count & Seats Callout */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-black leading-tight text-emerald-950">
                  {passengerCountHeading}
                </p>
                <p className="mt-1 text-lg font-extrabold text-[#047857]">
                  {seatCount === 1 ? 'Seat' : 'Seats'}: {booking.seats.join(', ')}
                </p>
              </div>

              {lookupError ? (
                <p
                  role="alert"
                  className="rounded-xl bg-[#FFF1F2] p-3 text-center text-xs font-bold text-[#B91C1C]"
                >
                  {lookupError}
                </p>
              ) : null}

              {/* Clean Passenger & Trip Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <User className="size-3.5" aria-hidden="true" />
                    Passenger Name
                  </span>
                  <p className="mt-1 text-base font-extrabold text-[#0F172A]">
                    {booking.passengerName}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Phone className="size-3.5" aria-hidden="true" />
                    Mobile Number
                  </span>
                  <p className="mt-1 text-base font-extrabold text-[#0F172A]">
                    +91 {booking.passengerPhone}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <MapPin className="size-3.5 text-[#D84E55]" aria-hidden="true" />
                    Route
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-[#0F172A]">
                    {booking.routeLabel}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Calendar className="size-3.5" aria-hidden="true" />
                    Date &amp; Departure
                  </span>
                  <p className="mt-1 text-sm font-extrabold text-[#0F172A]">
                    {formatDisplayDate(booking.date)}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-[#B91C1C]">
                    <Clock className="size-3" aria-hidden="true" />
                    {booking.departureTime}
                  </p>
                </div>
              </div>

              {/* Giant Mark as Boarded Button */}
              <button
                type="button"
                disabled={isMarkingBoarded}
                onClick={handleMarkBoarded}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#059669] px-5 py-3.5 text-lg font-extrabold text-white shadow-lg shadow-emerald-600/25 transition-colors hover:bg-[#047857] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {isMarkingBoarded ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                    <span>Marking Boarded...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-5" aria-hidden="true" />
                    <span>Mark as Boarded</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )
      ) : lookupError ? (
        <div
          role="alert"
          className="rounded-3xl border-2 border-rose-300 bg-[#FFF1F2] p-6 text-center"
        >
          <AlertTriangle
            className="mx-auto size-10 text-[#B91C1C]"
            aria-hidden="true"
          />
          <h2 className="mt-2 text-lg font-extrabold text-[#881337]">
            Invalid or Unknown Ticket
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#881337]">
            {lookupError}
          </p>
        </div>
      ) : null}

      {/* Manual Booking ID Lookup Fallback for Conductors */}
      <form
        onSubmit={handleManualLookup}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
      >
        <label
          htmlFor="staff-manual-booking-id"
          className="block text-xs font-bold uppercase tracking-wider text-slate-500"
        >
          Check Another Booking ID Manually
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="staff-manual-booking-id"
            type="text"
            placeholder="SB-8K4P9Q"
            value={bookingIdInput}
            onChange={(e) => setBookingIdInput(e.target.value.toUpperCase())}
            className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-base font-bold uppercase text-[#0F172A] placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] px-4 py-2 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <Search className="size-4" aria-hidden="true" />
            <span>Check</span>
          </button>
        </div>
      </form>
    </div>
  );
}
