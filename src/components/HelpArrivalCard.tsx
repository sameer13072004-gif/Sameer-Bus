'use client';

import { MessageCircle, PhoneCall } from 'lucide-react';
import {
  BRAND_NAME,
  BUS_ROUTES,
  SUPPORT_CONTACT,
  buildWhatsAppInquiryUrl,
} from '@/config/busConfig';
import type { BookingRecord } from '@/types/booking';

interface HelpArrivalCardProps {
  booking?: BookingRecord;
  compact?: boolean;
}

export function HelpArrivalCard({ booking, compact = false }: HelpArrivalCardProps) {
  const whatsappUrl = booking
    ? buildWhatsAppInquiryUrl({
        bookingId: booking.bookingId,
        routeLabel: booking.routeLabel,
        date: booking.date,
        seats: booking.seats,
      })
    : `https://wa.me/${SUPPORT_CONTACT.whatsappDigits}?text=${encodeURIComponent(
        `Hello ${BRAND_NAME} Team, I need help checking live bus arrival/departure status.`
      )}`;

  return (
    <div
      className={`no-print rounded-2xl border border-rose-200 bg-[#FFF1F2] ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#0F172A]">
            Need Help or Confirm Bus Arrival Time?
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-700">
            Message or call the {BRAND_NAME} desk directly on{' '}
            <span className="font-mono font-bold text-[#B91C1C]">
              {SUPPORT_CONTACT.phoneDisplay}
            </span>{' '}
            for live bus location & boarding updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#15803D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2 sm:flex-initial"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>WhatsApp Help ({SUPPORT_CONTACT.phoneDisplay})</span>
          </a>

          <a
            href={SUPPORT_CONTACT.telHref}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#D84E55] bg-white px-4 py-2.5 text-xs font-extrabold text-[#B91C1C] transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2 sm:flex-initial"
          >
            <PhoneCall className="size-4 shrink-0" aria-hidden="true" />
            <span>Call Support ({SUPPORT_CONTACT.phoneDisplay})</span>
          </a>
        </div>
      </div>

      {!booking ? (
        <p className="mt-2 border-t border-rose-200/70 pt-2 text-[11px] text-slate-600">
          Boarding points: {BUS_ROUTES.NOIDA_RAMPUR.originStop} &amp;{' '}
          {BUS_ROUTES.RAMPUR_NOIDA.originStop}
        </p>
      ) : null}
    </div>
  );
}
