import type { RouteId } from '@/config/busConfig';

export type SeatStatus = 'available' | 'held' | 'booked';

export type EffectiveSeatState =
  | 'available'
  | 'selected'
  | 'held_by_other'
  | 'booked';

export interface SeatRecord {
  status: SeatStatus;
  heldBy: string | null;
  holdExpiresAt: number | null;
  bookingId: string | null;
}

export type TripSeatsMap = Record<string, SeatRecord>;

export interface BookingRecord {
  bookingId: string;
  tripId: string;
  date: string;
  routeId: RouteId;
  routeLabel: string;
  originStop: string;
  destinationStop: string;
  departureTime: string;
  arrivalTime: string;
  seats: string[];
  passengerName: string;
  passengerPhone: string;
  amountPaid: number;
  pricePerSeat: number;
  currency: 'INR';
  paymentMethod: 'razorpay' | 'demo';
  razorpayPaymentId?: string;
  status: 'PAID';
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  boarded?: boolean;
  boardedAt?: number | null;
  createdAt: number;
}

export interface AuthUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type AppView = 'book' | 'tickets';
export type BookingStep = 'route_date' | 'seats' | 'confirmed';

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  description?: string;
}
