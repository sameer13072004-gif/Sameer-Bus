'use client';

import {
  Check,
  DoorOpen,
  Lock,
  RefreshCw,
  UserCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  LEFT_COLUMNS,
  RIGHT_COLUMNS,
  TOTAL_ROWS,
  PRICE_PER_SEAT,
  CURRENCY_SYMBOL,
} from '@/config/busConfig';
import { getEffectiveSeatState } from '@/lib/firebase';
import type { EffectiveSeatState, TripSeatsMap } from '@/types/booking';

interface BusSeatDeckProps {
  seatsMap: TripSeatsMap;
  currentSessionId: string;
  pendingSeatIds: Set<string>;
  nowMs: number;
  isLoading: boolean;
  syncError: string | null;
  onSeatTap: (seatId: string, state: EffectiveSeatState) => void;
}

function SteeringWheelIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      width="24"
      height="24"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3v6.8" />
      <path d="M5.2 15.8l5-2.8" />
      <path d="M18.8 15.8l-5-2.8" />
    </svg>
  );
}

const SEAT_STATE_STYLES: Record<EffectiveSeatState, string> = {
  available:
    'border-[#D84E55] bg-white text-[#0F172A] hover:bg-[#FFF1F2] hover:scale-[1.03] active:scale-95 shadow-xs cursor-pointer',
  selected:
    'border-[#B91C1C] bg-[#D84E55] text-white hover:bg-[#B91C1C] hover:scale-[1.03] active:scale-95 shadow-sm cursor-pointer',
  held_by_other:
    'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E] cursor-not-allowed opacity-95',
  booked:
    'border-slate-300 bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed',
};

