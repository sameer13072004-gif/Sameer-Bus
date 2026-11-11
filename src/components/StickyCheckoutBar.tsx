'use client';

import { ArrowRight, Clock, Trash2 } from 'lucide-react';
import { CURRENCY_SYMBOL, PRICE_PER_SEAT } from '@/config/busConfig';
import { formatCountdown } from '@/lib/dateUtils';

interface StickyCheckoutBarProps {
  selectedSeats: string[];
  msRemaining: number;
  isReleasing: boolean;
  onClearSeats: () => void;
  onProceedToPay: () => void;
}

export function StickyCheckoutBar({
  selectedSeats,
  msRemaining,
  isReleasing,
  onClearSeats,
  onProceedToPay,
}: StickyCheckoutBarProps) {
  if (selectedSeats.length === 0) return null;

  const totalAmount = selectedSeats.length * PRICE_PER_SEAT;
  const isUrgent = msRemaining <= 60_000;

  return (
    <div
      role="region"
      aria-label="Seat hold countdown and checkout"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md"
    >
      <div className="mx-auto max-w-4xl px-3.5 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">
        {/* Top Countdown Strip */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              isUrgent
                ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                : 'bg-[#FFF1F2] text-[#B91C1C]'
            }`}
          >
            <Clock
              className={`size-3.5 ${isUrgent ? 'animate-pulse motion-reduce:animate-none' : ''}`}
              aria-hidden="true"
            />
            <span>5-min hold expires in</span>
            <span className="font-mono tabular-nums font-extrabold">
              {formatCountdown(msRemaining)}
            </span>
          </div>

          <button
            type="button"
            disabled={isReleasing}
            onClick={onClearSeats}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] disabled:opacity-50"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            <span>Release</span>
          </button>
        </div>

        {/* Bottom CTA Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs font-semibold text-slate-500">
                Seats:
              </span>
              <span className="truncate font-mono text-sm font-extrabold text-[#0F172A]">
                {selectedSeats.join(', ')}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'} ×{' '}
              {CURRENCY_SYMBOL}
              {PRICE_PER_SEAT} ={' '}
              <span className="font-extrabold text-[#0F172A]">
                {CURRENCY_SYMBOL}
                {totalAmount}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onProceedToPay}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#D84E55] px-5 py-3 text-sm font-extrabold text-white shadow-md shadow-[#D84E55]/25 transition-all duration-150 hover:bg-[#B91C1C] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2"
          >
            <span>
              Pay {CURRENCY_SYMBOL}
              {totalAmount}
            </span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
