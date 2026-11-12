export type RouteId = 'NOIDA_RAMPUR' | 'RAMPUR_NOIDA';

export interface BusRoute {
  id: RouteId;
  shortLabel: string;
  routeLabel: string;
  originCity: string;
  destinationCity: string;
  originStop: string;
  destinationStop: string;
  departureTime: string;
  arrivalTime: string;
  durationLabel: string;
  badgeText: string;
}

export const BUS_NAME = 'Majid Bus (AC Seater 2x2)';
export const BRAND_NAME = 'Majid Bus';
export const PRICE_PER_SEAT = 400; // ₹400 per seat
export const CURRENCY_SYMBOL = '₹';
export const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const PUBLIC_VERIFY_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '') ||
  'https://sameer-bus.vercel.app';

export const STAFF_VERIFY_PIN = '8988';

export const SUPPORT_CONTACT = {
  phoneDisplay: '8178628988',
  phoneE164: '+918178628988',
  telHref: 'tel:+918178628988',
};

export const TOTAL_ROWS = 10;
export const LEFT_COLUMNS = ['A', 'B'] as const;
export const RIGHT_COLUMNS = ['C', 'D'] as const;
export const ALL_COLUMNS = ['A', 'B', 'C', 'D'] as const;

export const ALL_SEAT_IDS: string[] = Array.from({ length: TOTAL_ROWS }, (_, rowIdx) => {
  const rowNumber = rowIdx + 1;
  return ALL_COLUMNS.map((col) => `${rowNumber}${col}`);
}).flat();

export const BUS_ROUTES: Record<RouteId, BusRoute> = {
  NOIDA_RAMPUR: {
    id: 'NOIDA_RAMPUR',
    shortLabel: 'Noida → Rampur',
    routeLabel: 'Noida to Rampur (UP)',
    originCity: 'Noida',
    destinationCity: 'Rampur (UP)',
    originStop: 'Sector 34 Metro Station, Noida',
    destinationStop: 'Shehnai Mandap, Shahbad Gate, Rampur',
    departureTime: '04:00 PM',
    arrivalTime: '08:00 PM',
    durationLabel: '4h 00m • Evening Express',
    badgeText: 'Daily 4:00 PM',
  },
  RAMPUR_NOIDA: {
    id: 'RAMPUR_NOIDA',
    shortLabel: 'Rampur → Noida',
    routeLabel: 'Rampur (UP) to Noida',
    originCity: 'Rampur (UP)',
    destinationCity: 'Noida',
    originStop: 'Shehnai Mandap, Shahbad Gate, Rampur',
    destinationStop: 'Sector 34 Metro Station, Noida',
    departureTime: '05:00 AM',
    arrivalTime: '08:00 PM',
    durationLabel: 'Morning Departure',
    badgeText: 'Daily 5:00 AM',
  },
};

export const ROUTE_LIST: BusRoute[] = [
  BUS_ROUTES.NOIDA_RAMPUR,
  BUS_ROUTES.RAMPUR_NOIDA,
];

export function buildTripId(date: string, routeId: RouteId): string {
  return `${date}_${routeId}`;
}

export function buildStaffVerifyQrUrl(bookingId: string, seatCount: number): string {
  return `${PUBLIC_VERIFY_BASE_URL}/staff-verify?id=${encodeURIComponent(
    bookingId
  )}&seats=${Math.max(1, seatCount)}`;
}
