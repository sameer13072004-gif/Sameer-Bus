'use client';

import { useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  BadgeCheck,
  Bus,
  Calendar,
  Check,
  Clock,
  Download,
  Loader2,
  MapPin,
  Phone,
  Ticket,
  User,
} from 'lucide-react';
import {
  BUS_NAME,
  CURRENCY_SYMBOL,
  buildStaffVerifyQrUrl,
} from '@/config/busConfig';
import { formatDisplayDate } from '@/lib/dateUtils';
import { downloadTicketPng } from '@/lib/ticketDownload';
import type { BookingRecord } from '@/types/booking';

interface TicketPassCardProps {
  booking: BookingRecord;
}

export function TicketPassCard({ booking }: TicketPassCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedRecently, setDownloadedRecently] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const qrCanvasHostRef = useRef<HTMLDivElement | null>(null);

  const seatCount = booking.seats.length;
  const ticketLabel = `${seatCount} ${seatCount === 1 ? 'Ticket' : 'Tickets'} • ${
    seatCount === 1 ? 'Seat' : 'Seats'
  }: ${booking.seats.join(', ')}`;
  const qrUrl = buildStaffVerifyQrUrl(booking.bookingId, seatCount);

  const handleDownloadPng = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const qrCanvas = qrCanvasHostRef.current?.querySelector('canvas') ?? null;
      await downloadTicketPng(booking, qrCanvas);
      setDownloadedRecently(true);
      window.setTimeout(() => setDownloadedRecently(false), 3000);
    } catch (err) {
      setDownloadError(
        err instanceof Error
          ? err.message
          : 'Could not save ticket image. Please take a screenshot instead.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Off-screen high-resolution QRCodeCanvas used for crisp PNG generation */}
      <div ref={qrCanvasHostRef} className="sr-only" aria-hidden="true">
        <QRCodeCanvas
          value={qrUrl}
          size={320}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#0F172A"
        />
      </div>

      <article
        aria-label={`Boarding pass ${booking.bookingId}`}
        className="print-ticket-container overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
      >
        {/* Top Crimson Ticket Banner */}
        <div className="bg-linear-to-r from-[#D84E55] to-[#B91C1C] px-5 py-4 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-white/15">
                <Bus className="size-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/85">
                  {BUS_NAME}
                </p>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-emerald-300" aria-hidden="true" />
                  <span className="text-sm font-extrabold tracking-tight">
                    Confirmed Boarding Pass
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/15 px-3 py-1.5 text-right backdrop-blur-xs">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/80">
                Booking ID
              </span>
              <span className="text-sm font-extrabold tracking-wide text-white">
                {booking.bookingId}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Summary Body */}
        <div className="px-5 pt-5 pb-4">
          {/* Route & Payment Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                {booking.amountPaid} • {booking.status}
              </span>
            </div>
          </div>

          {/* Prominent Total Tickets / Seats Strip */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-[#FFF1F2] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#D84E55] text-white">
                <Ticket className="size-4" aria-hidden="true" />
              </div>
              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#B91C1C]">
                  Passengers &amp; Seats
                </span>
                <p className="text-base font-extrabold text-[#0F172A]">
                  {ticketLabel}
                </p>
              </div>
            </div>
          </div>

          {/* Boarding & Dropping Stops */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="size-3.5 text-[#D84E55]" aria-hidden="true" />
                <span>Boarding Point</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#0F172A]">
                {booking.originStop}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#B91C1C]">
                <Clock className="size-3" aria-hidden="true" />
                Departs {booking.departureTime}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="size-3.5 text-emerald-600" aria-hidden="true" />
                <span>Dropping Point</span>
              </div>
              <p className="mt-1 text-sm font-bold text-[#0F172A]">
                {booking.destinationStop}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Clock className="size-3" aria-hidden="true" />
                Arrives {booking.arrivalTime}
              </p>
            </div>
          </div>

          {/* Date, Passenger & Mobile */}
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:grid-cols-3">
            <div>
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Calendar className="size-3" aria-hidden="true" />
                Date
              </span>
              <p className="mt-0.5 text-sm font-bold text-[#0F172A]">
                {formatDisplayDate(booking.date)}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <User className="size-3" aria-hidden="true" />
                Passenger
              </span>
              <p className="mt-0.5 truncate text-sm font-bold text-[#0F172A]">
                {booking.passengerName}
              </p>
            </div>

            <div>
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Phone className="size-3" aria-hidden="true" />
                Mobile
              </span>
              <p className="mt-0.5 text-sm font-bold text-[#0F172A] tabular-nums">
                +91 {booking.passengerPhone}
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

        {/* Scannable QR Code + Download Button */}
        <div className="bg-slate-50/75 px-5 pt-4 pb-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-2.5 shadow-2xs">
                <QRCodeSVG
                  value={qrUrl}
                  size={112}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#0F172A"
                  title={`Boarding QR code for ${booking.bookingId}`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#0F172A]">
                  Show QR to Conductor
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Booking ID: <strong className="text-[#0F172A]">{booking.bookingId}</strong>
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                  {seatCount} {seatCount === 1 ? 'Passenger' : 'Passengers'} • Paid{' '}
                  {CURRENCY_SYMBOL}
                  {booking.amountPaid}
                </p>
              </div>
            </div>
          </div>

          {/* One-Tap Download Ticket to Phone CTA */}
          <div className="no-print mt-4 border-t border-slate-200/80 pt-4">
            <button
              type="button"
              disabled={isDownloading}
              onClick={handleDownloadPng}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#D84E55] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#D84E55]/20 transition-colors hover:bg-[#B91C1C] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2 disabled:opacity-70"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Preparing Ticket Image...</span>
                </>
              ) : downloadedRecently ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  <span>Saved to Phone!</span>
                </>
              ) : (
                <>
                  <Download className="size-4" aria-hidden="true" />
                  <span>Download Ticket (PNG)</span>
                </>
              )}
            </button>

            <p className="mt-2 text-center text-xs text-slate-500">
              Download your ticket or take a screenshot to show when boarding.
            </p>

            {downloadError ? (
              <p
                role="alert"
                className="mt-2 text-center text-xs font-semibold text-[#B91C1C]"
              >
                {downloadError}
              </p>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
