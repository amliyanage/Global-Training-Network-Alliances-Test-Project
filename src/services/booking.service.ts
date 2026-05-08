import mongoose from 'mongoose';
import { BookingRepository } from '../repositories/booking.repository';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError } from '../utils/errors';
import { CheckoutDto, BookingActionDto, PayHereNotifyDto } from '../dtos/booking.dto';
import { getUtcDateKey } from '../utils/date';
import { PayHereService } from './payhere.service';
import { env } from '../config/env';
import {
  BOOKING_ERROR_CODES,
  BOOKING_STATUS_TRANSITIONS,
  NON_DAILY_LIMIT_STATUSES,
} from '../constants/booking.constants';
import { BookingStatus } from '../types/booking.types';
import { BookingStatusAuditRepository } from '../repositories/booking-status-audit.repository';
import { CartExpiryService } from './cart-expiry.service';
import { CART_ERROR_CODES } from '../constants/cart.constants';

export class BookingService {
  constructor(
    private bookingRepository: BookingRepository,
    private cartRepository: CartRepository,
    private serviceRepository: ServiceRepository,
    private payHereService: PayHereService,
    private bookingStatusAuditRepository: BookingStatusAuditRepository,
    private cartExpiryService: CartExpiryService,
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
      const serviceId = item.serviceId?._id?.toString() || item.serviceId?.toString();
      if (!serviceId) continue;
      await this.serviceRepository.incrementCapacity(serviceId, item.slotId, item.quantity, session);
    }

    booking.capacityReleasedOnFailure = true;
  }

  private formatAmount(amount: number): string {
    return Number(amount).toFixed(2);
  }

  private generatePaymentOrderId(bookingId: string): string {
    return `ORD_${Date.now()}_${bookingId}`;
  }

  private assertValidStatusTransition(currentStatus: BookingStatus, nextStatus: BookingStatus) {
    if (currentStatus === nextStatus) {
      return;
    }

    const allowedStatuses = BOOKING_STATUS_TRANSITIONS[currentStatus] || [];
    if (allowedStatuses.includes(nextStatus)) {
      return;
    }

    throw new AppError(
      409,
      `Invalid booking status transition: ${currentStatus} -> ${nextStatus}`,
      BOOKING_ERROR_CODES.INVALID_STATUS_TRANSITION,
    );
  }

  private async transitionStatus(
    booking: any,
    newStatus: BookingStatus,
    session: mongoose.ClientSession,
    reason?: string,
  ) {
    const previousStatus = booking.status as BookingStatus;
    if (previousStatus === newStatus) return;

    this.assertValidStatusTransition(previousStatus, newStatus);

    booking.status = newStatus;

    await this.bookingStatusAuditRepository.create(
      {
        bookingId: booking._id.toString(),
        userId: booking.user.toString(),
        previousStatus,
        newStatus,
        reason,
      },
      session,
    );
  }

  private async createInitialStatusAudit(booking: any, session: mongoose.ClientSession, reason: string) {
    await this.bookingStatusAuditRepository.create(
      {
        bookingId: booking._id.toString(),
        userId: booking.user.toString(),
        previousStatus: null,
        newStatus: booking.status,
        reason,
      },
      session,
    );
  }

  private normalizeDayRange(date: Date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
  }

  private async enforceDailyBookingLimit(
    userId: string,
    bookingDateKeys: Set<string>,
    session: mongoose.ClientSession,
  ) {
    for (const dateKey of bookingDateKeys) {
      const date = new Date(`${dateKey}T00:00:00.000Z`);
      const { start, end } = this.normalizeDayRange(date);

      const existingCount = await this.bookingRepository.countByUserAndBookingDate(
        userId,
        start,
        end,
        NON_DAILY_LIMIT_STATUSES,
        session,
      );

      if (existingCount >= env.MAX_BOOKINGS_PER_DAY) {
        throw new AppError(
          409,
          `Daily booking limit reached for ${dateKey}. Maximum allowed is ${env.MAX_BOOKINGS_PER_DAY} bookings per day.`,
          BOOKING_ERROR_CODES.DAILY_LIMIT_REACHED,
        );
      }
    }
  }

  async checkout(dto: CheckoutDto) {
    const { userId, paymentMethod } = dto;
    if (paymentMethod === 'online') {
      this.payHereService.ensureConfigured();
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await this.cartExpiryService.cleanupExpiredItemsForUser(userId, session);

      const cart: any = await this.cartRepository.findByUserIdPopulated(userId, session);
      if (!cart || cart.items.length === 0) {
        throw new AppError(400, 'Cart is empty', CART_ERROR_CODES.EMPTY);
      }

      const bookingDateKeys = new Set<string>();
      let totalAmount = 0;
      const bookingItems = [];
      const serviceTitles: string[] = [];

      for (const item of cart.items) {
        const serviceId = item.serviceId as any;
        const service: any = await this.serviceRepository.findById(serviceId._id, session);
        if (!service) throw new AppError(404, `Service not found: ${serviceId._id}`, 'NOT_FOUND');

        const slot = service.slots.find((candidate: any) => candidate._id?.toString() === item.slotId);
        if (!slot) throw new AppError(404, `Slot not found in service: ${service.title}`, 'NOT_FOUND');

        const bookingDate = item.bookingDate ? new Date(item.bookingDate) : new Date(slot.startTime);
        const cartItemDate = getUtcDateKey(bookingDate);
        const slotDate = getUtcDateKey(new Date(slot.startTime));

        if (cartItemDate !== slotDate) {
          throw new AppError(
            409,
            `Selected slot date changed for ${service.title}. Please refresh cart.`,
            'SLOT_DATE_CHANGED',
          );
        }

        bookingDateKeys.add(cartItemDate);

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

      await this.enforceDailyBookingLimit(userId, bookingDateKeys, session);

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
      await this.createInitialStatusAudit(booking, session, 'Booking created from checkout');

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
      throw new AppError(400, 'Invalid PayHere notification status code', 'PAYHERE_STATUS_CODE_INVALID');
    }

    const normalizedNotifyAmount = this.payHereService.normalizeAmount(dto.payhere_amount);
    if (!normalizedNotifyAmount) {
      throw new AppError(400, 'Invalid PayHere notification amount', 'PAYHERE_AMOUNT_INVALID');
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
        if (!['cancelled', 'failed', 'completed'].includes(booking.status)) {
          await this.transitionStatus(
            booking,
            'confirmed',
            session,
            'PayHere payment completed successfully',
          );
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
          if (!(booking.paymentStatus === 'paid' && statusCode !== -3)) {
            await this.transitionStatus(booking, 'failed', session, 'PayHere payment failed or cancelled');
            booking.paymentStatus = 'failed';
            await this.releaseCapacityForBooking(booking, session);
          }
        }
      } else if (booking.paymentStatus !== 'paid') {
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
    if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');
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
      if (!booking) throw new AppError(404, 'Booking not found', 'NOT_FOUND');

      await this.transitionStatus(booking, 'cancelled', session, 'Cancelled by user request');
      await this.releaseCapacityForBooking(booking, session);

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