export function BusSeatDeck({
  seatsMap,
  currentSessionId,
  pendingSeatIds,
  nowMs,
  isLoading,
  syncError,
  onSeatTap,
}: BusSeatDeckProps) {
  let availableCount = 0;
  let selectedCount = 0;
  let heldOtherCount = 0;
  let bookedCount = 0;

  for (let r = 1; r <= TOTAL_ROWS; r += 1) {
    for (const col of [...LEFT_COLUMNS, ...RIGHT_COLUMNS]) {
      const seatId = `${r}${col}`;
      const st = getEffectiveSeatState(seatsMap[seatId], currentSessionId, nowMs);
      if (st === 'available') availableCount += 1;
      else if (st === 'selected') selectedCount += 1;
      else if (st === 'held_by_other') heldOtherCount += 1;
      else bookedCount += 1;
    }
  }

  return (
    <section
      aria-label="Bus seat selection map"
      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-5"
    >
      {/* Live Status & Fare Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-[#0F172A]">
            Choose Your Seats
          </h2>
          <p className="text-xs text-slate-600">
            <span className="font-bold text-[#0F172A]">{availableCount}</span> of
            40 seats available • {CURRENCY_SYMBOL}
            {PRICE_PER_SEAT}/seat
          </p>
        </div>

        <div className="flex items-center gap-2">
          {syncError ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-[#FFF1F2] px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C]">
              <WifiOff className="size-3.5" aria-hidden="true" />
              Sync Warning
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <Wifi className="size-3" aria-hidden="true" />
              Live Sync
            </span>
          )}
        </div>
      </div>

      {syncError ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-rose-200 bg-[#FFF1F2] p-3 text-xs text-[#881337]"
        >
          <p className="font-bold">Realtime Database Connection Issue</p>
          <p className="mt-0.5 leading-relaxed">{syncError}</p>
        </div>
      ) : null}

      {/* Visual Seat Legend directly above the bus cabin */}
      <div
        aria-label="Seat status legend"
        className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 sm:grid-cols-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-[#D84E55] bg-white text-[9px] font-bold text-[#0F172A]"
          >
            1A
          </span>
          <span>Available</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-[#B91C1C] bg-[#D84E55] text-white"
          >
            <Check className="size-3.5 stroke-[2.5]" />
          </span>
          <span>Selected ({selectedCount})</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#92400E]">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md border-2 border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]"
          >
            <Lock className="size-3" />
          </span>
          <span>Held 5m ({heldOtherCount})</span>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-[#E2E8F0] text-[#94A3B8]"
          >
            <UserCheck className="size-3" />
          </span>
          <span>Booked ({bookedCount})</span>
        </div>
      </div>

      {/* Bus Cabin Outer Frame */}
      <div className="mx-auto max-w-md rounded-t-[2rem] rounded-b-3xl border-2 border-slate-300 bg-slate-50/70 p-3 shadow-inner sm:p-4">
        {/* Front Windshield Header */}
        <div className="mb-3 rounded-t-[1.35rem] rounded-b-lg border border-slate-300 bg-linear-to-b from-slate-800 to-slate-900 px-3 py-2 text-center text-white shadow-xs">
          <div className="mx-auto mb-1 h-1 w-16 rounded-full bg-white/30" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">
            Front Windshield • AC Seater 2×2
          </p>
        </div>

        {/* Driver & Entry Door Deck Row */}
        <div className="mb-3 flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800">
            <DoorOpen className="size-4 text-emerald-600" aria-hidden="true" />
            <span>ENTRY DOOR</span>
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Front Cabin
          </span>

          <div
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-2xs"
            title="Driver Seat"
          >
            <span>DRIVER</span>
            <SteeringWheelIcon className="size-5 text-[#D84E55]" />
          </div>
        </div>

        {/* Column Header Guide */}
        <div className="mb-2 grid grid-cols-[1fr_1fr_36px_1fr_1fr] items-center gap-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>W (A)</span>
          <span>Aisle (B)</span>
          <span className="text-[9px]">Row</span>
          <span>Aisle (C)</span>
          <span>W (D)</span>
        </div>

        {/* 10 Rows x 4 Seats (2x2 Cinema Grid) */}
        <div className="relative space-y-2.5">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-2.5" aria-busy="true" aria-label="Loading seats">
              {Array.from({ length: TOTAL_ROWS }, (_, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_1fr_36px_1fr_1fr] items-center gap-2"
                >
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
                  <div className="text-center font-mono text-[10px] font-bold text-slate-400">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
                </div>
              ))}
            </div>
          ) : (
            Array.from({ length: TOTAL_ROWS }, (_, rowIdx) => {
              const rowNumber = rowIdx + 1;

              const renderSeatButton = (col: string) => {
                const seatId = `${rowNumber}${col}`;
                const seatRecord = seatsMap[seatId];
                const state = getEffectiveSeatState(
                  seatRecord,
                  currentSessionId,
                  nowMs
                );
                const isPending = pendingSeatIds.has(seatId);
                const isDisabled =
                  isPending || state === 'booked' || state === 'held_by_other';

                const statusLabel =
                  state === 'selected'
                    ? 'Selected by you. Tap to release.'
                    : state === 'held_by_other'
                      ? 'Being booked by another passenger'
                      : state === 'booked'
                        ? 'Already booked'
                        : `Available seat, ₹${PRICE_PER_SEAT}`;

                return (
                  <button
                    key={seatId}
                    type="button"
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    aria-pressed={state === 'selected'}
                    aria-busy={isPending}
                    aria-label={`Seat ${seatId}: ${statusLabel}`}
                    title={
                      state === 'held_by_other'
                        ? 'Being booked by another passenger'
                        : statusLabel
                    }
                    onClick={() => onSeatTap(seatId, state)}
                    className={`group relative flex min-h-12 w-full flex-col items-center justify-center rounded-xl border-2 px-1 pt-2 pb-1.5 transition-all duration-150 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-1 ${SEAT_STATE_STYLES[state]}`}
                  >
                    {/* Top headrest silhouette bar */}
                    <span
                      aria-hidden="true"
                      className={`absolute top-1 h-1 w-7 rounded-full ${
                        state === 'selected'
                          ? 'bg-white/60'
                          : state === 'available'
                            ? 'bg-[#D84E55]/30 group-hover:bg-[#D84E55]/60'
                            : state === 'held_by_other'
                              ? 'bg-[#F59E0B]/60'
                              : 'bg-slate-300'
                      }`}
                    />

                    {/* Seat Code */}
                    <span className="font-mono text-xs font-extrabold tracking-tight sm:text-sm">
                      {seatId}
                    </span>

                    {/* State Badge / Icon (never color alone) */}
                    <span className="mt-0.5 flex h-3.5 items-center justify-center">
                      {isPending ? (
                        <RefreshCw
                          className="size-3 animate-spin"
                          aria-hidden="true"
                        />
                      ) : state === 'selected' ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 text-[9px] font-bold text-white">
                          <Check className="size-2.5 stroke-[3]" aria-hidden="true" />
                        </span>
                      ) : state === 'held_by_other' ? (
                        <Lock className="size-3 text-[#B45309]" aria-hidden="true" />
                      ) : state === 'booked' ? (
                        <UserCheck className="size-3 text-[#94A3B8]" aria-hidden="true" />
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400 group-hover:text-[#D84E55]">
                          {CURRENCY_SYMBOL}
                          {PRICE_PER_SEAT}
                        </span>
                      )}
                    </span>
                  </button>
                );
              };

              return (
                <div
                  key={rowNumber}
                  className="grid grid-cols-[1fr_1fr_36px_1fr_1fr] items-center gap-2"
                >
                  {LEFT_COLUMNS.map((col) => renderSeatButton(col))}

                  {/* Center Walking Aisle */}
                  <div
                    aria-hidden="true"
                    className="flex h-12 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white/70 font-mono text-[10px] font-bold text-slate-400"
                  >
                    <span>{String(rowNumber).padStart(2, '0')}</span>
                  </div>

                  {RIGHT_COLUMNS.map((col) => renderSeatButton(col))}
                </div>
              );
            })
          )}
        </div>

        {/* Rear Cabin Footer */}
        <div className="mt-4 flex items-center justify-center border-t border-dashed border-slate-300 pt-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Rear Pushback Bench • 40 Seats
          </span>
        </div>
      </div>
    </section>
  );
}
