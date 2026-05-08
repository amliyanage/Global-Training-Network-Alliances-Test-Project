import mongoose from 'mongoose';
import Booking, { IBooking } from '../models/Booking';
import { BookingStatus } from '../types/booking.types';

interface CreateBookingInput {
  user: string;
  items: {
    serviceId: string | mongoose.Types.ObjectId;
    slotId: string;
    bookingDate?: Date;
    quantity: number;
    priceSnapshot: number;
  }[];
  totalAmount: number;
  status: BookingStatus;
  paymentMethod: 'cash' | 'pay_on_arrival' | 'online';
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'failed' | 'cancelled';
  paymentGateway?: 'payhere';
  capacityReleasedOnFailure?: boolean;
  payhereNotifications?: {
    statusCode: number;
    md5sig: string;
    paymentId?: string;
    statusMessage?: string;
    method?: string;
    rawBody?: string;
    receivedAt: Date;
  }[];
}

export class BookingRepository {
  async findByUserId(userId: string) {
    return Booking.find({ user: userId }).sort({ createdAt: -1 });
  }

  async findById(id: string, session?: mongoose.ClientSession) {
    const query = Booking.findById(id);
    if (session) return query.session(session);
    return query;
  }

  async findByIdAndUserId(bookingId: string, userId: string, session?: mongoose.ClientSession) {
    const query = Booking.findOne({ _id: bookingId, user: userId });
    if (session) return query.session(session);
    return query;
  }

  async findByPaymentOrderId(paymentOrderId: string, session?: mongoose.ClientSession) {
    const query = Booking.findOne({ paymentOrderId });
    if (session) return query.session(session);
    return query;
  }

  async findByIdAndUserIdPopulated(bookingId: string, userId: string) {
    return Booking.findOne({ _id: bookingId, user: userId }).populate('items.serviceId');
  }

  async countByUserAndBookingDate(
    userId: string,
    dayStartUtc: Date,
    dayEndUtc: Date,
    excludedStatuses: BookingStatus[],
    session?: mongoose.ClientSession,
  ) {
    const query = Booking.countDocuments({
      user: userId,
      status: { $nin: excludedStatuses },
      items: {
        $elemMatch: {
          bookingDate: {
            $gte: dayStartUtc,
            $lt: dayEndUtc,
          },
        },
      },
    });

    if (session) {
      query.session(session);
    }

    return query;
  }

  async create(data: CreateBookingInput) {
    return new Booking(data);
  }

  async save(booking: IBooking, session?: mongoose.ClientSession) {
    if (session) return booking.save({ session });
    return booking.save();
  }
}
