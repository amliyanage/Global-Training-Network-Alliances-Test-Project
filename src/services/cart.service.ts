import { CartRepository } from '../repositories/cart.repository';
import { ServiceRepository } from '../repositories/service.repository';
import { AppError } from '../utils/errors';
import { AddCartItemDto, UpdateCartItemDto, RemoveCartItemDto } from '../dtos/cart.dto';
import { getUtcDateKey, toUtcDate } from '../utils/date';

export class CartService {
  constructor(
    private cartRepository: CartRepository,
    private serviceRepository: ServiceRepository,
  ) {}

  async getCart(userId: string) {
    let cart = await this.cartRepository.findByUserIdPopulated(userId);
    if (!cart) {
      cart = await this.cartRepository.create({ user: userId, items: [] });
    }
    return cart;
  }

  async addItem(dto: AddCartItemDto) {
    const { userId, serviceId, slotId, bookingDate, quantity } = dto;
    const bookingDateUtc = toUtcDate(bookingDate);

    // Check if service and slot valid
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) throw new AppError(404, 'Service not found');

    const slot = service.slots.find((s: any) => s._id?.toString() === slotId);
    if (!slot) throw new AppError(400, 'Invalid time slot');
    if (getUtcDateKey(new Date(slot.startTime)) !== bookingDate) {
      throw new AppError(400, 'Selected slot is not available on the requested booking date');
    }

    let cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      cart = await this.cartRepository.build({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(
      (i: any) =>
        i.serviceId.toString() === serviceId &&
        i.slotId.toString() === slotId &&
        i.bookingDate &&
        getUtcDateKey(new Date(i.bookingDate)) === bookingDate,
    );

    const existingQuantity = existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
    if (slot.capacity < existingQuantity + quantity) {
      throw new AppError(
        409,
        `Not enough remaining capacity for selected slot. Remaining: ${slot.capacity - existingQuantity}`,
      );
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ serviceId: service._id, slotId, bookingDate: bookingDateUtc, quantity } as any);
    }

    await this.cartRepository.save(cart);
    return cart.populate('items.serviceId');
  }

  async updateItem(dto: UpdateCartItemDto) {
    const { userId, itemId, quantity } = dto;
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) throw new AppError(404, 'Cart not found');

    const item = cart.items.find((i: any) => i._id?.toString() === itemId);
    if (!item) throw new AppError(404, 'Item not found in cart');

    const service = await this.serviceRepository.findById(item.serviceId.toString());
    if (!service) throw new AppError(404, 'Service not found');

    const slot = service.slots.find((s: any) => s._id?.toString() === item.slotId.toString());
    if (!slot) throw new AppError(400, 'Invalid time slot');
    if (slot.capacity < quantity) {
      throw new AppError(
        409,
        `Not enough remaining capacity for selected slot. Remaining: ${slot.capacity}`,
      );
    }

    item.quantity = quantity;
    await this.cartRepository.save(cart);
    return cart.populate('items.serviceId');
  }

  async removeItem(dto: RemoveCartItemDto) {
    const { userId, itemId } = dto;
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) throw new AppError(404, 'Cart not found');

    cart.items = cart.items.filter((i: any) => i._id?.toString() !== itemId);
    await this.cartRepository.save(cart);
    return cart.populate('items.serviceId');
  }
}
