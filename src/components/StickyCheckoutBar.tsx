'use client';

import { ArrowRight } from 'lucide-react';
import { CURRENCY_SYMBOL, PRICE_PER_SEAT } from '@/config/busConfig';

interface StickyCheckoutBarProps {
  selectedSeats: string[];
  isReleasing: boolean;
  onClearSeats: () => void;
  onProceedToPay: () => void;
}

export function StickyCheckoutBar({
  selectedSeats,
  isReleasing,
  onClearSeats,
  onProceedToPay,
}: StickyCheckoutBarProps) {
  if (selectedSeats.length === 0) return null;

  const count = selectedSeats.length;
  const totalAmount = count * PRICE_PER_SEAT;
  const ticketNoun = count === 1 ? 'Ticket' : 'Tickets';

  return (
    <div
      role="region"
      aria-label="Selected seats summary"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.1)] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#0F172A]">
            Selected: {selectedSeats.join(', ')} ({count} {ticketNoun})
          </p>
          <button
            type="button"
            disabled={isReleasing}
            onClick={onClearSeats}
            className="mt-0.5 inline-flex min-h-7 items-center text-xs font-semibold text-[#D84E55] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-50"
          >
            {isReleasing ? 'Clearing...' : 'Clear'}
          </button>
        </div>

        <button
          type="button"
          onClick={onProceedToPay}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#D84E55] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#D84E55]/25 transition-all duration-150 hover:bg-[#B91C1C] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2"
        >
          <span>
            Continue • {CURRENCY_SYMBOL}
            {totalAmount}
          </span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
