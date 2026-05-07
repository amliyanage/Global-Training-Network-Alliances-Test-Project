import mongoose from 'mongoose';
import { BookingRepository } from '../repositories/booking.repository';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError } from '../utils/errors';
import { CheckoutDto, BookingActionDto } from '../dtos/booking.dto';
import { getUtcDateKey } from '../utils/date';

export class BookingService {
  constructor(
    private bookingRepository: BookingRepository,
    private cartRepository: CartRepository,
    private serviceRepository: ServiceRepository,
  ) {}

  async checkout(dto: CheckoutDto) {
    const { userId, paymentMethod } = dto;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart: any = await this.cartRepository.findByUserIdPopulated(userId, session);
      if (!cart || cart.items.length === 0) {
        throw new AppError(400, 'Cart is empty');
      }

      let totalAmount = 0;
      const bookingItems = [];

      for (const item of cart.items) {
        const serviceId = item.serviceId as any;
        const service: any = await this.serviceRepository.findById(serviceId._id, session);
        if (!service) throw new AppError(404, `Service not found: ${serviceId._id}`);

        const slot = service.slots.find((s: any) => s._id?.toString() === item.slotId);
        if (!slot) throw new AppError(404, `Slot not found in service: ${service.title}`);
        const bookingDate = item.bookingDate ? new Date(item.bookingDate) : new Date(slot.startTime);
        const cartItemDate = getUtcDateKey(bookingDate);
        const slotDate = getUtcDateKey(new Date(slot.startTime));
        if (cartItemDate !== slotDate) {
          throw new AppError(409, `Selected slot date changed for ${service.title}. Please refresh cart.`);
        }

        if (slot.capacity < item.quantity) {
          throw new AppError(
            409,
            `Not enough capacity for ${service.title} at selected slot. Remaining: ${slot.capacity}`,
            'CAPACITY_ERROR',
          );
        }

        // Atomic update for capacity
        const updatedService = await this.serviceRepository.decrementCapacity(
          service._id as string,
          item.slotId,
          item.quantity,
          session,
        );

        if (!updatedService) {
          throw new AppError(
            409,
            `Concurrency conflict: could not lock capacity for ${service.title}`,
          );
        }

        totalAmount += service.price * item.quantity;
        bookingItems.push({
          serviceId: service._id,
          slotId: item.slotId,
          bookingDate,
          quantity: item.quantity,
          priceSnapshot: service.price,
        });
      }

      let status = 'pending';
      if (['cash', 'pay_on_arrival'].includes(paymentMethod)) {
        status = 'confirmed';
      }

      const booking: any = await this.bookingRepository.create({
        user: userId,
        items: bookingItems,
        totalAmount,
        status,
        paymentMethod,
      });
      await this.bookingRepository.save(booking, session);

      // Clear the cart
      cart.items = [];
      await this.cartRepository.save(cart, session);

      await session.commitTransaction();
      session.endSession();

      return booking;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async getBookings(userId: string) {
    return this.bookingRepository.findByUserId(userId);
  }

  async getBookingById(dto: BookingActionDto) {
    const { userId, bookingId } = dto;
    const booking = await this.bookingRepository.findByIdAndUserIdPopulated(bookingId, userId);
    if (!booking) throw new AppError(404, 'Booking not found');
    return booking;
  }

  async cancelBooking(dto: BookingActionDto) {
    const { userId, bookingId } = dto;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking: any = await this.bookingRepository.findByIdAndUserId(
        bookingId,
        userId,
        session,
      );
      if (!booking) throw new AppError(404, 'Booking not found');

      if (['completed', 'failed', 'cancelled'].includes(booking.status)) {
        throw new AppError(400, `Cannot cancel booking with status ${booking.status}`);
      }

      // Restore capacity
      for (const item of booking.items) {
        await this.serviceRepository.incrementCapacity(
          item.serviceId as string,
          item.slotId,
          item.quantity,
          session,
        );
      }

      booking.status = 'cancelled';
      await this.bookingRepository.save(booking, session);

      await session.commitTransaction();
      session.endSession();
      return booking;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }
}
