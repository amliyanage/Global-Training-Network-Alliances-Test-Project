import mongoose from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';

export class CartExpiryService {
  constructor(
    private cartRepository: CartRepository,
    private serviceRepository: ServiceRepository,
  ) {}

  getExpiryDate(from: Date = new Date()): Date {
    return new Date(from.getTime() + env.CART_ITEM_EXPIRY_MINUTES * 60 * 1000);
  }

  async cleanupExpiredItemsForUser(userId: string, session?: mongoose.ClientSession) {
    const now = new Date();
    const cart = await this.cartRepository.findByUserId(userId, session);
    if (!cart || cart.items.length === 0) {
      return { removedItems: 0 };
    }

    return this.cleanupExpiredItemsFromCartDocument(cart, now, session);
  }

  async cleanupExpiredItemsBatch(limit = 100) {
    const now = new Date();
    const carts = await this.cartRepository.findWithExpiredItems(now, limit);

    let cleanedCartCount = 0;
    let removedItems = 0;

    for (const cartRef of carts) {
      const result = await this.cleanupExpiredItemsForCartId(cartRef._id.toString(), now);
      if (result.removedItems > 0) {
        cleanedCartCount += 1;
        removedItems += result.removedItems;
      }
    }

    return {
      scanned: carts.length,
      cleanedCartCount,
      removedItems,
    };
  }

  private async cleanupExpiredItemsForCartId(cartId: string, now: Date) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await this.cartRepository.findById(cartId, session);
      if (!cart || cart.items.length === 0) {
        await session.commitTransaction();
        session.endSession();
        return { removedItems: 0 };
      }

      const result = await this.cleanupExpiredItemsFromCartDocument(cart, now, session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      logger.warn(
        {
          cartId,
          err: error,
        },
        'Failed to clean expired cart items for cart',
      );

      return { removedItems: 0 };
    }
  }

  private async cleanupExpiredItemsFromCartDocument(
    cart: any,
    now: Date,
    session?: mongoose.ClientSession,
  ) {
    const expiredItems = cart.items.filter((item: any) => new Date(item.expiresAt).getTime() <= now.getTime());
    if (expiredItems.length === 0) {
      return { removedItems: 0 };
    }

    for (const item of expiredItems) {
      const serviceId = item.serviceId?._id?.toString() || item.serviceId?.toString();
      if (!serviceId) continue;

      await this.serviceRepository.incrementCapacity(serviceId, item.slotId, item.quantity, session);
    }

    cart.items = cart.items.filter((item: any) => new Date(item.expiresAt).getTime() > now.getTime());
    await this.cartRepository.save(cart, session);

    logger.info(
      {
        cartId: cart._id?.toString(),
        userId: cart.user?.toString(),
        removedItems: expiredItems.length,
      },
      'Expired cart items released and removed',
    );

    return { removedItems: expiredItems.length };
  }
}
