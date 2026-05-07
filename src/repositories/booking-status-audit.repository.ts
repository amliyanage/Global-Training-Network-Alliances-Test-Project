import mongoose from 'mongoose';
import BookingStatusAuditLog from '../models/BookingStatusAuditLog';
import { BookingStatus } from '../types/booking.types';

interface CreateStatusAuditLogInput {
  bookingId: string;
  userId: string;
  previousStatus: BookingStatus | null;
  newStatus: BookingStatus;
  reason?: string;
}

export class BookingStatusAuditRepository {
  async create(input: CreateStatusAuditLogInput, session?: mongoose.ClientSession) {
    const payload = {
      ...input,
      changedAt: new Date(),
    };

    if (session) {
      const docs = await BookingStatusAuditLog.create([payload], { session });
      return docs[0];
    }

    return BookingStatusAuditLog.create(payload);
  }

  async findByBookingId(bookingId: string) {
    return BookingStatusAuditLog.find({ bookingId }).sort({ changedAt: -1 });
  }
}
