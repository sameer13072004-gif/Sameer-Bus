'use client';

import { ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { ROUTE_LIST, type BusRoute, type RouteId } from '@/config/busConfig';
import { buildUpcomingDateOptions, formatDisplayDate } from '@/lib/dateUtils';

interface RouteAndDateSelectorProps {
  selectedRouteId: RouteId;
  selectedDate: string;
  onSelectRoute: (routeId: RouteId) => void;
  onSelectDate: (isoDate: string) => void;
}

const UPCOMING_DATES = buildUpcomingDateOptions(7);

export function RouteAndDateSelector({
  selectedRouteId,
  selectedDate,
  onSelectRoute,
  onSelectDate,
}: RouteAndDateSelectorProps) {
  const isCustomDate = !UPCOMING_DATES.some((d) => d.isoDate === selectedDate);

  return (
    <section aria-label="Route and travel date" className="space-y-3.5">
      {/* Route Switcher */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Select Daily Route
          </h2>
          <span className="rounded-full bg-[#FFF1F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
            AC Seater 2×2
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {ROUTE_LIST.map((route: BusRoute) => {
            const isActive = route.id === selectedRouteId;
            return (
              <button
                key={route.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onSelectRoute(route.id)}
                className={`group relative flex min-h-11 w-full flex-col rounded-xl border p-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] focus-visible:ring-offset-2 ${
                  isActive
                    ? 'border-[#D84E55] bg-[#FFF1F2] shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold text-[#0F172A]">
                    <span className="truncate">{route.originCity}</span>
                    <ArrowRight
                      className={`size-4 shrink-0 ${
                        isActive ? 'text-[#D84E55]' : 'text-slate-400'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{route.destinationCity}</span>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                      isActive
                        ? 'bg-[#D84E55] text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {route.departureTime}
                  </span>
                </div>

                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin
                    className={`mt-0.5 size-3.5 shrink-0 ${
                      isActive ? 'text-[#D84E55]' : 'text-slate-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="line-clamp-2 leading-snug">
                    {route.originStop} → {route.destinationStop}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-2 text-[11px] font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3 text-slate-400" aria-hidden="true" />
                    Departs {route.departureTime}
                  </span>
                  <span>Arrives {route.arrivalTime}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Selector Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:p-4">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 text-[#D84E55]" aria-hidden="true" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Journey Date
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#0F172A]">
            {formatDisplayDate(selectedDate)}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {UPCOMING_DATES.map((opt) => {
            const active = opt.isoDate === selectedDate;
            return (
              <button
                key={opt.isoDate}
                type="button"
                aria-pressed={active}
                onClick={() => onSelectDate(opt.isoDate)}
                className={`flex min-h-14 min-w-[66px] shrink-0 flex-col items-center justify-center rounded-xl border px-2.5 py-1.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D84E55] ${
                  active
                    ? 'border-[#D84E55] bg-[#D84E55] text-white shadow-sm'
                    : 'border-slate-200 bg-white text-[#0F172A] hover:border-[#D84E55]/50 hover:bg-[#FFF1F2]/60'
                }`}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    active ? 'text-white/90' : 'text-slate-500'
                  }`}
                >
                  {opt.tag ?? opt.dayShort}
                </span>
                <span className="font-mono text-base font-bold leading-tight">
                  {opt.dayNumber}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    active ? 'text-white/90' : 'text-slate-500'
                  }`}
                >
                  {opt.monthShort}
                </span>
              </button>
            );
          })}

          {/* Custom future date input */}
          <label
            className={`relative flex min-h-14 min-w-[74px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border px-2.5 py-1.5 transition-colors focus-within:ring-2 focus-within:ring-[#D84E55] ${
              isCustomDate
                ? 'border-[#D84E55] bg-[#D84E55] text-white'
                : 'border-dashed border-slate-300 bg-slate-50 text-slate-700 hover:border-[#D84E55]/60 hover:bg-[#FFF1F2]/50'
            }`}
          >
            <Calendar className="size-4" aria-hidden="true" />
            <span className="mt-1 text-[10px] font-bold uppercase">
              {isCustomDate ? 'Custom' : 'Pick Date'}
            </span>
            <input
              type="date"
              aria-label="Pick a custom journey date"
              min={UPCOMING_DATES[0].isoDate}
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) onSelectDate(e.target.value);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
      </div>
    </section>
  );
}
