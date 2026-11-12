'use client';

import { memo, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  CURRENCY_SYMBOL,
  PRICE_PER_SEAT,
  type BusRoute,
} from '@/config/busConfig';
import { formatShortDate } from '@/lib/dateUtils';
import { getRazorpayKeyId } from '@/lib/razorpay';

export interface CheckoutSubmitPayload {
  passengerName: string;
  passengerPhone: string;
  mode: 'razorpay' | 'demo';
}

interface CheckoutDrawerProps {
  date: string;
  route: BusRoute;
  selectedSeats: string[];
  defaultName?: string;
  razorpayLoadFailed?: boolean;
  onClose: () => void;
  onSubmitPayment: (payload: CheckoutSubmitPayload) => void;
}

const TEN_DIGIT_PHONE_RE = /^\d{10}$/;

export const CheckoutDrawer = memo(function CheckoutDrawerInner({
  date,
  route,
  selectedSeats,
  defaultName = '',
  razorpayLoadFailed = false,
  onClose,
  onSubmitPayment,
}: CheckoutDrawerProps) {
  const [passengerName, setPassengerName] = useState(defaultName);
  const [passengerPhone, setPassengerPhone] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const hasRazorpayKey = getRazorpayKeyId().length > 0;
  const totalAmount = selectedSeats.length * PRICE_PER_SEAT;
  const ticketCountLabel = `${selectedSeats.length} ${
    selectedSeats.length === 1 ? 'Ticket' : 'Tickets'
  }`;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const validateForm = (): boolean => {
    let valid = true;
    const trimmedName = passengerName.trim();
    const cleanedPhone = passengerPhone.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setNameError('Please enter passenger full name.');
      valid = false;
    } else {
      setNameError(null);
    }

    if (!TEN_DIGIT_PHONE_RE.test(cleanedPhone)) {
      setPhoneError('Enter a valid 10-digit mobile number.');
      valid = false;
    } else {
      setPhoneError(null);
    }

    return valid;
  };

  const triggerPayment = (mode: 'razorpay' | 'demo') => {
    if (!validateForm()) return;

    // Blur focused input immediately so the mobile keyboard begins dismissing
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement | null)?.blur();
    }

    onSubmitPayment({
      passengerName: passengerName.trim(),
      passengerPhone: passengerPhone.replace(/\D/g, ''),
      mode,
    });
  };

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        {/* Clean Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <h2
            id="checkout-modal-title"
            className="text-xl font-extrabold text-[#0F172A]"
          >
            Passenger Details
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close passenger details"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Concise Trip & Seats Summary */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between gap-2 text-sm font-bold text-[#0F172A]">
            <span>{route.shortLabel}</span>
            <span className="text-[#D84E55]">{formatShortDate(date)}</span>
          </div>
          <p className="mt-1 text-xs font-medium text-slate-600">
            Departs {route.departureTime} • {route.originStop}
          </p>
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-sm">
            <span className="font-semibold text-slate-700">
              {ticketCountLabel} ({selectedSeats.join(', ')})
            </span>
            <span className="font-extrabold text-[#0F172A]">
              {CURRENCY_SYMBOL}
              {totalAmount}
            </span>
          </div>
        </div>

        {/* Clean Form — No autoFocus, No focus effects, No extra helper text */}
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            triggerPayment(hasRazorpayKey ? 'razorpay' : 'demo');
          }}
          noValidate
        >
          <div>
            <label
              htmlFor="passenger-full-name"
              className="block text-sm font-bold text-slate-800"
            >
              Passenger Full Name <span className="text-[#D84E55]">*</span>
            </label>
            <input
              id="passenger-full-name"
              type="text"
              required
              autoComplete="name"
              placeholder="Enter full name"
              value={passengerName}
              onChange={(e) => {
                setPassengerName(e.target.value);
                if (nameError) setNameError(null);
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'name-field-error' : undefined}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base font-medium text-[#0F172A] placeholder:text-slate-400 focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
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
              className="block text-sm font-bold text-slate-800"
            >
              10-Digit Mobile Number <span className="text-[#D84E55]">*</span>
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#D84E55] focus-within:ring-2 focus-within:ring-[#D84E55]/25">
              <span className="border-r border-slate-200 px-3.5 text-base font-semibold text-slate-500">
                +91
              </span>
              <input
                id="passenger-mobile"
                type="tel"
                inputMode="tel"
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
                className="min-h-12 w-full rounded-r-xl bg-transparent px-3.5 py-2.5 text-base font-semibold text-[#0F172A] placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
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
            ) : null}
          </div>

          <div className="space-y-2.5 pt-2">
            {hasRazorpayKey ? (
              <button
                type="submit"
                className="inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-[#D84E55] px-5 py-3.5 text-base font-extrabold text-white shadow-md shadow-[#D84E55]/25 transition-colors hover:bg-[#B91C1C] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2"
              >
                Pay {CURRENCY_SYMBOL}
                {totalAmount}
              </button>
            ) : null}

            {!hasRazorpayKey || razorpayLoadFailed ? (
              <button
                type="button"
                onClick={() => triggerPayment('demo')}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-[#D84E55] bg-[#FFF1F2] px-5 py-3 text-sm font-extrabold text-[#B91C1C] transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
              >
                Test {CURRENCY_SYMBOL}
                {totalAmount} Instant Confirm (Demo)
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
});
