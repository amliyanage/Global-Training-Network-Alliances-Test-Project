import mongoose from 'mongoose';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError } from '../utils/errors';
import { AddCartItemDto, UpdateCartItemDto, RemoveCartItemDto } from '../dtos/cart.dto';
import { getUtcDateKey, toUtcDate } from '../utils/date';
import { CartExpiryService } from './cart-expiry.service';
import { CART_ERROR_CODES } from '../constants/cart.constants';

export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private serviceRepository: ServiceRepository,
    private cartExpiryService: CartExpiryService,
  ) {}

  private async withTransaction<T>(callback: (session: mongoose.ClientSession) => Promise<T>) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  private async reserveCapacity(
    serviceId: string,
    slotId: string,
    quantity: number,
    session: mongoose.ClientSession,
  ) {
    const updated = await this.serviceRepository.decrementCapacity(serviceId, slotId, quantity, session);
    if (updated) return updated;

    const service = await this.serviceRepository.findById(serviceId, session);
    const slot = service?.slots.find((candidate: any) => candidate._id?.toString() === slotId);
    const remaining = slot ? slot.capacity : 0;

    throw new AppError(
      409,
      `Not enough remaining capacity for selected slot. Remaining: ${remaining}`,
      CART_ERROR_CODES.CAPACITY_ERROR,
    );
  }

  async getCart(userId: string) {
    await this.withTransaction(async (session) => {
      await this.cartExpiryService.cleanupExpiredItemsForUser(userId, session);
      const cart = await this.cartRepository.findByUserId(userId, session);
      if (!cart) {
        await this.cartRepository.create({ user: userId, items: [] }, session);
      }
    });

    const cart = await this.cartRepository.findByUserIdPopulated(userId);
    if (!cart) {
      throw new AppError(500, 'Failed to initialize cart', 'CART_INIT_FAILED');
    }

    return cart;
  }

  async addItem(dto: AddCartItemDto) {
    const { userId, serviceId, slotId, bookingDate, quantity } = dto;
    const bookingDateUtc = toUtcDate(bookingDate);

    await this.withTransaction(async (session) => {
      await this.cartExpiryService.cleanupExpiredItemsForUser(userId, session);

      const service = await this.serviceRepository.findById(serviceId, session);
      if (!service) throw new AppError(404, 'Service not found', 'NOT_FOUND');

      const slot = service.slots.find((candidate: any) => candidate._id?.toString() === slotId);
      if (!slot) throw new AppError(400, 'Invalid time slot', 'INVALID_SLOT');

      if (getUtcDateKey(new Date(slot.startTime)) !== bookingDate) {
        throw new AppError(
          400,
          'Selected slot is not available on the requested booking date',
          'SLOT_DATE_MISMATCH',
        );
      }

      let cart = await this.cartRepository.findByUserId(userId, session);
      if (!cart) {
        cart = await this.cartRepository.create({ user: userId, items: [] }, session);
      }

      const existingItemIndex = cart.items.findIndex(
        (item: any) =>
          item.serviceId.toString() === serviceId &&
          item.slotId.toString() === slotId &&
          item.bookingDate &&
          getUtcDateKey(new Date(item.bookingDate)) === bookingDate,
      );

      await this.reserveCapacity(serviceId, slotId, quantity, session);

      if (existingItemIndex > -1) {
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].expiresAt = this.cartExpiryService.getExpiryDate();
      } else {
        cart.items.push({
          serviceId: service._id,
          slotId,
          bookingDate: bookingDateUtc,
          quantity,
          expiresAt: this.cartExpiryService.getExpiryDate(),
        } as any);
      }

      await this.cartRepository.save(cart, session);
    });

    const cart = await this.cartRepository.findByUserIdPopulated(userId);
    if (!cart) {
      throw new AppError(500, 'Cart was not found after update', 'CART_NOT_FOUND');
    }

    return cart;
  }

  async updateItem(dto: UpdateCartItemDto) {
    const { userId, itemId, quantity } = dto;

    await this.withTransaction(async (session) => {
      await this.cartExpiryService.cleanupExpiredItemsForUser(userId, session);

      const cart = await this.cartRepository.findByUserId(userId, session);
      if (!cart) throw new AppError(404, 'Cart not found', 'NOT_FOUND');

      const item = cart.items.find((candidate: any) => candidate._id?.toString() === itemId);
      if (!item) throw new AppError(404, 'Item not found in cart', 'NOT_FOUND');

      const serviceId = item.serviceId.toString();
      const slotId = item.slotId.toString();

      const quantityDiff = quantity - item.quantity;
      if (quantityDiff > 0) {
        await this.reserveCapacity(serviceId, slotId, quantityDiff, session);
      } else if (quantityDiff < 0) {
        await this.serviceRepository.incrementCapacity(serviceId, slotId, Math.abs(quantityDiff), session);
      }

      item.quantity = quantity;
      item.expiresAt = this.cartExpiryService.getExpiryDate();

      await this.cartRepository.save(cart, session);
    });

    const cart = await this.cartRepository.findByUserIdPopulated(userId);
    if (!cart) {
      throw new AppError(500, 'Cart was not found after update', 'CART_NOT_FOUND');
    }

    return cart;
  }

  async removeItem(dto: RemoveCartItemDto) {
    const { userId, itemId } = dto;

    await this.withTransaction(async (session) => {
      await this.cartExpiryService.cleanupExpiredItemsForUser(userId, session);

      const cart = await this.cartRepository.findByUserId(userId, session);
      if (!cart) throw new AppError(404, 'Cart not found', 'NOT_FOUND');

      const item = cart.items.find((candidate: any) => candidate._id?.toString() === itemId);
      if (!item) throw new AppError(404, 'Item not found in cart', 'NOT_FOUND');

      await this.serviceRepository.incrementCapacity(
        item.serviceId.toString(),
        item.slotId.toString(),
        item.quantity,
        session,
      );

      cart.items = cart.items.filter((candidate: any) => candidate._id?.toString() !== itemId);

      await this.cartRepository.save(cart, session);
    });

    const cart = await this.cartRepository.findByUserIdPopulated(userId);
    if (!cart) {
      throw new AppError(500, 'Cart was not found after update', 'CART_NOT_FOUND');
    }

    return cart;
  }
}
