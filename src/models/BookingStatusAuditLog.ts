import mongoose, { Schema, Document } from 'mongoose';
import { ALL_BOOKING_STATUSES, BookingStatus } from '../types/booking.types';

export interface IBookingStatusAuditLog extends Document {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  previousStatus: BookingStatus | null;
  newStatus: BookingStatus;
  changedAt: Date;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingStatusAuditLogSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    previousStatus: { type: String, enum: ALL_BOOKING_STATUSES, default: null },
    newStatus: { type: String, enum: ALL_BOOKING_STATUSES, required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    reason: { type: String, trim: true },
  },
  { timestamps: true },
);

BookingStatusAuditLogSchema.index({ bookingId: 1, changedAt: -1 });

export default mongoose.model<IBookingStatusAuditLog>(
  'BookingStatusAuditLog',
  BookingStatusAuditLogSchema,
);
