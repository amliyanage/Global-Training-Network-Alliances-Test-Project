import { BookingStatus } from '../types/booking.types';

export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'cancelled', 'failed'],
  confirmed: ['completed'],
  success: ['completed'],
  completed: [],
  cancelled: [],
  failed: [],
};

export const NON_DAILY_LIMIT_STATUSES: BookingStatus[] = ['cancelled', 'failed'];

export const BOOKING_ERROR_CODES = {
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
} as const;
