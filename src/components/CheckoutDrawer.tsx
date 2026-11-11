'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BRAND_NAME,
  CURRENCY_SYMBOL,
  PRICE_PER_SEAT,
  type BusRoute,
} from '@/config/busConfig';
import { formatCountdown, formatDisplayDate } from '@/lib/dateUtils';
import { finalizeBooking, verifyAndExtendHeldSeats } from '@/lib/firebase';
import { getRazorpayKeyId, loadRazorpayCheckoutScript } from '@/lib/razorpay';
import type { BookingRecord } from '@/types/booking';

interface CheckoutDrawerProps {
  tripId: string;
  date: string;
  route: BusRoute;
  selectedSeats: string[];
  msRemaining: number;
  currentSessionId: string;
  onClose: () => void;
  onSeatsLost: (lostSeats: string[]) => void;
  onBookingConfirmed: (booking: BookingRecord) => void;
}

const TEN_DIGIT_PHONE_RE = /^\d{10}$/;

export function CheckoutDrawer({
  tripId,
  date,
  route,
  selectedSeats,
  msRemaining,
  currentSessionId,
  onClose,
  onSeatsLost,
  onBookingConfirmed,
}: CheckoutDrawerProps) {
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoadFailed, setRazorpayLoadFailed] = useState(false);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const razorpayKeyId = getRazorpayKeyId();
  const hasRazorpayKey = razorpayKeyId.length > 0;
  const totalAmount = selectedSeats.length * PRICE_PER_SEAT;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 80);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isProcessing, onClose]);

  const validateForm = (): boolean => {
    let valid = true;
    const trimmedName = passengerName.trim();
    const cleanedPhone = passengerPhone.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setNameError('Please enter the passenger full name (at least 2 characters).');
      valid = false;
    } else {
      setNameError(null);
    }

    if (!TEN_DIGIT_PHONE_RE.test(cleanedPhone)) {
      setPhoneError('Enter a valid 10-digit mobile / WhatsApp number.');
      valid = false;
    } else {
      setPhoneError(null);
    }

    return valid;
  };

  const handleRazorpayPayment = async () => {
    setSubmitError(null);
    if (!validateForm()) return;

    if (!hasRazorpayKey) {
      setSubmitError(
        'NEXT_PUBLIC_RAZORPAY_KEY_ID is not set. Use Demo Mode below to confirm.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Verify selected seats are still held & extend lock by 5 minutes
      const holdCheck = await verifyAndExtendHeldSeats(
        tripId,
        selectedSeats,
        currentSessionId
      );

      if (!holdCheck.ok) {
        setIsProcessing(false);
        onSeatsLost(holdCheck.lostSeats);
        setSubmitError(
          `Seat hold expired or taken for: ${holdCheck.lostSeats.join(', ')}. Please re-select available seats.`
        );
        return;
      }

      // 2. Dynamically load Razorpay Checkout.js
      const loaded = await loadRazorpayCheckoutScript();
      if (!loaded || !window.Razorpay) {
        setRazorpayLoadFailed(true);
        setIsProcessing(false);
        setSubmitError(
          'Unable to load Razorpay Checkout script (check internet/ad-blocker). You can retry or use Test ₹1 Demo Confirm below.'
        );
        return;
      }

      const cleanedPhone = passengerPhone.replace(/\D/g, '');
      const cleanName = passengerName.trim();

      const rzp = new window.Razorpay({
        key: razorpayKeyId,
        amount: selectedSeats.length * PRICE_PER_SEAT * 100, // paise
        currency: 'INR',
        name: BRAND_NAME,
        description: `${route.routeLabel} - Seats: ${selectedSeats.join(', ')}`,
        prefill: {
          name: cleanName,
          contact: cleanedPhone,
        },
        notes: {
          tripId,
          route: route.routeLabel,
          date,
          seats: selectedSeats.join(', '),
        },
        theme: {
          color: '#D84E55',
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async (response) => {
          try {
            const booking = await finalizeBooking({
              tripId,
              date,
              route,
              seats: selectedSeats,
              passengerName: cleanName,
              passengerPhone: cleanedPhone,
              currentSessionId,
              paymentMethod: 'razorpay',
              razorpayPaymentId: response.razorpay_payment_id,
            });
            setIsProcessing(false);
            onBookingConfirmed(booking);
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : 'Failed to save booking';
            setIsProcessing(false);
            setSubmitError(
              `Payment received (${response.razorpay_payment_id}), but saving ticket failed: ${msg}`
            );
          }
        },
      });

      rzp.on('payment.failed', (resp) => {
        setIsProcessing(false);
        setSubmitError(
          resp?.error?.description ?? 'Razorpay payment failed. Please try again.'
        );
      });

      rzp.open();
    } catch (err) {
      setIsProcessing(false);
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Could not initialize payment. Please try again.'
      );
    }
  };

  const handleDemoConfirm = async () => {
    setSubmitError(null);
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      const holdCheck = await verifyAndExtendHeldSeats(
        tripId,
        selectedSeats,
        currentSessionId
      );

      if (!holdCheck.ok) {
        setIsProcessing(false);
        onSeatsLost(holdCheck.lostSeats);
        setSubmitError(
          `Seat hold expired for: ${holdCheck.lostSeats.join(', ')}. Please re-select seats.`
        );
        return;
      }

      const booking = await finalizeBooking({
        tripId,
        date,
        route,
        seats: selectedSeats,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.replace(/\D/g, ''),
        currentSessionId,
        paymentMethod: 'demo',
      });
      setIsProcessing(false);
      onBookingConfirmed(booking);
    } catch (err) {
      setIsProcessing(false);
      setSubmitError(
        err instanceof Error ? err.message : 'Failed to confirm demo booking.'
      );
    }
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-[11px] font-bold text-[#B91C1C]">
              <Clock className="size-3" aria-hidden="true" />
              Hold active: <span className="font-mono">{formatCountdown(msRemaining)}</span>
            </span>
            <h2
              id="checkout-modal-title"
              className="mt-1.5 text-lg font-extrabold text-[#0F172A]"
            >
              Guest Passenger Checkout
            </h2>
            <p className="text-xs text-slate-600">
              No OTP or login needed — instant QR ticket after payment.
            </p>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            aria-label="Close checkout drawer"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-50"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Trip Summary */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-2 font-bold text-[#0F172A]">
            <span>{route.routeLabel}</span>
            <span className="font-mono text-[#D84E55]">
              {formatDisplayDate(date)}
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            {route.originStop} ({route.departureTime}) → {route.destinationStop} (
            {route.arrivalTime})
          </p>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/80 pt-2.5">
            <span>
              Selected Seats:{' '}
              <strong className="font-mono text-sm text-[#0F172A]">
                {selectedSeats.join(', ')}
              </strong>
            </span>
            <span className="text-sm font-extrabold text-[#0F172A]">
              Total: {CURRENCY_SYMBOL}
              {totalAmount}
            </span>
          </div>
        </div>

        {/* Guest Form */}
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (hasRazorpayKey) {
              void handleRazorpayPayment();
            } else {
              void handleDemoConfirm();
            }
          }}
          noValidate
        >
          <div>
            <label
              htmlFor="passenger-full-name"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              Passenger Full Name <span className="text-[#D84E55]">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="passenger-full-name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. Sameer Khan"
              value={passengerName}
              onChange={(e) => {
                setPassengerName(e.target.value);
                if (nameError) setNameError(null);
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'name-field-error' : undefined}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-[#0F172A] placeholder:text-slate-400 focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
            />
            {nameError ? (
              <p
                id="name-field-error"
                role="alert"
                className="mt-1 text-xs font-semibold text-[#B91C1C]"
              >
                {nameError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="passenger-mobile"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700"
            >
              10-Digit Mobile / WhatsApp Number{' '}
              <span className="text-[#D84E55]">*</span>
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#D84E55] focus-within:ring-2 focus-within:ring-[#D84E55]/25">
              <span className="border-r border-slate-200 px-3 font-mono text-sm font-bold text-slate-500">
                +91
              </span>
              <input
                id="passenger-mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                required
                placeholder="9876543210"
                value={passengerPhone}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPassengerPhone(digitsOnly);
                  if (phoneError) setPhoneError(null);
                }}
                aria-invalid={Boolean(phoneError)}
                aria-describedby={phoneError ? 'phone-field-error' : undefined}
                className="min-h-11 w-full rounded-r-xl bg-transparent px-3.5 py-2.5 font-mono text-sm font-semibold text-[#0F172A] placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            {phoneError ? (
              <p
                id="phone-field-error"
                role="alert"
                className="mt-1 text-xs font-semibold text-[#B91C1C]"
              >
                {phoneError}
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-500">
                Used to retrieve your QR ticket in My Tickets anytime.
              </p>
            )}
          </div>

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 bg-[#FFF1F2] p-3 text-xs text-[#881337]"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#D84E55]" aria-hidden="true" />
              <p className="leading-relaxed font-medium">{submitError}</p>
            </div>
          ) : null}

          <div className="space-y-2.5 pt-1">
            {hasRazorpayKey ? (
              <button
                type="submit"
                disabled={isProcessing}
                aria-busy={isProcessing}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D84E55] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#D84E55]/25 transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Securing Seats &amp; Opening Razorpay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="size-4" aria-hidden="true" />
                    <span>
                      Pay {CURRENCY_SYMBOL}
                      {totalAmount} via Razorpay
                    </span>
                  </>
                )}
              </button>
            ) : null}

            {!hasRazorpayKey || razorpayLoadFailed ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleDemoConfirm}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#D84E55] bg-[#FFF1F2] px-5 py-3 text-sm font-extrabold text-[#B91C1C] transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Confirming Demo Ticket...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" aria-hidden="true" />
                    <span>Test {CURRENCY_SYMBOL}1 Instant Confirm (Demo Mode)</span>
                  </>
                )}
              </button>
            ) : null}

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden="true" />
              <span>Seat lock automatically extends before payment opens</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
