import mongoose from 'mongoose';
import Booking from '../models/Booking';

export class BookingRepository {
  async findByUserId(userId: string) {
    return Booking.find({ user: userId }).sort({ createdAt: -1 });
  }
  async findByIdAndUserId(bookingId: string, userId: string, session?: mongoose.ClientSession) {
    const query = Booking.findOne({ _id: bookingId, user: userId });
    if (session) return query.session(session);
    return query;
  }
  async findByIdAndUserIdPopulated(bookingId: string, userId: string) {
    return Booking.findOne({ _id: bookingId, user: userId }).populate('items.serviceId');
  }
  async create(data: any) {
    return new Booking(data);
  }
  async save(booking: any, session?: mongoose.ClientSession) {
    if (session) return booking.save({ session });
    return booking.save();
  }
}
