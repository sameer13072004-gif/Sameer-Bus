'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Ticket,
} from 'lucide-react';
import { CURRENCY_SYMBOL } from '@/config/busConfig';
import { formatShortDate } from '@/lib/dateUtils';
import { findBookingsByPhone, findBookingsByUserId } from '@/lib/firebase';
import type { AuthUserProfile, BookingRecord } from '@/types/booking';
import { TicketPassCard } from './TicketPassCard';

interface MyTicketsViewProps {
  localBookings: BookingRecord[];
  authUser: AuthUserProfile | null;
  onBackToBooking: () => void;
}

function TicketListRow({
  booking,
  defaultExpanded = false,
}: {
  booking: BookingRecord;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const seatCount = booking.seats.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-[#FFF1F2] px-2.5 py-0.5 text-xs font-extrabold text-[#B91C1C]">
              {booking.bookingId}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
              {booking.status} • {CURRENCY_SYMBOL}
              {booking.amountPaid}
            </span>
          </div>

          <h3 className="mt-2 text-base font-extrabold text-[#0F172A]">
            {booking.routeLabel}
          </h3>
          <p className="mt-0.5 text-xs font-medium text-slate-600">
            {formatShortDate(booking.date)} • {booking.departureTime} •{' '}
            <strong className="text-[#D84E55]">
              {seatCount} {seatCount === 1 ? 'Ticket' : 'Tickets'} (
              {booking.seats.join(', ')})
            </strong>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {booking.passengerName} (+91 {booking.passengerPhone})
          </p>
        </div>

        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#D84E55] bg-[#FFF1F2] px-4 py-2 text-xs font-extrabold text-[#B91C1C] transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
        >
          <span>{expanded ? 'Hide Ticket' : 'View / Download QR'}</span>
          {expanded ? (
            <ChevronUp className="size-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
          <TicketPassCard booking={booking} />
        </div>
      ) : null}
    </div>
  );
}

export function MyTicketsView({
  localBookings,
  authUser,
  onBackToBooking,
}: MyTicketsViewProps) {
  const [phoneQuery, setPhoneQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedPhone, setSearchedPhone] = useState<string | null>(null);
  const [remoteResults, setRemoteResults] = useState<BookingRecord[]>([]);

  const [accountSnapshot, setAccountSnapshot] = useState<{
    uid: string;
    records: BookingRecord[];
  }>({ uid: '', records: [] });

  const authUid = authUser?.uid ?? '';

  useEffect(() => {
    if (!authUid) return;

    let cancelled = false;
    findBookingsByUserId(authUid)
      .then((records) => {
        if (!cancelled) {
          setAccountSnapshot({ uid: authUid, records });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccountSnapshot({ uid: authUid, records: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authUid]);

  const accountBookings =
    authUid && accountSnapshot.uid === authUid ? accountSnapshot.records : [];
  const isAccountLoading = Boolean(authUid && accountSnapshot.uid !== authUid);

  const handlePhoneSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneQuery.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      setSearchError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSearchError(null);
    setIsSearching(true);

    try {
      const results = await findBookingsByPhone(digits);
      setRemoteResults(results);
      setSearchedPhone(digits);
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Could not search bookings right now. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBackToBooking}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#0F172A] shadow-2xs transition-colors hover:border-[#D84E55] hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Book a Ticket</span>
        </button>

        <h2 className="text-base font-extrabold text-[#0F172A]">My Tickets</h2>
      </div>

      {/* Find Ticket by Mobile Number */}
      <section
        aria-label="Find ticket by mobile number"
        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
      >
        <h3 className="text-base font-extrabold text-[#0F172A]">
          Find Ticket by Mobile Number
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Enter the 10-digit mobile number used during booking to download your QR
          ticket.
        </p>

        <form
          onSubmit={handlePhoneSearch}
          className="mt-3.5 flex flex-col gap-2.5 sm:flex-row"
        >
          <div className="flex flex-1 items-center rounded-xl border border-slate-300 bg-white focus-within:border-[#D84E55] focus-within:ring-2 focus-within:ring-[#D84E55]/25">
            <span className="border-r border-slate-200 px-3 text-base font-semibold text-slate-500">
              +91
            </span>
            <label htmlFor="find-ticket-phone" className="sr-only">
              10-digit mobile number
            </label>
            <input
              id="find-ticket-phone"
              type="tel"
              inputMode="tel"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phoneQuery}
              onChange={(e) => {
                setPhoneQuery(e.target.value.replace(/\D/g, '').slice(0, 10));
                if (searchError) setSearchError(null);
              }}
              className="min-h-12 w-full rounded-r-xl bg-transparent px-3.5 py-2 text-base font-semibold text-[#0F172A] placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D84E55] px-5 py-2.5 text-sm font-extrabold text-white shadow-xs transition-colors hover:bg-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-60"
          >
            {isSearching ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span>Finding...</span>
              </>
            ) : (
              <>
                <Search className="size-4" aria-hidden="true" />
                <span>Find Ticket</span>
              </>
            )}
          </button>
        </form>

        {searchError ? (
          <div
            role="alert"
            className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-[#FFF1F2] p-3 text-xs font-semibold text-[#881337]"
          >
            <AlertCircle className="size-4 shrink-0 text-[#D84E55]" aria-hidden="true" />
            <span>{searchError}</span>
          </div>
        ) : null}

        {searchedPhone !== null ? (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>
                Results for +91 {searchedPhone} ({remoteResults.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchedPhone(null);
                  setRemoteResults([]);
                }}
                className="text-[#D84E55] hover:underline"
              >
                Clear
              </button>
            </div>

            {remoteResults.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-medium text-slate-600">
                No confirmed tickets found for{' '}
                <span className="font-bold">+91 {searchedPhone}</span>.
              </p>
            ) : (
              <div className="space-y-3">
                {remoteResults.map((booking, idx) => (
                  <TicketListRow
                    key={booking.bookingId}
                    booking={booking}
                    defaultExpanded={idx === 0}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Account-Synced Tickets when signed in */}
      {authUser ? (
        <section
          aria-label="Tickets synced to your account"
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Account Tickets ({accountBookings.length})
            </h3>
            {authUser.email ? (
              <span className="truncate text-xs font-medium text-slate-500">
                {authUser.email}
              </span>
            ) : null}
          </div>

          {isAccountLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-xs font-semibold text-slate-500">
              <Loader2 className="size-4 animate-spin text-[#D84E55]" aria-hidden="true" />
              <span>Loading your account tickets...</span>
            </div>
          ) : accountBookings.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">
              Tickets you book while signed in appear automatically across devices.
            </p>
          ) : (
            <div className="space-y-3">
              {accountBookings.map((booking, idx) => (
                <TicketListRow
                  key={booking.bookingId}
                  booking={booking}
                  defaultExpanded={idx === 0 && localBookings.length === 0}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Saved Tickets on This Phone */}
      <section aria-label="Saved tickets on this device" className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Saved on This Device ({localBookings.length})
        </h3>

        {localBookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#D84E55]">
              <Ticket className="size-6" aria-hidden="true" />
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-[#0F172A]">
              No tickets saved on this device yet
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Book a seat or look up an existing ticket using your mobile number
              above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {localBookings.map((booking, idx) => (
              <TicketListRow
                key={booking.bookingId}
                booking={booking}
                defaultExpanded={idx === 0}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
