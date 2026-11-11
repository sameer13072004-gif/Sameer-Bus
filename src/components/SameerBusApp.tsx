'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowLeft,
  Bus,
  CheckCircle2,
  PhoneCall,
  QrCode,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import {
  BRAND_NAME,
  BUS_NAME,
  BUS_ROUTES,
  CURRENCY_SYMBOL,
  PRICE_PER_SEAT,
  SUPPORT_CONTACT,
  buildTripId,
  type RouteId,
} from '@/config/busConfig';
import { formatDisplayDate, getTodayIsoDate } from '@/lib/dateUtils';
import {
  isFirebaseConfigured,
  releaseSeatsForSession,
  subscribeToTripSeats,
  toggleSeatHold,
} from '@/lib/firebase';
import {
  getEmptyBookingsSnapshot,
  getOrCreateSessionId,
  getSavedBookings,
  saveBookingLocally,
  subscribeSavedBookings,
} from '@/lib/storage';
import type {
  ActiveTab,
  BookingRecord,
  EffectiveSeatState,
  ToastMessage,
  TripSeatsMap,
} from '@/types/booking';
import { BusSeatDeck } from './BusSeatDeck';
import { CheckoutDrawer } from './CheckoutDrawer';
import { HelpArrivalCard } from './HelpArrivalCard';
import { MyTicketsView } from './MyTicketsView';
import { RouteAndDateSelector } from './RouteAndDateSelector';
import { StickyCheckoutBar } from './StickyCheckoutBar';
import { TicketPassCard } from './TicketPassCard';
import { ToastRegion } from './ToastRegion';
import { VerifyTicketView } from './VerifyTicketView';

const subscribeNoop = () => () => {};
const FIREBASE_READY = isFirebaseConfigured();
const EMPTY_SEATS_MAP: TripSeatsMap = {};

function sortSeatIds(seatIds: string[]): string[] {
  return [...seatIds].sort((a, b) => {
    const rowA = parseInt(a, 10);
    const rowB = parseInt(b, 10);
    if (rowA !== rowB) return rowA - rowB;
    return a.localeCompare(b);
  });
}

