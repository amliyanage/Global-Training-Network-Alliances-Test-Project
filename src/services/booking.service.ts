import mongoose from 'mongoose';
import { BookingRepository } from '../repositories/booking.repository';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError } from '../utils/errors';
import { CheckoutDto, BookingActionDto, PayHereNotifyDto } from '../dtos/booking.dto';
import { getUtcDateKey } from '../utils/date';
import { PayHereService } from './payhere.service';

export class BookingService {
  constructor(
    private bookingRepository: BookingRepository,
    private cartRepository: CartRepository,
    private serviceRepository: ServiceRepository,
    private payHereService: PayHereService,
  ) {}

  private getOrderItemsLabel(serviceTitles: string[]): string {
    if (serviceTitles.length === 0) return 'Service Booking';
    if (serviceTitles.length === 1) return serviceTitles[0] as string;
    return `${serviceTitles[0]} +${serviceTitles.length - 1} more services`;
  }

  private buildPayHereCustomer(dto: CheckoutDto) {
    const email = dto.customer?.email || dto.userEmail || 'customer@example.com';
    const emailName = email.split('@')[0] || 'Customer';

    return {
      firstName: dto.customer?.firstName || emailName,
      lastName: dto.customer?.lastName || 'User',
      email,
      phone: dto.customer?.phone || '0770000000',
      address: dto.customer?.address || 'N/A',
      city: dto.customer?.city || 'Colombo',
      country: dto.customer?.country || 'Sri Lanka',
    };
  }

  private async releaseCapacityForBooking(booking: any, session: mongoose.ClientSession) {
    if (booking.capacityReleasedOnFailure) return;

    for (const item of booking.items) {
      await this.serviceRepository.incrementCapacity(
        item.serviceId as string,
        item.slotId,
        item.quantity,
        session,
      );
    }

    booking.capacityReleasedOnFailure = true;
  }

  private formatAmount(amount: number): string {
    return Number(amount).toFixed(2);
  }

  private generatePaymentOrderId(bookingId: string): string {
    return `ORD_${Date.now()}_${bookingId}`;
  }

