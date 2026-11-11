'use client';

import { useSyncExternalStore } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  BadgeCheck,
  Bus,
  Calendar,
  Clock,
  MapPin,
  Printer,
  Ticket,
  User,
  Phone,
} from 'lucide-react';
import { BUS_NAME, CURRENCY_SYMBOL } from '@/config/busConfig';
import { formatDisplayDate } from '@/lib/dateUtils';
import type { BookingRecord } from '@/types/booking';
import { HelpArrivalCard } from './HelpArrivalCard';

interface TicketPassCardProps {
  booking: BookingRecord;
  showHelpCard?: boolean;
}

const subscribeNoop = () => () => {};

export function TicketPassCard({
  booking,
  showHelpCard = true,
}: TicketPassCardProps) {
  const origin = useSyncExternalStore(
    subscribeNoop,
    () => window.location.origin,
    () => ''
  );

  const verifyUrl = origin
    ? `${origin}/verify?id=${encodeURIComponent(booking.bookingId)}`
    : `/verify?id=${encodeURIComponent(booking.bookingId)}`;

  return (
    <div className="space-y-4">
      <article
        aria-label={`Boarding pass ${booking.bookingId}`}
        className="print-ticket-container overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
      >
        {/* Top Crimson Ticket Banner */}
        <div className="bg-linear-to-r from-[#D84E55] to-[#B91C1C] px-5 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                <Bus className="size-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/85">
                  {BUS_NAME}
                </p>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-emerald-300" aria-hidden="true" />
                  <span className="text-sm font-extrabold tracking-tight">
                    Sameer Bus Verified Ticket
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/15 px-3 py-1.5 text-right backdrop-blur-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/80">
                Booking ID
              </span>
              <span className="font-mono text-sm font-extrabold tracking-wide text-white">
                {booking.bookingId}
              </span>
            </div>
          </div>
        </div>

        {/* Route & Schedule Summary */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Route
              </span>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                {booking.routeLabel}
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              <span>
                {CURRENCY_SYMBOL}
                {booking.pricePerSeat}/seat — {booking.status}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <MapPin className="size-3.5 text-[#D84E55]" aria-hidden="true" />
                <span>Boarding Point</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#0F172A]">
                {booking.originStop}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#B91C1C]">
                <Clock className="size-3" aria-hidden="true" />
                Departs {booking.departureTime}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <MapPin className="size-3.5 text-emerald-600" aria-hidden="true" />
                <span>Dropping Point</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#0F172A]">
                {booking.destinationStop}
              </p>
              <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-600">
                <Clock className="size-3" aria-hidden="true" />
                Arrives {booking.arrivalTime}
              </p>
            </div>
          </div>

          {/* Date, Seats, Passenger & Paid */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:grid-cols-4">
            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Calendar className="size-3" aria-hidden="true" />
                Date
              </span>
              <p className="mt-1 text-xs font-bold text-[#0F172A]">
                {formatDisplayDate(booking.date)}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Ticket className="size-3" aria-hidden="true" />
                Seat(s)
              </span>
              <p className="mt-1 font-mono text-sm font-extrabold text-[#D84E55]">
                {booking.seats.join(', ')}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <User className="size-3" aria-hidden="true" />
                Passenger
              </span>
              <p className="mt-1 truncate text-xs font-bold text-[#0F172A]">
                {booking.passengerName}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <Phone className="size-3" aria-hidden="true" />
                Mobile
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-[#0F172A]">
                {booking.passengerPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Perforated Tear Divider */}
        <div className="relative flex items-center py-1">
          <div
            aria-hidden="true"
            className="-ml-3 size-6 shrink-0 rounded-full border border-slate-200 bg-[#F8FAFC]"
          />
          <div className="w-full border-t-2 border-dashed border-slate-300" />
          <div
            aria-hidden="true"
            className="-mr-3 size-6 shrink-0 rounded-full border border-slate-200 bg-[#F8FAFC]"
          />
        </div>

        {/* Bottom QR Code & Print Action */}
        <div className="flex flex-col items-center gap-4 bg-slate-50/70 px-5 pt-3 pb-5 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border-2 border-slate-200 bg-white p-2.5 shadow-2xs">
              <QRCodeSVG
                value={verifyUrl}
                size={104}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0F172A"
                title={`QR verification code for ${booking.bookingId}`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                Show QR to Bus Conductor
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Total Paid:{' '}
                <span className="font-mono font-extrabold text-emerald-700">
                  {CURRENCY_SYMBOL}
                  {booking.amountPaid} ({booking.status})
                </span>
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                ID: {booking.bookingId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-[#0F172A] shadow-2xs transition-colors hover:border-[#D84E55] hover:bg-[#FFF1F2] hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] sm:w-auto"
          >
            <Printer className="size-4" aria-hidden="true" />
            <span>Download / Print Ticket</span>
          </button>
        </div>
      </article>

      {showHelpCard ? <HelpArrivalCard booking={booking} /> : null}
    </div>
  );
}
