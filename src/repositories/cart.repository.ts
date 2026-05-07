import mongoose from 'mongoose';
import Cart from '../models/Cart';

interface CreateCartInput {
  user: string;
  items: Array<{
    serviceId: string | mongoose.Types.ObjectId;
    slotId: string;
    bookingDate?: Date;
    quantity: number;
    expiresAt: Date;
  }>;
}

export class CartRepository {
  async findByUserId(userId: string, session?: mongoose.ClientSession) {
    const query = Cart.findOne({ user: userId });
    if (session) {
      query.session(session);
    }

    return query;
  }

  async findById(cartId: string, session?: mongoose.ClientSession) {
    const query = Cart.findById(cartId);
    if (session) {
      query.session(session);
    }

    return query;
  }

  async findByUserIdPopulated(userId: string, session?: mongoose.ClientSession) {
    const query = Cart.findOne({ user: userId }).populate('items.serviceId');
    if (session) {
      query.session(session);
    }

    return query;
  }

  async findWithExpiredItems(now: Date, limit = 100) {
    return Cart.find({
      'items.expiresAt': { $lte: now },
      items: { $exists: true, $ne: [] },
    })
      .select('_id')
      .limit(limit)
      .lean();
  }

  async create(data: CreateCartInput, session?: mongoose.ClientSession) {
    if (session) {
      const docs = await Cart.create([data], { session });
      return docs[0];
    }

    return Cart.create(data);
  }

  async build(data: CreateCartInput) {
    return new Cart(data);
  }

  async save(cart: any, session?: mongoose.ClientSession) {
    if (session) return cart.save({ session });
    return cart.save();
  }
}