  async checkout(dto: CheckoutDto) {
    const { userId, paymentMethod } = dto;
    if (paymentMethod === 'online') {
      // Validate PayHere env config before we reserve capacity and clear the cart.
      this.payHereService.ensureConfigured();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart: any = await this.cartRepository.findByUserIdPopulated(userId, session);
      if (!cart || cart.items.length === 0) {
        throw new AppError(400, 'Cart is empty', 'CART_EMPTY');
      }

      let totalAmount = 0;
      const bookingItems = [];
      const serviceTitles: string[] = [];

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
        serviceTitles.push(service.title);
        bookingItems.push({
          serviceId: service._id,
          slotId: item.slotId,
          bookingDate,
          quantity: item.quantity,
          priceSnapshot: service.price,
        });
      }

      const isOnlinePayment = paymentMethod === 'online';
      const booking: any = await this.bookingRepository.create({
        user: userId,
        items: bookingItems,
        totalAmount,
        status: isOnlinePayment ? 'pending' : 'confirmed',
        paymentMethod,
        paymentStatus: isOnlinePayment ? 'pending' : 'not_required',
        paymentGateway: isOnlinePayment ? 'payhere' : undefined,
        capacityReleasedOnFailure: false,
        payhereNotifications: [],
      });

      if (isOnlinePayment) {
        booking.paymentOrderId = this.generatePaymentOrderId(booking._id.toString());
      }

      await this.bookingRepository.save(booking, session);

      cart.items = [];
      await this.cartRepository.save(cart, session);

      await session.commitTransaction();
      session.endSession();

      if (!isOnlinePayment) {
        return booking;
      }

      const paymentSession = this.payHereService.buildCheckoutSession({
        orderId: booking.paymentOrderId,
        amount: booking.totalAmount,
        items: this.getOrderItemsLabel(serviceTitles),
        customer: this.buildPayHereCustomer(dto),
        custom1: booking._id.toString(),
        custom2: userId,
      });

      return {
        booking,
        paymentSession,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async handlePayHereNotify(dto: PayHereNotifyDto, rawBody?: string) {
    if (!this.payHereService.verifyNotification(dto)) {
      throw new AppError(400, 'Invalid PayHere notification signature', 'PAYHERE_SIGNATURE_INVALID');
    }

    const statusCode = Number(dto.status_code);
    if (!Number.isFinite(statusCode)) {
      throw new AppError(400, 'Invalid PayHere notification status code');
    }

    const normalizedNotifyAmount = this.payHereService.normalizeAmount(dto.payhere_amount);
    if (!normalizedNotifyAmount) {
      throw new AppError(400, 'Invalid PayHere notification amount');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking: any = await this.bookingRepository.findByPaymentOrderId(dto.order_id, session);
      if (!booking) {
        await session.commitTransaction();
        session.endSession();
        return { acknowledged: true, processed: false, reason: 'BOOKING_NOT_FOUND' };
      }

      if (booking.paymentMethod !== 'online') {
        await session.commitTransaction();
        session.endSession();
        return { acknowledged: true, processed: false, reason: 'PAYMENT_METHOD_MISMATCH' };
      }

      if (dto.custom_1 && dto.custom_1 !== booking._id.toString()) {
        await session.commitTransaction();
        session.endSession();
        return { acknowledged: true, processed: false, reason: 'BOOKING_REFERENCE_MISMATCH' };
      }

      if (dto.custom_2 && dto.custom_2 !== booking.user?.toString()) {
        await session.commitTransaction();
        session.endSession();
        return { acknowledged: true, processed: false, reason: 'USER_REFERENCE_MISMATCH' };
      }

      const expectedAmount = this.formatAmount(booking.totalAmount);
      const expectedCurrency = this.payHereService.getCurrency();
      if (
        normalizedNotifyAmount !== expectedAmount ||
        dto.payhere_currency.toUpperCase() !== expectedCurrency
      ) {
        await session.commitTransaction();
        session.endSession();
        return { acknowledged: true, processed: false, reason: 'AMOUNT_OR_CURRENCY_MISMATCH' };
      }

      const existingNotification = (booking.payhereNotifications || []).find(
        (entry: any) =>
          entry.md5sig === dto.md5sig.toUpperCase() &&
          Number(entry.statusCode) === statusCode &&
          (entry.paymentId || '') === (dto.payment_id || ''),
      );

      if (existingNotification) {
        await session.commitTransaction();
        session.endSession();
        return { acknowledged: true, processed: false, reason: 'DUPLICATE_NOTIFICATION' };
      }

      booking.payhereNotifications = booking.payhereNotifications || [];
      booking.payhereNotifications.push({
        statusCode,
        md5sig: dto.md5sig.toUpperCase(),
        paymentId: dto.payment_id,
        statusMessage: dto.status_message,
        method: dto.method,
        receivedAt: new Date(),
        rawBody,
      });

      booking.paymentId = dto.payment_id || booking.paymentId;
      booking.paymentStatusCode = statusCode;
      booking.paymentStatusMessage = dto.status_message || booking.paymentStatusMessage;
      booking.paymentMethodName = dto.method || booking.paymentMethodName;
      booking.paymentGateway = 'payhere';

      if (statusCode === 2) {
        // Guard transition: terminal booking statuses should not be downgraded.
        if (!['cancelled', 'failed', 'completed'].includes(booking.status)) {
          booking.status = 'success';
        }

        booking.paymentStatus = 'paid';
        booking.paymentVerifiedAt = booking.paymentVerifiedAt || new Date();
        booking.capacityReleasedOnFailure = false;

        const userId = booking.user?.toString();
        if (userId) {
          const cart: any = await this.cartRepository.findByUserId(userId, session);
          if (cart && cart.items.length > 0) {
            cart.items = [];
            await this.cartRepository.save(cart, session);
          }
        }
      } else if ([-1, -2, -3].includes(statusCode)) {
        if (booking.status === 'cancelled') {
          booking.paymentStatus = 'cancelled';
        } else if (booking.status !== 'completed') {
          // Ignore stale non-chargeback failures once already paid.
          if (!(booking.paymentStatus === 'paid' && statusCode !== -3)) {
            booking.status = 'failed';
            booking.paymentStatus = 'failed';
            await this.releaseCapacityForBooking(booking, session);
          }
        }
      } else if (booking.paymentStatus !== 'paid') {
        // Keep webhook pending state only when not already finalized as paid.
        booking.paymentStatus = 'pending';
      }

      await this.bookingRepository.save(booking, session);
      await session.commitTransaction();
      session.endSession();

      return { acknowledged: true, processed: true, bookingStatus: booking.status };
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

      if (['success', 'completed', 'failed', 'cancelled'].includes(booking.status)) {
        throw new AppError(400, `Cannot cancel booking with status ${booking.status}`);
      }

      await this.releaseCapacityForBooking(booking, session);

      booking.status = 'cancelled';
      if (booking.paymentMethod === 'online') {
        booking.paymentStatus = 'cancelled';
      }

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
