'use client';

import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  Bus,
  Calendar,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  BUS_NAME,
  BUS_ROUTES,
  CURRENCY_SYMBOL,
  PRICE_PER_SEAT,
  type RouteId,
} from '@/config/busConfig';
import {
  formatShortDate,
  hasTripDepartedForDate,
  type DateOption,
} from '@/lib/dateUtils';

interface RouteAndDateSelectorProps {
  dateOptions: DateOption[];
  selectedRouteId: RouteId;
  selectedDate: string;
  nowTimestamp: number;
  onSelectRoute: (routeId: RouteId) => void;
  onSelectDate: (isoDate: string) => void;
  onContinueToSeats: () => void;
}

export function RouteAndDateSelector({
  dateOptions,
  selectedRouteId,
  selectedDate,
  nowTimestamp,
  onSelectRoute,
  onSelectDate,
  onContinueToSeats,
}: RouteAndDateSelectorProps) {
  const [swapRotation, setSwapRotation] = useState(0);

  const selectedRoute = BUS_ROUTES[selectedRouteId];
  const nowDate = new Date(nowTimestamp);
  const hasDeparted = hasTripDepartedForDate(
    selectedDate,
    selectedRoute.departureTime,
    nowDate
  );

  const tomorrowIso = dateOptions[1]?.isoDate ?? selectedDate;

  const handleSwapRoute = () => {
    setSwapRotation((prev) => prev + 180);
    onSelectRoute(
      selectedRouteId === 'NOIDA_RAMPUR' ? 'RAMPUR_NOIDA' : 'NOIDA_RAMPUR'
    );
  };

  return (
    <section
      aria-label="Choose journey date and route"
      className="mx-auto max-w-lg"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
        {/* Top subtle bus identity strip */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Bus className="size-4 text-[#D84E55]" aria-hidden="true" />
            <span>{BUS_NAME}</span>
          </div>
          <span className="rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-xs font-bold text-[#B91C1C]">
            {CURRENCY_SYMBOL}
            {PRICE_PER_SEAT} per seat
          </span>
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {/* 1. Journey Date Strip at the Very Top (Next 7 days only) */}
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 text-[#D84E55]" aria-hidden="true" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Journey Date
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#0F172A]">
                {formatShortDate(selectedDate)}
              </span>
            </div>

            <div
              role="radiogroup"
              aria-label="Select travel date within next 7 days"
              className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
            >
              {dateOptions.map((opt) => {
                const active = opt.isoDate === selectedDate;
                return (
                  <button
                    key={opt.isoDate}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectDate(opt.isoDate)}
                    className={`flex min-h-[68px] min-w-[68px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2.5 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-1 ${
                      active
                        ? 'border-[#D84E55] bg-[#D84E55] text-white shadow-sm'
                        : 'border-slate-200 bg-white text-[#0F172A] hover:border-[#D84E55]/45 hover:bg-[#FFF1F2]/60'
                    }`}
                  >
                    <span
                      className={`text-[11px] font-semibold ${
                        active ? 'text-white/90' : 'text-slate-500'
                      }`}
                    >
                      {opt.tag ?? opt.dayShort}
                    </span>
                    <span className="mt-0.5 text-lg font-extrabold leading-none tabular-nums">
                      {opt.dayNumber}
                    </span>
                    <span
                      className={`mt-0.5 text-[11px] font-medium ${
                        active ? 'text-white/90' : 'text-slate-500'
                      }`}
                    >
                      {opt.monthShort}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Uber / Rapido Style Single Stacked Route Card with Right Swap Button */}
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Route &amp; Timing
              </h2>
              <span className="text-xs font-medium text-slate-500">
                Tap ⇅ to reverse direction
              </span>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50">
              {/* FROM Row */}
              <div className="relative flex items-start gap-3 p-4 pr-16">
                <div className="relative mt-1 flex flex-col items-center self-stretch">
                  <span
                    aria-hidden="true"
                    className="size-3.5 shrink-0 rounded-full border-[3px] border-[#D84E55] bg-white"
                  />
                  <span
                    aria-hidden="true"
                    className="my-1 w-0.5 flex-1 border-l-2 border-dashed border-slate-300"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      From
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-xs font-bold text-[#B91C1C]">
                      <Clock className="size-3" aria-hidden="true" />
                      {selectedRoute.departureTime}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-extrabold leading-tight text-[#0F172A]">
                    {selectedRoute.originCity}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-600">
                    {selectedRoute.originStop}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-4 border-t border-slate-200/80" />

              {/* TO Row */}
              <div className="relative flex items-start gap-3 p-4 pr-16">
                <div className="mt-1 flex flex-col items-center">
                  <MapPin
                    className="size-4 shrink-0 text-[#0F172A]"
                    aria-hidden="true"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      To
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Arrives {selectedRoute.arrivalTime}
                    </span>
                  </div>
                  <p className="mt-1 text-lg font-extrabold leading-tight text-[#0F172A]">
                    {selectedRoute.destinationCity}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-600">
                    {selectedRoute.destinationStop}
                  </p>
                </div>
              </div>

              {/* Circular Crimson Swap Button on Right Border */}
              <button
                type="button"
                onClick={handleSwapRoute}
                aria-label={`Swap route direction. Currently ${selectedRoute.originCity} to ${selectedRoute.destinationCity}`}
                className="absolute top-1/2 right-3.5 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#D84E55] text-white shadow-md transition-colors hover:bg-[#B91C1C] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2"
              >
                <ArrowUpDown
                  className="size-5 transition-transform duration-300"
                  style={{ transform: `rotate(${swapRotation}deg)` }}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* 3. Past-Departure Time Lock Notice */}
          {hasDeparted ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-300 bg-amber-50 p-3.5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <Clock
                    className="mt-0.5 size-4 shrink-0 text-amber-700"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold text-amber-950">
                      Bus departed at {selectedRoute.departureTime} today
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800">
                      Booking is closed for today&apos;s {selectedRoute.departureTime}{' '}
                      departure.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectDate(tomorrowIso)}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[#D84E55] bg-white px-3.5 py-2 text-xs font-bold text-[#B91C1C] shadow-2xs transition-colors hover:bg-[#FFF1F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55]"
                >
                  Book for Tomorrow
                </button>
              </div>
            </div>
          ) : null}

          {/* 4. Primary CTA */}
          <button
            type="button"
            disabled={hasDeparted}
            onClick={onContinueToSeats}
            className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#D84E55] px-5 py-3.5 text-base font-extrabold text-white shadow-md shadow-[#D84E55]/25 transition-all duration-150 hover:bg-[#B91C1C] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            <span>Select Seats</span>
            <ArrowRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
