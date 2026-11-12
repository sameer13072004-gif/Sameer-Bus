'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ArrowLeft, Bus, CheckCircle2, Loader2, Menu } from 'lucide-react';
import {
  BRAND_NAME,
  BUS_ROUTES,
  CURRENCY_SYMBOL,
  PRICE_PER_SEAT,
  buildTripId,
  type RouteId,
} from '@/config/busConfig';
import {
  buildUpcomingDateOptions,
  formatShortDate,
  getTodayIsoDate,
  hasTripDepartedForDate,
} from '@/lib/dateUtils';
import {
  finalizeBooking,
  isFirebaseConfigured,
  logoutAccount,
  releaseSeatsForSession,
  subscribeToAuth,
  subscribeToTripSeats,
  toggleSeatHold,
  verifyAndExtendHeldSeats,
} from '@/lib/firebase';
import { getRazorpayKeyId, loadRazorpayCheckoutScript } from '@/lib/razorpay';
import {
  getEmptyBookingsSnapshot,
  getOrCreateSessionId,
  getSavedBookings,
  saveBookingLocally,
  subscribeSavedBookings,
} from '@/lib/storage';
import type {
  AppView,
  AuthUserProfile,
  BookingRecord,
  BookingStep,
  EffectiveSeatState,
  ToastMessage,
  TripSeatsMap,
} from '@/types/booking';
import { AuthModal } from './AuthModal';
import { BusSeatDeck } from './BusSeatDeck';
import { CheckoutDrawer, type CheckoutSubmitPayload } from './CheckoutDrawer';
import { HamburgerDrawer } from './HamburgerDrawer';
import { MyTicketsView } from './MyTicketsView';
import { RouteAndDateSelector } from './RouteAndDateSelector';
import { StickyCheckoutBar } from './StickyCheckoutBar';
import { TicketPassCard } from './TicketPassCard';
import { ToastRegion } from './ToastRegion';

const subscribeNoop = () => () => {};
const FIREBASE_READY = isFirebaseConfigured();
const EMPTY_SEATS_MAP: TripSeatsMap = {};
const EMPTY_SEAT_IDS: string[] = [];

function sortSeatIds(seatIds: string[]): string[] {
  return [...seatIds].sort((a, b) => {
    const rowA = parseInt(a, 10);
    const rowB = parseInt(b, 10);
    if (rowA !== rowB) return rowA - rowB;
    return a.localeCompare(b);
  });
}