export function SameerBusApp() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('book');
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('NOIDA_RAMPUR');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIsoDate());

  const sessionId = useSyncExternalStore(
    subscribeNoop,
    getOrCreateSessionId,
    () => ''
  );
  const localBookings = useSyncExternalStore(
    subscribeSavedBookings,
    getSavedBookings,
    getEmptyBookingsSnapshot
  );

  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(
    null
  );

  const [tripSnapshot, setTripSnapshot] = useState<{
    tripId: string;
    seats: TripSeatsMap;
    error: string | null;
  }>({
    tripId: '',
    seats: {},
    error: null,
  });

  const [pendingSeatIds, setPendingSeatIds] = useState<Set<string>>(new Set());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isReleasingAll, setIsReleasingAll] = useState<boolean>(false);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const releasingExpiredRef = useRef<Set<string>>(new Set());

  const selectedRoute = BUS_ROUTES[selectedRouteId];
  const tripId = buildTripId(selectedDate, selectedRouteId);

  const seatsMap =
    tripSnapshot.tripId === tripId ? tripSnapshot.seats : EMPTY_SEATS_MAP;
  const isSeatsLoading = FIREBASE_READY && tripSnapshot.tripId !== tripId;
  const syncError = !FIREBASE_READY
    ? 'Firebase environment variables are missing. Add NEXT_PUBLIC_FIREBASE_* values in .env.local.'
    : tripSnapshot.tripId === tripId
      ? tripSnapshot.error
      : null;

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Real-time Firebase Realtime Database listener on trips/{date}_{routeId}
  useEffect(() => {
    if (!FIREBASE_READY) return;

    releasingExpiredRef.current.clear();

    const unsubscribe = subscribeToTripSeats(
      tripId,
      (nextSeats) => {
        setNowMs(Date.now());
        setTripSnapshot({
          tripId,
          seats: nextSeats,
          error: null,
        });
      },
      (error) => {
        setTripSnapshot({
          tripId,
          seats: {},
          error: error.message || 'Unable to sync seats in real time.',
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [tripId]);

  // Tick 1s timer only while any seat has an active hold (countdown + lazy expiry)
  const hasAnyHeldSeat = useMemo(() => {
    return Object.values(seatsMap).some((seat) => seat?.status === 'held');
  }, [seatsMap]);

  useEffect(() => {
    if (!hasAnyHeldSeat) return;
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [hasAnyHeldSeat]);

  // Seats actively held by this session (not yet expired)
  const { myActiveHeldSeats, earliestExpiryMs, myExpiredSeats } = useMemo(() => {
    if (!sessionId) {
      return {
        myActiveHeldSeats: [] as string[],
        earliestExpiryMs: null as number | null,
        myExpiredSeats: [] as string[],
      };
    }

    const active: string[] = [];
    const expired: string[] = [];
    let minExpiry: number | null = null;

    for (const [seatId, seat] of Object.entries(seatsMap)) {
      if (!seat || seat.status !== 'held' || seat.heldBy !== sessionId) {
        continue;
      }
      if (seat.holdExpiresAt && seat.holdExpiresAt <= nowMs) {
        expired.push(seatId);
      } else {
        active.push(seatId);
        if (seat.holdExpiresAt) {
          minExpiry =
            minExpiry === null
              ? seat.holdExpiresAt
              : Math.min(minExpiry, seat.holdExpiresAt);
        }
      }
    }

    return {
      myActiveHeldSeats: sortSeatIds(active),
      earliestExpiryMs: minExpiry,
      myExpiredSeats: sortSeatIds(expired),
    };
  }, [seatsMap, sessionId, nowMs]);

  // Auto-release seats in RTDB when the 5-minute countdown reaches 00:00
  useEffect(() => {
    if (!sessionId || myExpiredSeats.length === 0) return;

    const toRelease = myExpiredSeats.filter(
      (id) => !releasingExpiredRef.current.has(`${tripId}:${id}`)
    );

    if (toRelease.length === 0) return;

    for (const id of toRelease) {
      releasingExpiredRef.current.add(`${tripId}:${id}`);
    }

    void releaseSeatsForSession(tripId, toRelease, sessionId)
      .then(() => {
        setIsCheckoutOpen(false);
        addToast({
          type: 'warning',
          title: '5-Minute Seat Hold Expired',
          description: `Seat${toRelease.length > 1 ? 's' : ''} ${toRelease.join(', ')} released because payment was not completed in time.`,
        });
      })
      .catch(() => {
        for (const id of toRelease) {
          releasingExpiredRef.current.delete(`${tripId}:${id}`);
        }
      });
  }, [myExpiredSeats, sessionId, tripId, addToast]);

  const msRemaining =
    earliestExpiryMs !== null ? Math.max(0, earliestExpiryMs - nowMs) : 0;

  const handleSeatTap = async (seatId: string, state: EffectiveSeatState) => {
    if (!sessionId) return;

    if (state === 'held_by_other') {
      addToast({
        type: 'warning',
        title: `Seat ${seatId} is temporarily locked`,
        description: 'Being booked by another passenger (5-minute hold).',
      });
      return;
    }

    if (state === 'booked') return;

    setNowMs(Date.now());
    setPendingSeatIds((prev) => {
      const next = new Set(prev);
      next.add(seatId);
      return next;
    });

    try {
      releasingExpiredRef.current.delete(`${tripId}:${seatId}`);
      const res = await toggleSeatHold(tripId, seatId, sessionId);

      if (res.outcome === 'conflict_held') {
        addToast({
          type: 'warning',
          title: `Seat ${seatId} just locked`,
          description: 'Another passenger started booking this seat just now.',
        });
      } else if (res.outcome === 'conflict_booked') {
        addToast({
          type: 'error',
          title: `Seat ${seatId} already booked`,
          description: 'Please pick another available seat.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: `Could not update seat ${seatId}`,
        description:
          err instanceof Error
            ? err.message
            : 'Check Realtime Database rules or connection.',
      });
    } finally {
      setPendingSeatIds((prev) => {
        const next = new Set(prev);
        next.delete(seatId);
        return next;
      });
    }
  };

  const handleReleaseAllSelected = async () => {
    if (!sessionId || myActiveHeldSeats.length === 0) return;
    setIsReleasingAll(true);
    try {
      await releaseSeatsForSession(tripId, myActiveHeldSeats, sessionId);
      addToast({
        type: 'info',
        title: 'Selected seats released',
        description: 'You can pick different seats anytime.',
      });
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to release seats',
      });
    } finally {
      setIsReleasingAll(false);
    }
  };

  const handleBookingConfirmed = (booking: BookingRecord) => {
    saveBookingLocally(booking);
    setIsCheckoutOpen(false);
    setConfirmedBooking(booking);
    addToast({
      type: 'success',
      title: `Booking Confirmed (${booking.bookingId})`,
      description: `Seats ${booking.seats.join(', ')} reserved for ${booking.passengerName}.`,
    });
  };

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />

      {/* Sticky Top Brand & Route Bar */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-2xs backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-3.5 sm:px-6">
          {/* Brand Row */}
          <div className="flex h-14 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#D84E55] text-white shadow-xs">
                <Bus className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-base font-black tracking-tight text-[#0F172A] sm:text-lg">
                    {BRAND_NAME}
                  </h1>
                  <span className="hidden rounded-md bg-[#FFF1F2] px-1.5 py-0.5 text-[10px] font-extrabold text-[#B91C1C] sm:inline-block">
                    NOIDA ↔ RAMPUR
                  </span>
                </div>
                <p className="truncate text-[11px] font-medium text-slate-500">
                  {BUS_NAME} • {CURRENCY_SYMBOL}
                  {PRICE_PER_SEAT}/seat
                </p>
              </div>
            </div>

            <a
              href={SUPPORT_CONTACT.telHref}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-[#0F172A] transition-colors hover:border-[#D84E55] hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
            >
              <PhoneCall className="size-3.5 text-[#D84E55]" aria-hidden="true" />
              <span className="hidden sm:inline">Help:</span>
              <span className="font-mono">{SUPPORT_CONTACT.phoneDisplay}</span>
            </a>
          </div>

          {/* 3 Navigation Tabs */}
          <nav
            aria-label="Primary navigation"
            className="grid grid-cols-3 gap-1.5 pb-2.5"
          >
            <button
              type="button"
              aria-current={activeTab === 'book' ? 'page' : undefined}
              onClick={() => {
                setActiveTab('book');
              }}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition-all sm:text-sm ${
                activeTab === 'book'
                  ? 'bg-[#D84E55] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <Bus className="size-4 shrink-0" aria-hidden="true" />
              <span>Book Seat</span>
            </button>

            <button
              type="button"
              aria-current={activeTab === 'tickets' ? 'page' : undefined}
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('tickets');
              }}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition-all sm:text-sm ${
                activeTab === 'tickets'
                  ? 'bg-[#D84E55] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <Ticket className="size-4 shrink-0" aria-hidden="true" />
              <span>My Tickets</span>
              {localBookings.length > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-black leading-none ${
                    activeTab === 'tickets'
                      ? 'bg-white text-[#B91C1C]'
                      : 'bg-[#D84E55] text-white'
                  }`}
                >
                  {localBookings.length}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-current={activeTab === 'verify' ? 'page' : undefined}
              onClick={() => {
                setConfirmedBooking(null);
                setActiveTab('verify');
              }}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition-all sm:text-sm ${
                activeTab === 'verify'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <QrCode className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">Verify QR</span>
            </button>
          </nav>

          {/* Compact Sticky Active Trip Banner on Book Seat tab */}
          {activeTab === 'book' && !confirmedBooking ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 py-2 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[#0F172A]">
                  {selectedRoute.shortLabel}
                </span>
                <span aria-hidden="true">•</span>
                <span>{formatDisplayDate(selectedDate)}</span>
              </div>
              <div className="font-mono font-bold text-[#B91C1C]">
                {selectedRoute.departureTime} → {selectedRoute.arrivalTime}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`mx-auto max-w-5xl px-3.5 pt-4 sm:px-6 sm:pt-6 ${
          activeTab === 'book' && myActiveHeldSeats.length > 0 && !confirmedBooking
            ? 'pb-36'
            : 'pb-12'
        }`}
      >
        {activeTab === 'book' ? (
          confirmedBooking ? (
            /* Confirmed QR Ticket View */
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className="size-6 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-sm font-extrabold text-emerald-950">
                      Ticket Confirmed &amp; Saved!
                    </h2>
                    <p className="text-xs text-emerald-800">
                      Show this QR boarding pass to the driver when boarding.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmedBooking(null)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-900 transition-colors hover:bg-emerald-100"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    <span>Book More Seats</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmedBooking(null);
                      setActiveTab('tickets');
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#D84E55] px-3 py-1.5 text-xs font-extrabold text-white transition-colors hover:bg-[#B91C1C]"
                  >
                    <span>My Tickets</span>
                  </button>
                </div>
              </div>

              <TicketPassCard booking={confirmedBooking} showHelpCard={true} />
            </div>
          ) : (
            /* Booking Workspace: Route + Date + 40-Seat Bus Deck */
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
              <div className="space-y-4 lg:col-span-5">
                <RouteAndDateSelector
                  selectedRouteId={selectedRouteId}
                  selectedDate={selectedDate}
                  onSelectRoute={(nextRoute) => setSelectedRouteId(nextRoute)}
                  onSelectDate={(nextDate) => setSelectedDate(nextDate)}
                />

                {/* Trust & Help Summary */}
                <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:block">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    <ShieldCheck
                      className="size-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span>Instant Seat Lock Guarantee</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                    Selected seats are reserved exclusively for you for{' '}
                    <strong className="text-[#0F172A]">5 minutes</strong> while
                    you complete guest checkout. Zero OTP friction.
                  </p>
                </div>

                <div className="hidden lg:block">
                  <HelpArrivalCard compact />
                </div>
              </div>

              <div className="space-y-4 lg:col-span-7">
                <BusSeatDeck
                  seatsMap={seatsMap}
                  currentSessionId={sessionId}
                  pendingSeatIds={pendingSeatIds}
                  nowMs={nowMs}
                  isLoading={isSeatsLoading}
                  syncError={syncError}
                  onSeatTap={handleSeatTap}
                />

                <div className="lg:hidden">
                  <HelpArrivalCard compact />
                </div>
              </div>
            </div>
          )
        ) : activeTab === 'tickets' ? (
          <div className="mx-auto max-w-2xl">
            <MyTicketsView localBookings={localBookings} />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <VerifyTicketView />
          </div>
        )}
      </main>

      {/* Sticky Bottom Checkout + Live 5-Min Countdown Bar */}
      {activeTab === 'book' && !confirmedBooking ? (
        <StickyCheckoutBar
          selectedSeats={myActiveHeldSeats}
          msRemaining={msRemaining}
          isReleasing={isReleasingAll}
          onClearSeats={handleReleaseAllSelected}
          onProceedToPay={() => setIsCheckoutOpen(true)}
        />
      ) : null}

      {/* Guest Checkout & Razorpay Payment Modal/Drawer */}
      {isCheckoutOpen && myActiveHeldSeats.length > 0 ? (
        <CheckoutDrawer
          tripId={tripId}
          date={selectedDate}
          route={selectedRoute}
          selectedSeats={myActiveHeldSeats}
          msRemaining={msRemaining}
          currentSessionId={sessionId}
          onClose={() => setIsCheckoutOpen(false)}
          onSeatsLost={(lost) => {
            setIsCheckoutOpen(false);
            addToast({
              type: 'warning',
              title: 'Seat lock expired',
              description: `Seats ${lost.join(', ')} were released or taken. Please select again.`,
            });
          }}
          onBookingConfirmed={handleBookingConfirmed}
        />
      ) : null}
    </div>
  );
}
