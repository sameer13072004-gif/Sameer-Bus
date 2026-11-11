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

export const BUS_NAME = 'Sameer Bus (AC Seater 2x2)';
export const BRAND_NAME = 'Sameer Bus';
export const PRICE_PER_SEAT = 1; // ₹1 per seat for testing phase
export const CURRENCY_SYMBOL = '₹';
export const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export const SUPPORT_CONTACT = {
  phoneDisplay: '8178628988',
  phoneE164: '+918178628988',
  whatsappDigits: '918178628988',
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

export function buildWhatsAppInquiryUrl(params: {
  bookingId: string;
  routeLabel: string;
  date: string;
  seats: string[];
}): string {
  const message = `Hello Sameer Bus Team, I have booked ticket ${params.bookingId} for ${params.routeLabel} on ${params.date} (Seat: ${params.seats.join(', ')}). Could you please confirm the live arrival/departure status of the bus?`;
  return `https://wa.me/${SUPPORT_CONTACT.whatsappDigits}?text=${encodeURIComponent(message)}`;
}