export function SameerBusApp() {
  const [activeView, setActiveView] = useState<AppView>('book');
  const [bookingStep, setBookingStep] = useState<BookingStep>('route_date');
  const [selectedRouteId, setSelectedRouteId] = useState<RouteId>('NOIDA_RAMPUR');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayIsoDate());
  const [clockNowMs, setClockNowMs] = useState<number>(() => Date.now());

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);

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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReleasingAll, setIsReleasingAll] = useState(false);
  const [paymentOverlayLabel, setPaymentOverlayLabel] = useState<string | null>(
    null
  );
  const [razorpayLoadFailed, setRazorpayLoadFailed] = useState(false);

  // Discrete expiry timestamp used ONLY to refresh lazy-expired holds (no 1s interval ticks!)
  const [expiryEvalMs, setExpiryEvalMs] = useState<number>(() => Date.now());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const releasingExpiredRef = useRef<Set<string>>(new Set());

  const dateOptions = useMemo(() => {
    return buildUpcomingDateOptions(7, new Date(clockNowMs));
  }, [clockNowMs]);

  const effectiveSelectedDate = useMemo(() => {
    const allowed = dateOptions.some((opt) => opt.isoDate === selectedDate);
    return allowed ? selectedDate : (dateOptions[0]?.isoDate ?? getTodayIsoDate());
  }, [dateOptions, selectedDate]);

  const selectedRoute = BUS_ROUTES[selectedRouteId];
  const tripId = buildTripId(effectiveSelectedDate, selectedRouteId);

  const seatsMap =
    tripSnapshot.tripId === tripId ? tripSnapshot.seats : EMPTY_SEATS_MAP;
  const isSeatsLoading = FIREBASE_READY && tripSnapshot.tripId !== tripId;
  const syncError = !FIREBASE_READY
    ? 'Live booking service is not configured yet.'
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

  // Subscribe to Firebase Auth state (100% optional)
  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setAuthUser(user);
    });
    return () => unsub();
  }, []);

  // Refresh departure lock clock every 30s ONLY while user is on Step 1 (no inputs here)
  useEffect(() => {
    if (activeView !== 'book' || bookingStep !== 'route_date') return;
    const id = window.setInterval(() => {
      setClockNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [activeView, bookingStep]);

  // Real-time Firebase RTDB listener when on Seat Selection step
  useEffect(() => {
    if (!FIREBASE_READY || activeView !== 'book' || bookingStep !== 'seats') {
      return;
    }

    releasingExpiredRef.current.clear();

    const unsubscribe = subscribeToTripSeats(
      tripId,
      (nextSeats) => {
        setExpiryEvalMs(Date.now());
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
          error: error.message || 'Unable to sync seats right now.',
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeView, bookingStep, tripId]);

  // Schedule ONE exact setTimeout for the next seat hold expiry instead of a 1s polling interval
  const nextExpiryTargetMs = useMemo(() => {
    let minExp: number | null = null;
    for (const seat of Object.values(seatsMap)) {
      if (
        seat?.status === 'held' &&
        seat.holdExpiresAt &&
        seat.holdExpiresAt > expiryEvalMs
      ) {
        minExp =
          minExp === null ? seat.holdExpiresAt : Math.min(minExp, seat.holdExpiresAt);
      }
    }
    return minExp;
  }, [seatsMap, expiryEvalMs]);

  useEffect(() => {
    if (nextExpiryTargetMs === null) return;
    const delayMs = Math.max(250, nextExpiryTargetMs - Date.now() + 80);
    const timer = window.setTimeout(() => {
      setExpiryEvalMs(Date.now());
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [nextExpiryTargetMs]);

  // Compute held seats cleanly with reference stability so CheckoutDrawer never re-renders needlessly
  const { heldSeatsKey, expiredSeatsKey } = useMemo(() => {
    if (!sessionId) {
      return { heldSeatsKey: '', expiredSeatsKey: '' };
    }

    const active: string[] = [];
    const expired: string[] = [];

    for (const [seatId, seat] of Object.entries(seatsMap)) {
      if (!seat || seat.status !== 'held' || seat.heldBy !== sessionId) {
        continue;
      }
      if (seat.holdExpiresAt && seat.holdExpiresAt <= expiryEvalMs) {
        expired.push(seatId);
      } else {
        active.push(seatId);
      }
    }

    return {
      heldSeatsKey: sortSeatIds(active).join(','),
      expiredSeatsKey: sortSeatIds(expired).join(','),
    };
  }, [seatsMap, sessionId, expiryEvalMs]);

  const myActiveHeldSeats = useMemo(
    () => (heldSeatsKey ? heldSeatsKey.split(',') : EMPTY_SEAT_IDS),
    [heldSeatsKey]
  );

  const myExpiredSeats = useMemo(
    () => (expiredSeatsKey ? expiredSeatsKey.split(',') : EMPTY_SEAT_IDS),
    [expiredSeatsKey]
  );

  // Release timed-out seats cleanly if session left them inactive past 5m
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
          title: 'Selected seats released',
          description: 'Please select your seats again to continue.',
        });
      })
      .catch(() => {
        for (const id of toRelease) {
          releasingExpiredRef.current.delete(`${tripId}:${id}`);
        }
      });
  }, [myExpiredSeats, sessionId, tripId, addToast]);

  const handleSeatTap = async (seatId: string, state: EffectiveSeatState) => {
    if (!sessionId) return;

    if (state === 'held_by_other' || state === 'booked') {
      return;
    }

    setExpiryEvalMs(Date.now());
    setPendingSeatIds((prev) => {
      const next = new Set(prev);
      next.add(seatId);
      return next;
    });

    try {
      releasingExpiredRef.current.delete(`${tripId}:${seatId}`);
      const res = await toggleSeatHold(tripId, seatId, sessionId);

      if (res.outcome === 'conflict_held' || res.outcome === 'conflict_booked') {
        addToast({
          type: 'warning',
          title: `Seat ${seatId} is no longer available`,
          description: 'Please pick another seat.',
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: `Could not select seat ${seatId}`,
        description:
          err instanceof Error ? err.message : 'Please check your connection.',
      });
    } finally {
      setPendingSeatIds((prev) => {
        const next = new Set(prev);
        next.delete(seatId);
        return next;
      });
    }
  };

  const handleReleaseAllSelected = useCallback(async () => {
    if (!sessionId || myActiveHeldSeats.length === 0) return;
    setIsReleasingAll(true);
    try {
      await releaseSeatsForSession(tripId, myActiveHeldSeats, sessionId);
    } catch {
      addToast({
        type: 'error',
        title: 'Failed to clear selected seats',
      });
    } finally {
      setIsReleasingAll(false);
    }
  }, [sessionId, myActiveHeldSeats, tripId, addToast]);

  const handleBackToRouteDate = () => {
    if (sessionId && myActiveHeldSeats.length > 0) {
      void releaseSeatsForSession(tripId, myActiveHeldSeats, sessionId).catch(
        () => {}
      );
    }
    setIsCheckoutOpen(false);
    setBookingStep('route_date');
  };

  const handleGoHome = () => {
    if (
      activeView === 'book' &&
      bookingStep === 'seats' &&
      sessionId &&
      myActiveHeldSeats.length > 0
    ) {
      void releaseSeatsForSession(tripId, myActiveHeldSeats, sessionId).catch(
        () => {}
      );
    }
    setIsCheckoutOpen(false);
    setConfirmedBooking(null);
    setBookingStep('route_date');
    setActiveView('book');
  };

  const handleCloseCheckout = useCallback(() => {
    setIsCheckoutOpen(false);
  }, []);

  const handleSubmitPayment = useCallback(
    async ({ passengerName, passengerPhone, mode }: CheckoutSubmitPayload) => {
      if (!sessionId || myActiveHeldSeats.length === 0) return;

      const seatsToBook = [...myActiveHeldSeats];
      const targetTripId = tripId;
      const targetDate = effectiveSelectedDate;
      const targetRoute = selectedRoute;
      const currentUserId = authUser?.uid ?? null;
      const currentUserEmail = authUser?.email ?? null;

      // Bug Fix B:
      // 1. Input was already blurred inside CheckoutDrawer submit handler
      // 2. Immediately unmount/close Passenger Details modal so NO <input> remains mounted
      setIsCheckoutOpen(false);
      setPaymentOverlayLabel(
        mode === 'razorpay' ? 'Opening payment...' : 'Confirming your ticket...'
      );

      try {
        // 3. Verify/extend holds AND wait >= 150ms so mobile software keyboard finishes dismissing
        const [holdCheck, razorpayReady] = await Promise.all([
          verifyAndExtendHeldSeats(targetTripId, seatsToBook, sessionId),
          mode === 'razorpay'
            ? loadRazorpayCheckoutScript()
            : Promise.resolve(true),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 150);
          }),
        ]);

        if (!holdCheck.ok) {
          setPaymentOverlayLabel(null);
          addToast({
            type: 'warning',
            title: 'Seats no longer held',
            description: `Seats ${holdCheck.lostSeats.join(', ')} expired or were taken. Please select again.`,
          });
          return;
        }

        if (mode === 'demo') {
          const booking = await finalizeBooking({
            tripId: targetTripId,
            date: targetDate,
            route: targetRoute,
            seats: seatsToBook,
            passengerName,
            passengerPhone,
            currentSessionId: sessionId,
            paymentMethod: 'demo',
            userId: currentUserId,
            userEmail: currentUserEmail,
          });
          saveBookingLocally(booking);
          setConfirmedBooking(booking);
          setBookingStep('confirmed');
          setPaymentOverlayLabel(null);
          return;
        }

        const razorpayKeyId = getRazorpayKeyId();
        if (!razorpayKeyId || !razorpayReady || !window.Razorpay) {
          setRazorpayLoadFailed(true);
          setPaymentOverlayLabel(null);
          setIsCheckoutOpen(true);
          addToast({
            type: 'error',
            title: 'Could not open Razorpay',
            description:
              'Check your internet connection or use Demo Mode to test.',
          });
          return;
        }

        const rzp = new window.Razorpay({
          key: razorpayKeyId,
          amount: seatsToBook.length * PRICE_PER_SEAT * 100,
          currency: 'INR',
          name: BRAND_NAME,
          description: `${targetRoute.routeLabel} - Seats: ${seatsToBook.join(', ')}`,
          prefill: {
            name: passengerName,
            contact: passengerPhone,
          },
          notes: {
            tripId: targetTripId,
            route: targetRoute.routeLabel,
            date: targetDate,
            seats: seatsToBook.join(', '),
          },
          theme: {
            color: '#D84E55',
          },
          modal: {
            confirm_close: true,
            ondismiss: () => {
              setPaymentOverlayLabel(null);
            },
          },
          handler: async (response) => {
            setPaymentOverlayLabel('Saving your boarding pass...');
            try {
              const booking = await finalizeBooking({
                tripId: targetTripId,
                date: targetDate,
                route: targetRoute,
                seats: seatsToBook,
                passengerName,
                passengerPhone,
                currentSessionId: sessionId,
                paymentMethod: 'razorpay',
                razorpayPaymentId: response.razorpay_payment_id,
                userId: currentUserId,
                userEmail: currentUserEmail,
              });
              saveBookingLocally(booking);
              setConfirmedBooking(booking);
              setBookingStep('confirmed');
              setPaymentOverlayLabel(null);
            } catch (err) {
              setPaymentOverlayLabel(null);
              addToast({
                type: 'error',
                title: 'Payment succeeded, saving failed',
                description:
                  err instanceof Error
                    ? `${err.message} (Ref: ${response.razorpay_payment_id})`
                    : `Payment ref: ${response.razorpay_payment_id}`,
              });
            }
          },
        });

        rzp.on('payment.failed', (resp) => {
          setPaymentOverlayLabel(null);
          addToast({
            type: 'error',
            title: 'Payment failed',
            description:
              resp?.error?.description ??
              'Payment was not completed. Please try again.',
          });
        });

        // Keyboard already blurred & modal unmounted + 150ms elapsed
        setPaymentOverlayLabel(null);
        rzp.open();
      } catch (err) {
        setPaymentOverlayLabel(null);
        addToast({
          type: 'error',
          title: 'Could not start payment',
          description:
            err instanceof Error ? err.message : 'Please try again in a moment.',
        });
      }
    },
    [
      sessionId,
      myActiveHeldSeats,
      tripId,
      effectiveSelectedDate,
      selectedRoute,
      authUser,
      addToast,
    ]
  );

  const handleContinueToSeats = () => {
    const currentNow = new Date();
    setClockNowMs(currentNow.getTime());
    if (
      hasTripDepartedForDate(
        effectiveSelectedDate,
        selectedRoute.departureTime,
        currentNow
      )
    ) {
      addToast({
        type: 'warning',
        title: `Bus departed at ${selectedRoute.departureTime} today`,
        description: 'Please tap "Book for Tomorrow" or choose another date.',
      });
      return;
    }
    setBookingStep('seats');
  };

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-[#0F172A]">
      <ToastRegion toasts={toasts} onDismiss={dismissToast} />

      {/* Clean Minimal Sticky Top Header (Brand + Hamburger Menu Only) */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
          <button
            type="button"
            onClick={handleGoHome}
            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#D84E55] text-white shadow-2xs">
              <Bus className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold tracking-tight text-[#0F172A] sm:text-lg">
                {BRAND_NAME}
              </h1>
              <p className="truncate text-[11px] font-medium text-slate-500">
                Noida ↔ Rampur (UP)
              </p>
            </div>
          </button>

          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0F172A] transition-colors hover:border-[#D84E55] hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Main Focused Flow Content */}
      <main
        className={`mx-auto max-w-3xl px-4 pt-5 sm:px-6 sm:pt-7 ${
          activeView === 'book' &&
          bookingStep === 'seats' &&
          myActiveHeldSeats.length > 0
            ? 'pb-32'
            : 'pb-12'
        }`}
      >
        {activeView === 'tickets' ? (
          <MyTicketsView
            localBookings={localBookings}
            authUser={authUser}
            onBackToBooking={handleGoHome}
          />
        ) : bookingStep === 'route_date' ? (
          /* STEP 1: Date & Route Selection */
          <RouteAndDateSelector
            dateOptions={dateOptions}
            selectedRouteId={selectedRouteId}
            selectedDate={effectiveSelectedDate}
            nowTimestamp={clockNowMs}
            onSelectRoute={setSelectedRouteId}
            onSelectDate={setSelectedDate}
            onContinueToSeats={handleContinueToSeats}
          />
        ) : bookingStep === 'seats' ? (
          /* STEP 2: Movie-Style Seat Selection */
          <div className="space-y-4">
            {/* Step 2 Back & Trip Summary Bar */}
            <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs">
              <button
                type="button"
                onClick={handleBackToRouteDate}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-[#B91C1C] transition-colors hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                <span>Change Route / Date</span>
              </button>

              <div className="text-right text-xs">
                <p className="font-extrabold text-[#0F172A]">
                  {selectedRoute.shortLabel}
                </p>
                <p className="font-medium text-slate-500">
                  {formatShortDate(effectiveSelectedDate)} •{' '}
                  {selectedRoute.departureTime} • {CURRENCY_SYMBOL}
                  {PRICE_PER_SEAT}/seat
                </p>
              </div>
            </div>

            <BusSeatDeck
              seatsMap={seatsMap}
              currentSessionId={sessionId}
              pendingSeatIds={pendingSeatIds}
              nowMs={expiryEvalMs}
              isLoading={isSeatsLoading}
              syncError={syncError}
              onSeatTap={handleSeatTap}
            />
          </div>
        ) : confirmedBooking ? (
          /* STEP 3: Dedicated Post-Payment Confirmation & Downloadable QR Ticket */
          <div className="mx-auto max-w-lg space-y-4">
            <div className="no-print flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-xs">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-emerald-950">
                  Booking Confirmed!
                </h2>
                <p className="text-xs font-medium text-emerald-800">
                  Your boarding pass is ready below for{' '}
                  {formatShortDate(confirmedBooking.date)}.
                </p>
              </div>
            </div>

            <TicketPassCard booking={confirmedBooking} />

            <div className="no-print pt-1 text-center">
              <button
                type="button"
                onClick={handleGoHome}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:border-[#D84E55] hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
              >
                Book Another Ticket
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Clean Sticky Bottom Bar on Step 2 (NO ticking countdown timer) */}
      {activeView === 'book' && bookingStep === 'seats' ? (
        <StickyCheckoutBar
          selectedSeats={myActiveHeldSeats}
          isReleasing={isReleasingAll}
          onClearSeats={handleReleaseAllSelected}
          onProceedToPay={() => setIsCheckoutOpen(true)}
        />
      ) : null}

      {/* Standalone Memoized Passenger Details Modal (Bug Fix A + Bug Fix B) */}
      {isCheckoutOpen && myActiveHeldSeats.length > 0 ? (
        <CheckoutDrawer
          date={effectiveSelectedDate}
          route={selectedRoute}
          selectedSeats={myActiveHeldSeats}
          defaultName={authUser?.displayName ?? ''}
          razorpayLoadFailed={razorpayLoadFailed}
          onClose={handleCloseCheckout}
          onSubmitPayment={handleSubmitPayment}
        />
      ) : null}

      {/* Input-Free Overlay While Keyboard Dismisses & Razorpay Opens */}
      {paymentOverlayLabel ? (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs"
        >
          <div className="flex flex-col items-center rounded-3xl bg-white px-7 py-6 text-center shadow-2xl">
            <Loader2
              className="size-8 animate-spin text-[#D84E55]"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-bold text-[#0F172A]">
              {paymentOverlayLabel}
            </p>
          </div>
        </div>
      ) : null}

      {/* Hamburger Menu Drawer */}
      <HamburgerDrawer
        isOpen={isMenuOpen}
        activeView={activeView}
        savedTicketCount={localBookings.length}
        authUser={authUser}
        onClose={() => setIsMenuOpen(false)}
        onSelectBookTicket={handleGoHome}
        onSelectMyTickets={() => {
          setIsCheckoutOpen(false);
          setActiveView('tickets');
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={() => {
          void logoutAccount()
            .then(() => {
              addToast({
                type: 'info',
                title: 'Signed out',
              });
            })
            .catch(() => {});
        }}
      />

      {/* Optional Google / Email Sign-In Modal */}
      {isAuthModalOpen ? (
        <AuthModal
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(user) => {
            setIsAuthModalOpen(false);
            addToast({
              type: 'success',
              title: 'Signed in',
              description: user.email
                ? `Welcome, ${user.displayName || user.email}`
                : 'Your account is connected.',
            });
          }}
        />
      ) : null}
    </div>
  );
}
