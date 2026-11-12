'use client';

import { Check, DoorOpen, RefreshCw, UserCheck, WifiOff } from 'lucide-react';
import {
  CURRENCY_SYMBOL,
  LEFT_COLUMNS,
  PRICE_PER_SEAT,
  RIGHT_COLUMNS,
  TOTAL_ROWS,
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

const VISUAL_SEAT_STYLES = {
  available:
    'border-[#D84E55] bg-white text-[#0F172A] hover:bg-[#FFF1F2] active:scale-95 shadow-2xs cursor-pointer',
  selected:
    'border-[#B91C1C] bg-[#D84E55] text-white hover:bg-[#B91C1C] active:scale-95 shadow-sm cursor-pointer',
  unavailable:
    'border-slate-300 bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed',
} as const;

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

  for (let r = 1; r <= TOTAL_ROWS; r += 1) {
    for (const col of [...LEFT_COLUMNS, ...RIGHT_COLUMNS]) {
      const seatId = `${r}${col}`;
      const st = getEffectiveSeatState(seatsMap[seatId], currentSessionId, nowMs);
      if (st === 'available') availableCount += 1;
    }
  }

  return (
    <section
      aria-label="Select your bus seats"
      className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      {/* Clean Consumer Title Row (NO Live Sync pill) */}
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-[#0F172A]">
            Choose Your Seats
          </h2>
          <p className="text-xs font-medium text-slate-500">
            {availableCount} of 40 available • {CURRENCY_SYMBOL}
            {PRICE_PER_SEAT} per seat
          </p>
        </div>
      </div>

      {syncError ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-[#FFF1F2] p-3.5 text-xs text-[#881337]"
        >
          <WifiOff className="mt-0.5 size-4 shrink-0 text-[#D84E55]" aria-hidden="true" />
          <div>
            <p className="font-bold">Unable to load live seats</p>
            <p className="mt-0.5 leading-relaxed">{syncError}</p>
          </div>
        </div>
      ) : null}

      {/* Clean 3-Item Consumer Legend ONLY */}
      <div
        aria-label="Seat legend"
        className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2.5"
      >
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0F172A]">
          <span
            aria-hidden="true"
            className="size-5 shrink-0 rounded-md border-2 border-[#D84E55] bg-white"
          />
          <span>Available</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#0F172A]">
          <span
            aria-hidden="true"
            className="flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-[#B91C1C] bg-[#D84E55] text-white"
          >
            <Check className="size-3 stroke-[3]" />
          </span>
          <span>Selected</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          <span
            aria-hidden="true"
            className="flex size-5 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-[#E2E8F0] text-[#94A3B8]"
          >
            <UserCheck className="size-3" />
          </span>
          <span>Booked</span>
        </div>
      </div>

      {/* Movie-Style Bus Cabin */}
      <div className="mx-auto max-w-sm rounded-t-[2.25rem] rounded-b-3xl border border-slate-200 bg-slate-50/65 p-3.5 sm:p-4">
        {/* Clean Windshield Bar */}
        <div className="mb-3 rounded-t-2xl rounded-b-lg bg-slate-800 px-3 py-2 text-center text-white">
          <div className="mx-auto mb-1 h-1 w-14 rounded-full bg-white/30" />
          <p className="text-[11px] font-semibold tracking-wide text-slate-200">
            Front of Bus
          </p>
        </div>

        {/* Entry Door & Driver */}
        <div className="mb-3.5 flex items-center justify-between border-b border-dashed border-slate-300 pb-3">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
            <DoorOpen className="size-4 text-emerald-600" aria-hidden="true" />
            <span>Entry</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            title="Driver"
          >
            <span>Driver</span>
            <SteeringWheelIcon className="size-4 text-[#D84E55]" />
          </div>
        </div>

        {/* Clean Window / Aisle Labels */}
        <div className="mb-2 grid grid-cols-[1fr_1fr_28px_1fr_1fr] items-center gap-2 text-center text-[11px] font-semibold text-slate-400">
          <span>Window</span>
          <span>Aisle</span>
          <span aria-hidden="true" />
          <span>Aisle</span>
          <span>Window</span>
        </div>

        {/* 10 Rows x 4 Seats (2x2 Grid) */}
        <div className="space-y-2.5">
          {isLoading ? (
            <div
              className="grid grid-cols-1 gap-2.5"
              aria-busy="true"
              aria-label="Loading seats"
            >
              {Array.from({ length: TOTAL_ROWS }, (_, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_1fr_28px_1fr_1fr] items-center gap-2"
                >
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-200/80" />
                  <div className="text-center text-xs font-semibold text-slate-400 tabular-nums">
                    {idx + 1}
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
                // Treat held_by_other visually identical to booked so customer UI stays simple
                const isUnavailable =
                  state === 'booked' || state === 'held_by_other';
                const isDisabled = isPending || isUnavailable;

                const visualStyle =
                  state === 'selected'
                    ? VISUAL_SEAT_STYLES.selected
                    : isUnavailable
                      ? VISUAL_SEAT_STYLES.unavailable
                      : VISUAL_SEAT_STYLES.available;

                const statusLabel =
                  state === 'selected'
                    ? 'Selected. Tap to remove.'
                    : isUnavailable
                      ? 'Booked'
                      : `Available, ${CURRENCY_SYMBOL}${PRICE_PER_SEAT}`;

                return (
                  <button
                    key={seatId}
                    type="button"
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    aria-pressed={state === 'selected'}
                    aria-busy={isPending}
                    aria-label={`Seat ${seatId}: ${statusLabel}`}
                    onClick={() => onSeatTap(seatId, state)}
                    className={`group relative flex min-h-12 w-full flex-col items-center justify-center rounded-xl border-2 px-1 pt-2 pb-1.5 transition-all duration-150 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-1 ${visualStyle}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-1 h-1 w-6 rounded-full ${
                        state === 'selected'
                          ? 'bg-white/60'
                          : isUnavailable
                            ? 'bg-slate-300'
                            : 'bg-[#D84E55]/30 group-hover:bg-[#D84E55]/60'
                      }`}
                    />

                    <span className="text-xs font-bold tracking-tight sm:text-sm">
                      {seatId}
                    </span>

                    <span className="mt-0.5 flex h-3.5 items-center justify-center">
                      {isPending ? (
                        <RefreshCw
                          className="size-3 animate-spin"
                          aria-hidden="true"
                        />
                      ) : state === 'selected' ? (
                        <Check
                          className="size-3 stroke-[3] text-white"
                          aria-hidden="true"
                        />
                      ) : isUnavailable ? (
                        <UserCheck
                          className="size-3 text-[#94A3B8]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-[#D84E55]">
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
                  className="grid grid-cols-[1fr_1fr_28px_1fr_1fr] items-center gap-2"
                >
                  {LEFT_COLUMNS.map((col) => renderSeatButton(col))}

                  {/* Clean Aisle Row Indicator */}
                  <div
                    aria-hidden="true"
                    className="flex h-12 items-center justify-center text-xs font-semibold text-slate-400 tabular-nums"
                  >
                    {rowNumber}
                  </div>

                  {RIGHT_COLUMNS.map((col) => renderSeatButton(col))}
                </div>
              );
            })
          )}
        </div>

        {/* Clean Rear Footer */}
        <div className="mt-4 border-t border-dashed border-slate-300 pt-2.5 text-center">
          <span className="text-[11px] font-semibold text-slate-400">
            Rear Row
          </span>
        </div>
      </div>
    </section>
  );
}
