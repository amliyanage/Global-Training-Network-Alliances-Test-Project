export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'success'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type PaymentMethod = 'cash' | 'pay_on_arrival' | 'online';

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed' | 'cancelled';

export const ALL_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'success',
  'completed',
  'cancelled',
  'failed',
];

export const ALL_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'pay_on_arrival', 'online'];

export const ALL_PAYMENT_STATUSES: PaymentStatus[] = [
  'not_required',
  'pending',
  'paid',
  'failed',
  'cancelled',
];
