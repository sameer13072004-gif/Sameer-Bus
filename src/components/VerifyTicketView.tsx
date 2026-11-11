'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/config/busConfig';
import { formatDisplayDate } from '@/lib/dateUtils';
import { getBookingById } from '@/lib/firebase';
import type { BookingRecord } from '@/types/booking';

interface VerifyTicketViewProps {
  initialBookingId?: string;
}

export function VerifyTicketView({ initialBookingId = '' }: VerifyTicketViewProps) {
  const [inputCode, setInputCode] = useState(initialBookingId);
  const [isLoading, setIsLoading] = useState(() => Boolean(initialBookingId.trim()));
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchedId, setSearchedId] = useState<string | null>(null);

  const performLookup = useCallback(async (rawId: string) => {
    const trimmed = rawId.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('Enter a Booking ID (e.g., SB-8K4P9Q).');
      return;
    }

    const normalized = trimmed.startsWith('SB-') ? trimmed : `SB-${trimmed}`;
    setInputCode(normalized);
    setErrorMsg(null);
    setIsLoading(true);
    setSearchedId(normalized);

    try {
      const record = await getBookingById(normalized);
      setBooking(record);
      if (!record) {
        setErrorMsg(`No paid ticket found with Booking ID "${normalized}".`);
      }
    } catch (err) {
      setBooking(null);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to verify ticket. Check connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const trimmed = initialBookingId.trim().toUpperCase();
    if (!trimmed) return;

    let cancelled = false;
    const normalized = trimmed.startsWith('SB-') ? trimmed : `SB-${trimmed}`;

    getBookingById(normalized)
      .then((record) => {
        if (cancelled) return;
        setInputCode(normalized);
        setSearchedId(normalized);
        setBooking(record);
        setErrorMsg(
          record ? null : `No paid ticket found with Booking ID "${normalized}".`
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setBooking(null);
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Failed to verify ticket. Check connection and try again.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialBookingId]);

  return (
    <div className="space-y-4">
      <section
        aria-label="Driver QR and booking ID verification"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#D84E55]">
            <QrCode className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0F172A]">
              Verify QR / Driver Mode
            </h2>
            <p className="text-xs text-slate-600">
              Scan passenger QR code or type Booking ID to verify boarding &amp;
              seat numbers.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void performLookup(inputCode);
          }}
          className="mt-4 flex flex-col gap-2.5 sm:flex-row"
        >
          <div className="flex-1">
            <label htmlFor="verify-booking-id" className="sr-only">
              Booking ID
            </label>
            <input
              id="verify-booking-id"
              type="text"
              placeholder="Enter Booking ID (e.g. SB-8K4P9Q)"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-wider text-[#0F172A] placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-[#D84E55] focus:outline-none focus:ring-2 focus:ring-[#D84E55]/25"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Search className="size-4" aria-hidden="true" />
                <span>Verify Ticket</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Verification Result */}
      {isLoading ? (
        <div
          aria-busy="true"
          className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center"
        >
          <Loader2 className="size-8 animate-spin text-[#D84E55]" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-slate-700">
            Checking live ticket database...
          </p>
        </div>
      ) : booking ? (
        <section
          aria-label="Verified ticket details"
          className="overflow-hidden rounded-3xl border-2 border-emerald-500 bg-white shadow-lg"
        >
          {/* High-Contrast Green VERIFIED & PAID Banner */}
          <div className="bg-[#059669] px-5 py-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#059669] shadow-sm">
                  <BadgeCheck className="size-8 stroke-[2.5]" aria-hidden="true" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white">
                    <ShieldCheck className="size-3.5" aria-hidden="true" />
                    Authentic Boarding Pass
                  </span>
                  <h3 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                    VERIFIED &amp; PAID
                  </h3>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-950/35 px-3.5 py-2 text-right">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                  Booking ID
                </span>
                <span className="font-mono text-base font-extrabold text-white">
                  {booking.bookingId}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {/* Prominent Seat Numbers for Driver/Conductor */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                Confirmed Seat Numbers ({booking.seats.length})
              </span>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {booking.seats.map((seat) => (
                  <span
                    key={seat}
                    className="inline-flex min-w-14 items-center justify-center rounded-xl bg-[#059669] px-3.5 py-2 font-mono text-xl font-black text-white shadow-xs"
                  >
                    {seat}
                  </span>
                ))}
              </div>
            </div>

            {/* Passenger & Trip Details */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <User className="size-3.5 text-slate-400" aria-hidden="true" />
                  Passenger Name
                </span>
                <p className="mt-1 text-base font-extrabold text-[#0F172A]">
                  {booking.passengerName}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <Phone className="size-3.5 text-slate-400" aria-hidden="true" />
                  Mobile Number
                </span>
                <p className="mt-1 font-mono text-base font-extrabold text-[#0F172A]">
                  +91 {booking.passengerPhone}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <Calendar className="size-3.5 text-slate-400" aria-hidden="true" />
                  Journey Date &amp; Time
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A]">
                  {formatDisplayDate(booking.date)}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-600">
                  <Clock className="size-3" aria-hidden="true" />
                  {booking.departureTime} → {booking.arrivalTime}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <MapPin className="size-3.5 text-[#D84E55]" aria-hidden="true" />
                  Route &amp; Fare
                </span>
                <p className="mt-1 text-sm font-bold text-[#0F172A]">
                  {booking.routeLabel}
                </p>
                <p className="mt-0.5 text-xs font-bold text-emerald-700">
                  Amount Paid: {CURRENCY_SYMBOL}
                  {booking.amountPaid} (PAID)
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600">
              <p>
                <strong className="text-[#0F172A]">Boarding:</strong>{' '}
                {booking.originStop}
              </p>
              <p className="mt-1">
                <strong className="text-[#0F172A]">Dropping:</strong>{' '}
                {booking.destinationStop}
              </p>
            </div>
          </div>
        </section>
      ) : errorMsg ? (
        <div
          role="alert"
          className="rounded-2xl border-2 border-rose-300 bg-[#FFF1F2] p-5 text-center"
        >
          <AlertTriangle
            className="mx-auto size-8 text-[#B91C1C]"
            aria-hidden="true"
          />
          <h3 className="mt-2 text-base font-extrabold text-[#881337]">
            Verification Failed {searchedId ? `(${searchedId})` : ''}
          </h3>
          <p className="mt-1 text-xs font-medium text-[#881337]">{errorMsg}</p>
        </div>
      ) : null}
    </div>
  );
}
